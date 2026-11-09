import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cartApi, productsApi, recommendationsApi, salesApi } from "../admin/adminApi";
import { sortProducts } from "../utils/products";
import CartPanel from "./CartPanel";
import ProductDetail from "./ProductDetail";
import StoreCatalog, { FavoritesSection } from "./StoreCatalog";
import StoreHeader from "./StoreHeader";
import StoreHero from "./StoreHero";
import StoreRecommendations from "./StoreRecommendations";
import { normalizeSearchValue, productKey } from "./productHelpers";

function UserDashboard({ session, onLogout }) {
  const [products, setProducts] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [recommendationProducts, setRecommendationProducts] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsNotice, setRecommendationsNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState({ items: [], count: 0, total: 0 });
  const [cartOpen, setCartOpen] = useState(false);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartBusy, setCartBusy] = useState("");
  const [cartNotice, setCartNotice] = useState("");
  const [cartNoticeType, setCartNoticeType] = useState("error");
  const [showFavorites, setShowFavorites] = useState(false);
  const [recommendationsCollapsed, setRecommendationsCollapsed] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [purchaseNotice, setPurchaseNotice] = useState("");
  const favoriteStorageKey = `nexora-favorites-${session.user?.id || session.user?._id || session.user?.email || "guest"}`;
  const [favoriteIds, setFavoriteIds] = useState(() => {
    try {
      const saved = localStorage.getItem(favoriteStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const cartRef = useRef(cart);
  const pendingRecommendationActions = useRef([]);
  const recommendationActionTimer = useRef(null);

  const activeCartProductIdKey = [...new Set(cart.items.map((item) => String(item.id_product)))]
    .sort()
    .join(",");
  const activeCartProductIds = useMemo(
    () => new Set(activeCartProductIdKey ? activeCartProductIdKey.split(",") : []),
    [activeCartProductIdKey]
  );
  const visibleRecommendationProducts = useMemo(
    () => recommendationProducts.filter(({ product }) => !activeCartProductIds.has(String(product._id || product.id))),
    [recommendationProducts, activeCartProductIds]
  );
  const recommendationExposureKey = visibleRecommendationProducts
    .map(({ recommendation }) => `${recommendation.productId}:${recommendation.explanation?.generatedAt || ""}`)
    .join("|");

  useEffect(() => {
    localStorage.setItem(favoriteStorageKey, JSON.stringify(favoriteIds));
  }, [favoriteIds, favoriteStorageKey]);

  const applyRecommendations = (recommendations, availableProducts) => {
    const productsById = new Map(availableProducts.map((product) => [
      String(product._id || product.id),
      product,
    ]));
    setRecommendationProducts(recommendations.flatMap((recommendation) => {
      const product = productsById.get(String(recommendation.productId));
      return product ? [{ product, recommendation }] : [];
    }));
  };

  const loadRecommendations = async (availableProducts = catalogProducts, activeCart = cartRef.current) => {
    setRecommendationsLoading(true);
    setRecommendationsNotice("");
    try {
      const cartProductIds = activeCart.items.map((item) => String(item.id_product));
      const result = await recommendationsApi.mine(cartProductIds);
      applyRecommendations(result.recommendations || [], availableProducts);
    } catch (error) {
      setRecommendationsNotice(error instanceof Error ? error.message : "No fue posible cargar tus recomendaciones.");
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const queueRecommendationActions = (actions) => {
    pendingRecommendationActions.current.push(...actions);
    window.clearTimeout(recommendationActionTimer.current);
    recommendationActionTimer.current = window.setTimeout(async () => {
      const pendingActions = pendingRecommendationActions.current.splice(0);
      if (!pendingActions.length) return;
      try {
        const cartProductIds = cartRef.current.items.map((item) => String(item.id_product));
        const result = await recommendationsApi.refresh(pendingActions, cartProductIds);
        applyRecommendations(result.recommendations || [], catalogProducts);
        setRecommendationsNotice("");
      } catch (error) {
        setRecommendationsNotice(error instanceof Error ? error.message : "No fue posible actualizar tus recomendaciones.");
      }
    }, 500);
  };

  const loadProducts = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setRecommendationsLoading(true);
    setRecommendationsNotice("");
    try {
      const [productResult, recommendationResult, cartResult] = await Promise.allSettled([
        productsApi.list(),
        recommendationsApi.mine(),
        cartApi.get(),
      ]);
      if (cartResult.status === "fulfilled") {
        cartRef.current = cartResult.value;
        setCart(cartResult.value);
        setCartNotice("");
      } else {
        setCartNotice(cartResult.reason instanceof Error ? cartResult.reason.message : "No fue posible cargar el carrito.");
      }
      if (productResult.status === "rejected") throw productResult.reason;

      const catalog = Array.isArray(productResult.value) ? sortProducts(productResult.value) : [];
      setCatalogProducts(catalog);
      setProducts(catalog);
      setNotice("");
      if (recommendationResult.status === "fulfilled") {
        let recommendations = recommendationResult.value.recommendations || [];
        const cartProductIds = cartResult.status === "fulfilled"
          ? cartResult.value.items.map((item) => String(item.id_product))
          : [];
        const recommendationsContainCartItems = recommendations.some(
          (recommendation) => cartProductIds.includes(String(recommendation.productId))
        );
        if (recommendationsContainCartItems) {
          try {
            const refreshed = await recommendationsApi.mine(cartProductIds);
            recommendations = refreshed.recommendations || [];
          } catch (error) {
            setRecommendationsNotice(error instanceof Error
              ? error.message
              : "No fue posible excluir del recomendador los productos que ya están en tu carrito.");
          }
        }
        applyRecommendations(recommendations, catalog);
      } else {
        setRecommendationsNotice(
          recommendationResult.reason instanceof Error
            ? recommendationResult.reason.message
            : "No fue posible cargar tus recomendaciones."
        );
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No fue posible cargar el catálogo.");
      setRecommendationsNotice(error instanceof Error ? error.message : "No fue posible cargar el catálogo para tus recomendaciones.");
    } finally {
      setLoading(false);
      setRecommendationsLoading(false);
      setCartLoading(false);
    }
  };

  useEffect(() => {
    loadProducts(false);
  }, []);

  useEffect(() => {
    if (visibleRecommendationProducts.length) {
      const impressions = visibleRecommendationProducts.map(({ product, recommendation }) => ({
        type: "recommendation_impression",
        productId: recommendation.productId,
        productName: product.nombre || product.name || "Producto",
        category: product.categoria || product.category || "",
      }));
      recommendationsApi.events(impressions).catch((error) => {
        setRecommendationsNotice(error instanceof Error ? error.message : "No fue posible registrar las impresiones.");
      });
    }
  }, [recommendationExposureKey, visibleRecommendationProducts]);

  useEffect(() => () => window.clearTimeout(recommendationActionTimer.current), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "return") return;

    const saleId = params.get("sale_id");
    if (!saleId) {
      setPaymentNotice("Volviste de Mercado Pago, pero no encontramos la referencia de la orden.");
      return;
    }

    let cancelled = false;
    const verifyPayment = async () => {
      try {
        let status = "pending";
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const result = await salesApi.verifyMercadoPagoPayment(saleId);
          status = result.status;
          if (status !== "pending" || attempt === 5) break;
          await new Promise((resolve) => window.setTimeout(resolve, 2000));
        }

        if (cancelled) return;
        if (status === "approved") {
          setPaymentNotice("Pago de prueba aprobado. Tu pedido ya está registrado.");
        } else if (status === "rejected" || status === "cancelled") {
          setPaymentNotice("El pago de prueba no fue aprobado. Puedes volver a agregar los productos e intentarlo de nuevo.");
        } else {
          setPaymentNotice("Aún no encontramos la confirmación del pago. Actualiza Pedidos en unos momentos.");
        }
      } catch (error) {
        if (!cancelled) {
          setPaymentNotice(error instanceof Error ? error.message : "No fue posible consultar el estado del pago.");
        }
      }
    };

    verifyPayment();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectCategory = async (category) => {
    setShowFavorites(false);
    setActiveCategory(category);
    setLoading(true);
    setNotice("");
    try {
      const result = category === "Todos"
        ? catalogProducts
        : await productsApi.byCategory(category);
      setProducts(Array.isArray(result) ? sortProducts(result) : []);
    } catch (error) {
      setProducts([]);
      setNotice(error instanceof Error ? error.message : "No fue posible cargar esta categoría.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    if (value.trim() && activeCategory !== "Todos") {
      setActiveCategory("Todos");
      setShowFavorites(false);
      setProducts(catalogProducts);
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setShowFavorites(false);
    setActiveCategory("Todos");
    setProducts(catalogProducts);
    const searchTerm = search.trim();
    if (searchTerm) queueRecommendationActions([{ type: "search", productName: searchTerm }]);
    document.getElementById("productos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateCart = async (key, operation, openAfterUpdate = false, refreshRecommendations = false) => {
    setCartBusy(key);
    setCartNotice("");
    setCartNoticeType("error");
    try {
      const updatedCart = await operation();
      cartRef.current = updatedCart;
      setCart(updatedCart);
      if (openAfterUpdate) setCartOpen(true);
      if (refreshRecommendations) loadRecommendations(catalogProducts, updatedCart);
      return true;
    } catch (error) {
      setCartNotice(error instanceof Error ? error.message : "No fue posible actualizar el carrito.");
      return false;
    } finally {
      setCartBusy("");
    }
  };

  const checkoutCart = async () => {
    setCartBusy("checkout");
    setCartNotice("");
    setCartNoticeType("error");

    const paymentWindow = window.open("", "_blank");
    if (!paymentWindow) {
      setCartNotice("El navegador bloqueó la nueva pestaña. Permite las ventanas emergentes e inténtalo de nuevo.");
      setCartBusy("");
      return;
    }
    paymentWindow.opener = null;

    try {
      const result = await cartApi.checkout();
      if (!result.checkoutUrl) throw new Error("Mercado Pago no devolvió el enlace para continuar el pago.");

      paymentWindow.location.href = result.checkoutUrl;
    } catch (error) {
      setCartNotice(error instanceof Error ? error.message : "No fue posible iniciar el pago de prueba.");
      paymentWindow.close();
    } finally {
      setCartBusy("");
    }
  };

  const purchaseProduct = async (product) => {
    const productId = String(product._id || product.id);
    setCartBusy(`buy-${productId}`);
    setPurchaseNotice("");
    setNotice("");

    const paymentWindow = window.open("", "_blank");
    if (!paymentWindow) {
      const message = "El navegador bloqueó la nueva pestaña. Permite las ventanas emergentes e inténtalo de nuevo.";
      setPurchaseNotice(message);
      setNotice(message);
      setCartBusy("");
      return;
    }
    paymentWindow.opener = null;

    try {
      const result = await cartApi.checkout(productId);
      if (!result.checkoutUrl) throw new Error("Mercado Pago no devolvió el enlace para continuar el pago.");

      paymentWindow.location.href = result.checkoutUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible iniciar el pago de prueba.";
      setPurchaseNotice(message);
      setNotice(message);
      paymentWindow.close();
    } finally {
      setCartBusy("");
    }
  };

  const toggleFavorite = (product) => {
    const key = productKey(product);
    const addingFavorite = !favoriteIds.includes(key);
    setFavoriteIds((current) => current.includes(key)
      ? current.filter((favoriteId) => favoriteId !== key)
      : [...current, key]);
    if (addingFavorite) {
      queueRecommendationActions([{
        type: "favorite",
        productId: key,
        productName: product.nombre || product.name || "Producto",
        category: product.categoria || product.category || "",
        brand: product.marca || product.brand || "",
        description: product.descripcion || product.description || "",
        price: Number(product.precio ?? product.price),
      }]);
    }
  };

  const toggleFavoritesView = () => {
    const nextValue = !showFavorites;
    setShowFavorites(nextValue);
    if (nextValue) {
      setSearch("");
      setActiveCategory("Todos");
      setProducts(catalogProducts);
    }
    window.requestAnimationFrame(() => {
      document.getElementById(nextValue ? "favoritos" : "productos")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const openProductDetails = (product, fromRecommendations = false) => {
    setPurchaseNotice("");
    setSelectedProduct(product);
    queueRecommendationActions([{
      type: "view",
      productId: String(product._id || product.id || ""),
      productName: product.nombre || product.name || "Producto",
      category: product.categoria || product.category || "",
      brand: product.marca || product.brand || "",
      description: product.descripcion || product.description || "",
      price: Number(product.precio ?? product.price),
    }, ...(fromRecommendations ? [{
      type: "recommendation_click",
      productId: String(product._id || product.id || ""),
      productName: product.nombre || product.name || "Producto",
      category: product.categoria || product.category || "",
    }] : [])]);
  };
  const closeProductDetails = useCallback(() => setSelectedProduct(null), []);
  const addProductToCart = async (productId) => {
    const added = await updateCart(productId, () => cartApi.add(productId), true);
    const product = catalogProducts.find((item) => String(item._id || item.id) === String(productId));
    if (added && product) {
      queueRecommendationActions([{
        type: "cart",
        productId: String(product._id || product.id),
        productName: product.nombre || product.name || "Producto",
        category: product.categoria || product.category || "",
        brand: product.marca || product.brand || "",
        description: product.descripcion || product.description || "",
        price: Number(product.precio ?? product.price),
      }]);
    }
    return added;
  };
  const clearCart = () => updateCart("clear", async () => {
    await cartApi.clear();
    return cartApi.get();
  }, false, true);

  const categories = ["Todos", ...new Set(catalogProducts.map((product) => product.categoria).filter(Boolean))];
  const query = normalizeSearchValue(search.trim());
  const visibleProducts = products.filter((product) => {
    if (!query) return true;
    return [
      product.nombre,
      product.descripcion,
      product.marca,
      product.categoria,
      product.id,
      product._id,
    ].some((value) => normalizeSearchValue(value).includes(query));
  });
  const favoriteProducts = catalogProducts.filter((product) => favoriteIds.includes(productKey(product)));

  return <main className="storefront">
    <StoreHeader
      session={session}
      onLogout={onLogout}
      search={search}
      onSearchChange={handleSearchChange}
      onSearchSubmit={submitSearch}
      showFavorites={showFavorites}
      favoriteCount={favoriteIds.length}
      onToggleFavorites={toggleFavoritesView}
      cartOpen={cartOpen}
      cartCount={cart.count}
      onToggleCart={() => setCartOpen((open) => !open)}
    />
    <CartPanel
      open={cartOpen}
      cart={cart}
      loading={cartLoading}
      busy={cartBusy}
      notice={cartNotice}
      noticeType={cartNoticeType}
      onClose={() => setCartOpen(false)}
      onDecrease={(item) => updateCart(item.id_product, () => item.quantity === 1
        ? cartApi.remove(item.id_product)
        : cartApi.setQuantity(item.id_product, item.quantity - 1), false, true)}
      onIncrease={(item) => updateCart(item.id_product, () => cartApi.setQuantity(item.id_product, item.quantity + 1), false, true)}
      onRemove={(item) => updateCart(item.id_product, () => cartApi.remove(item.id_product), false, true)}
      onCheckout={checkoutCart}
      onClear={clearCart}
    />
    {paymentNotice && <div className="store-notice" role="status">{paymentNotice}</div>}
    {selectedProduct && <ProductDetail
      product={selectedProduct}
      busy={cartBusy}
      favoriteIds={favoriteIds}
      notice={purchaseNotice}
      onClose={closeProductDetails}
      onAddToCart={(productId) => {
        addProductToCart(productId).then((added) => {
          if (added) closeProductDetails();
        });
      }}
      onBuy={purchaseProduct}
      onToggleFavorite={toggleFavorite}
    />}
    {showFavorites ? <FavoritesSection
      products={favoriteProducts}
      loading={loading}
      favoriteIds={favoriteIds}
      busy={cartBusy}
      onOpenProduct={openProductDetails}
      onToggleFavorite={toggleFavorite}
      onAddToCart={addProductToCart}
      onBackToCatalog={() => setShowFavorites(false)}
    /> : <>
      <StoreHero />
      <StoreRecommendations
        products={visibleRecommendationProducts}
        loading={recommendationsLoading}
        notice={recommendationsNotice}
        collapsed={recommendationsCollapsed}
        favoriteIds={favoriteIds}
        busy={cartBusy}
        onToggleCollapsed={() => setRecommendationsCollapsed((collapsed) => !collapsed)}
        onRefresh={() => loadRecommendations()}
        onOpenProduct={openProductDetails}
        onToggleFavorite={toggleFavorite}
        onAddToCart={addProductToCart}
      />
      <StoreCatalog
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={selectCategory}
        onRefresh={loadProducts}
        notice={notice}
        loading={loading}
        products={visibleProducts}
        favoriteIds={favoriteIds}
        busy={cartBusy}
        onOpenProduct={openProductDetails}
        onToggleFavorite={toggleFavorite}
        onAddToCart={addProductToCart}
        onResetFilters={() => {
          setSearch("");
          selectCategory("Todos");
        }}
      />
    </>}
  </main>;
}

export default UserDashboard;
