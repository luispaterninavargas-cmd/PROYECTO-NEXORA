import { ProductCard } from "./StoreCatalog";

function StoreRecommendations({
  products,
  loading,
  notice,
  collapsed,
  favoriteIds,
  busy,
  onToggleCollapsed,
  onRefresh,
  onOpenProduct,
  onToggleFavorite,
  onAddToCart,
}) {
  return <section className="store-recommendations" id="para-ti" aria-labelledby="recommendations-title">
    <div className="recommendations-heading">
      <div>
        <span className="hero-kicker">Selección personalizada</span>
        <h2 id="recommendations-title">Para ti</h2>
        <p>Productos elegidos según tus intereses y actividad.</p>
      </div>
      <div className="recommendations-actions">
        <button className="catalog-refresh" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Actualizando..." : "Actualizar selección ↻"}
        </button>
        <button
          className="recommendations-toggle"
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls="recommendations-content"
          aria-label={collapsed ? "Mostrar recomendaciones" : "Ocultar recomendaciones"}
          title={collapsed ? "Mostrar recomendaciones" : "Ocultar recomendaciones"}
        >
          {collapsed ? "Mostrar" : "Ocultar"}
        </button>
      </div>
    </div>
    {!collapsed && <div id="recommendations-content">
      {notice && <div className="store-notice" role="status">{notice}</div>}
      {loading ? <div className="store-loading">Preparando tus recomendaciones...</div> : products.length > 0
        ? <div className="store-grid">
          {products.map(({ product, recommendation }, index) => <ProductCard
            key={recommendation.productId}
            product={product}
            index={index}
            favoriteIds={favoriteIds}
            busy={busy}
            onOpen={onOpenProduct}
            onToggleFavorite={onToggleFavorite}
            onAddToCart={onAddToCart}
            recommendation={recommendation}
          />)}
        </div>
        : <div className="recommendations-empty">Aún no hay productos recomendados. Explora el catálogo e interactúa con tus productos favoritos para personalizar esta selección.</div>}
    </div>}
  </section>;
}

export default StoreRecommendations;
