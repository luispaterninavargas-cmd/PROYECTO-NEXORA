import axios from 'axios';
import RecommendationRepository from '../repositories/RecommendationRepository.js';

const ACTION_WEIGHTS = {
  view: 0.5,
  search: 1.5,
  favorite: 3,
  cart: 4,
  purchase: 6
};

const DAY_MS = 24 * 60 * 60 * 1000;
const VIEW_EXCLUSION_MS = 7 * DAY_MS;
const PURCHASE_EXCLUSION_MS = 30 * DAY_MS;
const PRODUCT_CACHE_MS = 15 * 1000;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function words(value) {
  return normalizeText(value).match(/[\p{L}\p{N}]{2,}/gu) || [];
}

class RecommendationService {
  constructor() {
    this.repository = new RecommendationRepository();
    this.productsCache = null;
    this.productsCacheExpiresAt = 0;
    this.productsRequest = null;
  }

  productServiceUrl() {
    return (process.env.PRODUCTS_SERVICE || 'http://localhost:5101').replace(/\/+$/, '');
  }

  async getProducts(authorization) {
    if (this.productsCache && Date.now() < this.productsCacheExpiresAt) {
      return this.productsCache;
    }
    if (this.productsRequest) return this.productsRequest;

    this.productsRequest = (async () => {
      try {
        const response = await axios.get(`${this.productServiceUrl()}/api/productos`, {
          headers: authorization ? { Authorization: authorization } : undefined,
          timeout: 2500
        });
        const products = Array.isArray(response.data) ? response.data : response.data?.productos;
        if (Array.isArray(products) && products.length) {
          this.productsCache = products;
        } else {
          throw new Error('El catálogo de productos devolvió una lista vacía o inválida.');
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'development') throw error;
        console.warn('No fue posible consultar el catálogo; se usará catálogo de respaldo de desarrollo:', error.message);
        this.productsCache = await this.repository.getAllProducts();
      } finally {
        this.productsRequest = null;
      }

      this.productsCacheExpiresAt = Date.now() + PRODUCT_CACHE_MS;
      return this.productsCache;
    })();

    return this.productsRequest;
  }

  async getProductById(productId, authorization) {
    try {
      const response = await axios.get(
        `${this.productServiceUrl()}/api/productos/${encodeURIComponent(productId)}`,
        {
          headers: authorization ? { Authorization: authorization } : undefined,
          timeout: 2500
        }
      );
      return response.data;
    } catch {
      const products = await this.getProducts(authorization);
      return products.find((product) => String(product._id || product.id) === String(productId)) || null;
    }
  }

  getCategory(product) {
    return String(product?.categoria || product?.category || 'Sin categoría').trim();
  }

  getProductId(product) {
    return String(product?._id || product?.id || '');
  }

  recencyFactor(timestamp) {
    const date = new Date(timestamp || Date.now());
    if (Number.isNaN(date.getTime())) return 0.35;
    const ageDays = Math.max(0, (Date.now() - date.getTime()) / DAY_MS);
    return Math.max(0.25, Math.exp(-ageDays / 30));
  }

  buildProfile(actions = []) {
    const categoryScores = {};
    const productInteractions = {};
    const now = Date.now();
    const recentViewedProductIds = new Set();
    const recentPurchaseProductIds = new Set();
    const interactionProducts = [];
    const recentSearches = [];
    const metrics = { impressions: 0, clicks: 0 };

    for (const action of actions) {
      const age = now - new Date(action.timestamp || now).getTime();
      if (action.type === 'recommendation_impression' && age <= PURCHASE_EXCLUSION_MS) {
        metrics.impressions += 1;
      }
      if (action.type === 'recommendation_click' && age <= PURCHASE_EXCLUSION_MS) {
        metrics.clicks += 1;
      }
      if (action.type === 'view' && action.productId && age <= VIEW_EXCLUSION_MS) {
        recentViewedProductIds.add(String(action.productId));
      }
      if (action.type === 'purchase' && action.productId && age <= PURCHASE_EXCLUSION_MS) {
        recentPurchaseProductIds.add(String(action.productId));
      }
      if (action.type === 'search' && action.productName && age <= PURCHASE_EXCLUSION_MS) {
        recentSearches.push(action);
      }

      const weight = ACTION_WEIGHTS[action.type] || 0;
      if (!weight) continue;

      const recency = this.recencyFactor(action.timestamp);
      const contribution = weight * recency;
      const category = String(action.category || '').trim();
      if (category) {
        categoryScores[category] = (categoryScores[category] || 0) + contribution;
      }

      const productId = String(action.productId || '').trim();
      if (productId) {
        productInteractions[productId] = (productInteractions[productId] || 0) + contribution;
        if (['favorite', 'cart', 'purchase'].includes(action.type)) {
          interactionProducts.push({ ...action, contribution });
        }
      }
    }

    return {
      categoryScores,
      productInteractions,
      recentViewedProductIds,
      recentPurchaseProductIds,
      interactionProducts,
      recentSearches,
      metrics: {
        ...metrics,
        clickThroughRate: metrics.impressions
          ? Number((metrics.clicks / metrics.impressions).toFixed(3))
          : 0
      },
      topCategories: Object.entries(categoryScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category, score]) => ({ category, score: Number(score.toFixed(2)) }))
    };
  }

  buildReasons(profile, product) {
    const category = this.getCategory(product);
    const reasons = [];
    const categoryScore = profile.categoryScores[category] || 0;
    const similarity = this.productSimilarity(profile, product);
    const searchInterest = this.searchMatch(profile, product);

    if (categoryScore >= 4) {
      reasons.push(`Has mostrado bastante interés en ${category}`);
    } else if (categoryScore > 0) {
      reasons.push(`Has interactuado con productos de ${category}`);
    }

    if (similarity > 0) {
      reasons.push('Se parece a productos que has marcado, agregado o comprado');
    }

    if (searchInterest > 0) {
      reasons.push('Coincide con búsquedas recientes');
    }

    const recentPurchase = profile.actions
      .filter((action) => action.type === 'purchase'
        && action.category === category
        && Date.now() - new Date(action.timestamp).getTime() <= PURCHASE_EXCLUSION_MS)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    if (recentPurchase) {
      reasons.push(`Compraste recientemente un producto de ${category}`);
    }

    if (!reasons.length) {
      reasons.push('Coincide con categorías disponibles en NEXORA');
    }

    return reasons.slice(0, 3);
  }

  buildScoreBreakdown(profile, product, maxCategoryScore, score) {
    const category = this.getCategory(product);
    const categoryScore = profile.categoryScores[category] || 0;
    const stock = Number(product.stock ?? 0);
    const categoryInterest = maxCategoryScore > 0
      ? Math.min(1, categoryScore / maxCategoryScore)
      : 0;
    const productSimilarity = this.productSimilarity(profile, product);
    const searchInterest = this.searchMatch(profile, product);
    const availability = Math.min(1, stock / 20) * 0.05;
    const categoryActions = profile.actions.filter((action) => action.category === category);
    const recency = categoryActions.length
      ? Math.max(...categoryActions.map((action) => this.recencyFactor(action.timestamp)))
      : 0;
    const reliability = Math.min(1, 0.35 + categoryInterest * 0.3 + productSimilarity * 0.2 + searchInterest * 0.15);

    return {
      categoryInterest: Number(categoryInterest.toFixed(3)),
      productSimilarity: Number(productSimilarity.toFixed(3)),
      searchInterest: Number(searchInterest.toFixed(3)),
      availability: Number(availability.toFixed(3)),
      recency: Number(recency.toFixed(3)),
      final: Number(score.toFixed(3)),
      reliability: Number(reliability.toFixed(3))
    };
  }

  buildExplanation(profile, product, scoreBreakdown) {
    const category = this.getCategory(product);
    const categoryScore = profile.categoryScores[category] || 0;
    const evidence = [];

    if (categoryScore > 0) {
      evidence.push({
        factor: 'categoryInterest',
        label: `Interés detectado en ${category}`,
        value: categoryScore,
        contribution: scoreBreakdown.categoryInterest
      });
    }

    if (scoreBreakdown.productSimilarity > 0) {
      evidence.push({
        factor: 'productSimilarity',
        label: 'Marca, precio o descripción similares a productos de interés',
        value: scoreBreakdown.productSimilarity,
        contribution: scoreBreakdown.productSimilarity
      });
    }

    if (scoreBreakdown.searchInterest > 0) {
      evidence.push({
        factor: 'searchInterest',
        label: 'Coincide con búsquedas recientes',
        value: scoreBreakdown.searchInterest,
        contribution: scoreBreakdown.searchInterest
      });
    }

    if (Number(product.stock ?? 0) > 0) {
      evidence.push({
        factor: 'availability',
        label: `${Number(product.stock ?? 0)} unidades disponibles`,
        value: Number(product.stock ?? 0),
        contribution: scoreBreakdown.availability
      });
    } else {
      evidence.push({
        factor: 'availability',
        label: 'Producto agotado',
        value: 0,
        contribution: 0
      });
    }

    const confidence = Math.min(1, Number((0.35 + scoreBreakdown.categoryInterest * 0.3 + scoreBreakdown.productSimilarity * 0.2 + scoreBreakdown.searchInterest * 0.15 + scoreBreakdown.availability * 0.1).toFixed(3)));

    return {
      summary: `Se recomienda ${product.nombre || product.name || 'este producto'} por ${evidence.map((item) => item.label.toLowerCase()).join(', ')}.`,
      evidence,
      confidence,
      method: 'weighted-behavior',
      generatedAt: new Date().toISOString()
    };
  }

  async registerBehavior(userId, actions = []) {
    const profile = await this.repository.registerBehavior(userId, actions);
    return this.buildProfile(profile.actions || []);
  }

  async getRecommendationsForUser(userId, authorization, { cartProductIds = [] } = {}) {
    const storedProfile = await this.repository.getUserProfile(userId);
    const actions = storedProfile.actions || [];
    const profile = {
      ...this.buildProfile(actions),
      actions
    };
    const products = await this.getProducts(authorization);
    const activeCartProductIds = new Set(cartProductIds.map((productId) => String(productId)));

    const maxCategoryScore = Math.max(...Object.values(profile.categoryScores), 1);

    const rankedRecommendations = products
      .filter((product) => Number(product.stock ?? 1) > 0)
      .filter((product) => !profile.recentPurchaseProductIds.has(this.getProductId(product)))
      .filter((product) => !profile.recentViewedProductIds.has(this.getProductId(product)))
      .filter((product) => !activeCartProductIds.has(this.getProductId(product)))
      .map((product) => {
        const productId = this.getProductId(product);
        const category = this.getCategory(product);
        const categoryScore = profile.categoryScores[category] || 0;
        const categoryMatch = categoryScore / maxCategoryScore;
        const interactionMatch = this.productSimilarity(profile, product);
        const searchMatch = this.searchMatch(profile, product);
        const stockBonus = Math.min(Number(product.stock || 0) / 20, 1) * 0.05;
        const rawScore = 0.02 + categoryMatch * 0.5 + interactionMatch * 0.25 + searchMatch * 0.2 + stockBonus;
        const score = Math.min(1, rawScore);
        const scoreBreakdown = this.buildScoreBreakdown(
          { ...profile, actions: storedProfile.actions || [] },
          product,
          maxCategoryScore,
          score
        );
        const explanation = this.buildExplanation(
          { ...profile, actions: storedProfile.actions || [] },
          product,
          scoreBreakdown
        );

        return {
          productId,
          nombre: product.nombre || product.name,
          categoria: category,
          precio: Number(product.precio ?? product.price ?? 0),
          imagen: product.imagen || product.image || '',
          score: Number(score.toFixed(3)),
          scoreBreakdown,
          reason: this.buildReasons({ ...profile, actions: storedProfile.actions || [] }, product),
          explanation,
          source: profile.categoryScores[category]
            || profile.interactionProducts.length
            || profile.recentSearches.length
            ? 'user-behavior'
            : 'catalog-discovery'
        };
      })
      .sort((a, b) => b.score - a.score);
    const recommendations = this.selectDiverse(rankedRecommendations, 6);

    return {
      userId: String(userId),
      profile: {
        topCategories: profile.topCategories,
        interactions: actions.filter((action) => ACTION_WEIGHTS[action.type]).length,
        metrics: profile.metrics
      },
      recommendations
    };
  }

  productSimilarity(profile, product) {
    const brand = normalizeText(product.marca || product.brand);
    const description = new Set(words(`${product.nombre || product.name || ''} ${product.descripcion || product.description || ''}`));
    const price = Number(product.precio ?? product.price);
    let bestMatch = 0;

    for (const interaction of profile.interactionProducts) {
      const interactionBrand = normalizeText(interaction.brand);
      const interactionDescription = new Set(words(`${interaction.productName || ''} ${interaction.description || ''}`));
      const interactionPrice = Number(interaction.price);
      let similarity = 0;

      if (brand && interactionBrand && brand === interactionBrand) similarity += 0.6;
      if (Number.isFinite(price) && price > 0 && Number.isFinite(interactionPrice) && interactionPrice > 0) {
        const priceDistance = Math.abs(Math.log(price / interactionPrice)) / Math.log(3);
        similarity += 0.25 * Math.max(0, 1 - priceDistance);
      }
      if (description.size && interactionDescription.size) {
        const overlap = [...description].filter((word) => interactionDescription.has(word)).length;
        const union = new Set([...description, ...interactionDescription]).size;
        similarity += 0.15 * (union ? overlap / union : 0);
      }

      const importance = Math.min(1, interaction.contribution / 6);
      bestMatch = Math.max(bestMatch, similarity * importance);
    }

    return Math.min(1, bestMatch);
  }

  searchMatch(profile, product) {
    const productWords = new Set(words([
      product.nombre || product.name,
      product.descripcion || product.description,
      product.marca || product.brand,
      this.getCategory(product)
    ].join(' ')));
    let bestMatch = 0;

    for (const action of profile.recentSearches) {
      const queryWords = [...new Set(words(action.productName))];
      if (!queryWords.length) continue;
      const matchedWords = queryWords.filter((word) => productWords.has(word)).length;
      const match = matchedWords / queryWords.length * this.recencyFactor(action.timestamp);
      bestMatch = Math.max(bestMatch, match);
    }

    return Math.min(1, bestMatch);
  }

  selectDiverse(recommendations, limit) {
    const selected = [];
    const categoryCounts = new Map();
    const selectedIds = new Set();

    for (const recommendation of recommendations) {
      if (selected.length >= limit) break;
      const categoryCount = categoryCounts.get(recommendation.categoria) || 0;
      if (categoryCount >= 2) continue;
      selected.push(recommendation);
      selectedIds.add(recommendation.productId);
      categoryCounts.set(recommendation.categoria, categoryCount + 1);
    }

    for (const recommendation of recommendations) {
      if (selected.length >= limit) break;
      if (selectedIds.has(recommendation.productId)) continue;
      selected.push(recommendation);
    }

    return selected;
  }

  async getRecommendationsForProduct(productId, authorization) {
    const product = await this.getProductById(productId, authorization);
    const products = await this.getProducts(authorization);
    if (!product) return { productId, recommendations: [] };

    const category = this.getCategory(product);
    const profile = {
      actions: [],
      categoryScores: { [category]: 1 },
      interactionProducts: [{
        productName: product.nombre || product.name || '',
        brand: product.marca || product.brand || '',
        description: product.descripcion || product.description || '',
        price: Number(product.precio ?? product.price),
        contribution: 6
      }],
      recentSearches: []
    };
    const maxCategoryScore = 1;
    const rankedRecommendations = products
      .filter((item) => this.getProductId(item) !== this.getProductId(product))
      .filter((item) => Number(item.stock ?? 1) > 0)
      .map((item) => {
        const categoryMatch = this.getCategory(item) === category ? 1 : 0;
        const productSimilarity = this.productSimilarity(profile, item);
        return {
          item,
          categoryMatch,
          productSimilarity,
          score: 0.02
            + categoryMatch * 0.5
            + productSimilarity * 0.25
            + Math.min(Number(item.stock || 0) / 20, 1) * 0.05
        };
      })
      .filter(({ categoryMatch, productSimilarity }) => categoryMatch > 0 || productSimilarity > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item, score }) => {
        const scoreBreakdown = this.buildScoreBreakdown(profile, item, maxCategoryScore, score);
        return {
          productId: this.getProductId(item),
          nombre: item.nombre || item.name,
          categoria: this.getCategory(item),
          precio: Number(item.precio ?? item.price ?? 0),
          score: Number(score.toFixed(3)),
          scoreBreakdown,
          reason: this.buildReasons(profile, item),
          explanation: this.buildExplanation(profile, item, scoreBreakdown),
          source: 'product-similarity'
        };
      });

    return {
      productId: this.getProductId(product),
      recommendations: this.selectDiverse(rankedRecommendations, 6)
    };
  }
}

export default RecommendationService;
