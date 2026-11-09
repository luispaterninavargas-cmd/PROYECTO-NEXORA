import test from 'node:test';
import assert from 'node:assert/strict';

import RecommendationService from '../src/services/RecommendationService.js';

test('returns transparent evidence for every recommendation', async () => {
  const service = new RecommendationService();
  const storedProfile = {
    userId: 'user-1',
    actions: [
      {
        type: 'view',
        productId: 'p1',
        category: 'Tecnología',
        timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000
      },
      {
        type: 'favorite',
        productId: 'p2',
        category: 'Tecnología',
        timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000
      }
    ]
  };

  service.repository.getUserProfile = async () => storedProfile;
  service.getProducts = async () => [
    {
      _id: 'p1',
      nombre: 'Laptop Gamer Lenovo',
      categoria: 'Tecnología',
      precio: 1400,
      stock: 12,
      imagen: ''
    },
    {
      _id: 'p2',
      nombre: 'Audífonos Bluetooth',
      categoria: 'Tecnología',
      precio: 180,
      stock: 35,
      imagen: ''
    }
  ];

  const result = await service.getRecommendationsForUser('user-1');
  const recommendation = result.recommendations[0];

  assert.ok(recommendation.explanation);
  assert.equal(recommendation.explanation.method, 'weighted-behavior');
  assert.ok(recommendation.explanation.confidence >= 0 && recommendation.explanation.confidence <= 1);
  assert.ok(Array.isArray(recommendation.explanation.evidence));
  assert.ok(recommendation.explanation.evidence.length > 0);
  assert.ok(recommendation.scoreBreakdown);
  assert.ok(recommendation.scoreBreakdown.categoryInterest >= 0);
  assert.ok(recommendation.scoreBreakdown.availability >= 0);
  assert.equal(recommendation.source, 'user-behavior');
});

test('excludes recently viewed, recently purchased, and active-cart products only', async () => {
  const service = new RecommendationService();
  const recent = (daysAgo) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  service.repository.getUserProfile = async () => ({
    actions: [
      { type: 'view', productId: 'viewed', category: 'Tecnología', timestamp: recent(1) },
      { type: 'purchase', productId: 'recent-purchase', category: 'Tecnología', timestamp: recent(2) },
      { type: 'purchase', productId: 'old-purchase', category: 'Tecnología', timestamp: recent(31) }
    ]
  });
  service.getProducts = async () => [
    { _id: 'viewed', nombre: 'Visto', categoria: 'Tecnología', stock: 5 },
    { _id: 'recent-purchase', nombre: 'Compra reciente', categoria: 'Tecnología', stock: 5 },
    { _id: 'old-purchase', nombre: 'Compra antigua', categoria: 'Tecnología', stock: 5 },
    { _id: 'in-cart', nombre: 'En carrito', categoria: 'Tecnología', stock: 5 },
    { _id: 'available', nombre: 'Disponible', categoria: 'Tecnología', stock: 5 }
  ];

  const result = await service.getRecommendationsForUser('user-1', undefined, {
    cartProductIds: ['in-cart']
  });
  const productIds = result.recommendations.map(({ productId }) => productId);

  assert.ok(!productIds.includes('viewed'));
  assert.ok(!productIds.includes('recent-purchase'));
  assert.ok(!productIds.includes('in-cart'));
  assert.ok(productIds.includes('old-purchase'));
  assert.ok(productIds.includes('available'));
});

test('uses search terms and product attributes to rank related products', async () => {
  const service = new RecommendationService();
  service.repository.getUserProfile = async () => ({
    actions: [
      {
        type: 'favorite',
        productId: 'favorite',
        productName: 'Mouse inalámbrico',
        category: 'Tecnología',
        brand: 'Acme',
        description: 'Mouse ergonómico inalámbrico',
        price: 100,
        timestamp: new Date()
      },
      {
        type: 'search',
        productName: 'auriculares bluetooth',
        timestamp: new Date()
      }
    ]
  });
  service.getProducts = async () => [
    {
      _id: 'related-brand',
      nombre: 'Mouse Pro',
      categoria: 'Accesorios',
      marca: 'Acme',
      descripcion: 'Mouse ergonómico',
      precio: 105,
      stock: 10
    },
    {
      _id: 'related-search',
      nombre: 'Auriculares Bluetooth',
      categoria: 'Audio',
      marca: 'Sound',
      descripcion: 'Auriculares inalámbricos',
      precio: 250,
      stock: 10
    },
    {
      _id: 'unrelated',
      nombre: 'Camiseta',
      categoria: 'Ropa',
      marca: 'Moda',
      descripcion: 'Prenda de algodón',
      precio: 30,
      stock: 10
    }
  ];

  const result = await service.getRecommendationsForUser('user-1');
  const byId = new Map(result.recommendations.map((item) => [item.productId, item]));

  assert.ok(byId.get('related-brand').scoreBreakdown.productSimilarity > 0);
  assert.ok(byId.get('related-search').scoreBreakdown.searchInterest > 0);
  assert.ok(byId.get('related-search').score > byId.get('unrelated').score);
});

test('limits category dominance while filling available recommendation slots', async () => {
  const service = new RecommendationService();
  service.repository.getUserProfile = async () => ({
    actions: Array.from({ length: 5 }, (_, index) => ({
      type: 'favorite',
      productId: `favorite-${index}`,
      category: 'Tecnología',
      timestamp: new Date()
    }))
  });
  service.getProducts = async () => [
    ...Array.from({ length: 6 }, (_, index) => ({
      _id: `technology-${index}`,
      nombre: `Tecnología ${index}`,
      categoria: 'Tecnología',
      stock: 20
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      _id: `home-${index}`,
      nombre: `Hogar ${index}`,
      categoria: 'Hogar',
      stock: 20
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      _id: `clothes-${index}`,
      nombre: `Ropa ${index}`,
      categoria: 'Ropa',
      stock: 20
    }))
  ];

  const result = await service.getRecommendationsForUser('user-1');
  const categories = result.recommendations.map(({ categoria }) => categoria);

  assert.equal(result.recommendations.length, 6);
  assert.ok(categories.filter((category) => category === 'Tecnología').length <= 2);
  assert.ok(new Set(categories).size >= 3);
});

test('reports recommendation impressions, clicks, and click-through rate', async () => {
  const service = new RecommendationService();
  const timestamp = new Date();
  const profile = service.buildProfile([
    { type: 'recommendation_impression', timestamp },
    { type: 'recommendation_impression', timestamp },
    { type: 'recommendation_click', timestamp }
  ]);

  assert.deepEqual(profile.metrics, {
    impressions: 2,
    clicks: 1,
    clickThroughRate: 0.5
  });
});

test('finds related products by attributes as well as category', async () => {
  const service = new RecommendationService();
  service.getProductById = async () => ({
    _id: 'selected',
    nombre: 'Mouse ergonómico',
    categoria: 'Tecnología',
    marca: 'Acme',
    descripcion: 'Mouse inalámbrico',
    precio: 100,
    stock: 5
  });
  service.getProducts = async () => [
    {
      _id: 'same-brand',
      nombre: 'Teclado Acme',
      categoria: 'Accesorios',
      marca: 'Acme',
      descripcion: 'Teclado mecánico',
      precio: 110,
      stock: 5
    },
    {
      _id: 'same-category',
      nombre: 'Auriculares',
      categoria: 'Tecnología',
      marca: 'Sound',
      descripcion: 'Auriculares bluetooth',
      precio: 250,
      stock: 5
    },
    {
      _id: 'unrelated',
      nombre: 'Camiseta',
      categoria: 'Ropa',
      marca: 'Moda',
      descripcion: 'Prenda de algodón',
      precio: 30,
      stock: 5
    }
  ];

  const result = await service.getRecommendationsForProduct('selected');
  const productIds = result.recommendations.map(({ productId }) => productId);

  assert.ok(productIds.includes('same-brand'));
  assert.ok(productIds.includes('same-category'));
  assert.ok(!productIds.includes('unrelated'));
});
