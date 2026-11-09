import StoreIcon from "../components/StoreIcon";
import { getProductImages, productKey } from "./productHelpers";

export function ProductCard({ product, index, favoriteIds, busy, onOpen, onToggleFavorite, onAddToCart, recommendation }) {
  const key = productKey(product);
  const isFavorite = favoriteIds.includes(key);
  const productId = String(product._id || product.id);
  const image = getProductImages(product)[0];
  const scoreLabels = {
    categoryInterest: "Interés en la categoría",
    productSimilarity: "Similitud de producto",
    searchInterest: "Coincidencia con búsquedas",
    availability: "Disponibilidad",
    recency: "Actividad reciente",
  };
  const explanation = recommendation?.explanation;

  return <article className="store-card" onClick={() => onOpen(product, Boolean(recommendation))}>
    <div className="store-card-image">
      <span className="card-index">{String(index + 1).padStart(2, "0")}</span>
      <button
        className={isFavorite ? "card-favorite active" : "card-favorite"}
        type="button"
        onClick={(event) => { event.stopPropagation(); onToggleFavorite(product); }}
        aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
        aria-pressed={isFavorite}
      >
        <StoreIcon name="heart" />
      </button>
      {image
        ? <div className="store-image-frame"><img src={image} alt={product.nombre || "Producto"} onError={(event) => { event.currentTarget.hidden = true; }} /></div>
        : <span className="image-placeholder">NEXORA</span>}
    </div>
    <div className="store-card-body">
      <div className="card-category">{product.categoria || "Tecnología"}{product.marca ? ` · ${product.marca}` : ""}</div>
      {recommendation?.reason?.length > 0 && <p className="card-recommendation-reason">{recommendation.reason.join(" · ")}</p>}
      {explanation && <details className="recommendation-explanation" onClick={(event) => event.stopPropagation()}>
        <summary>¿Por qué te lo recomendamos?</summary>
        <div className="recommendation-explanation-content">
          {explanation.summary && <p>{explanation.summary}</p>}
          {explanation.evidence?.length > 0 && <>
            <strong>Señales que influyeron</strong>
            <ul>
              {explanation.evidence.map((item, evidenceIndex) => <li key={`${item.factor}-${evidenceIndex}`}>{item.label}</li>)}
            </ul>
          </>}
          {recommendation.scoreBreakdown && <ul className="recommendation-score-breakdown">
            {Object.entries(scoreLabels).map(([factor, label]) => {
              const value = recommendation.scoreBreakdown[factor];
              return typeof value === "number" && <li key={factor}>{label}<span>{Math.round(value * 100)}%</span></li>;
            })}
          </ul>}
          {typeof explanation.confidence === "number" && <p className="recommendation-confidence">
            Afinidad estimada (heurística): {Math.round(explanation.confidence * 100)}%
          </p>}
        </div>
      </details>}
      <h3><button className="store-product-open" type="button" onClick={() => onOpen(product, Boolean(recommendation))}>{product.nombre || product.name || "Producto sin nombre"}</button></h3>
      <p>{product.descripcion || "Diseñado para acompañarte todos los días."}</p>
      <div className="store-card-footer">
        <strong>${Number(product.precio || product.price || 0).toLocaleString("es-CO")}</strong>
        <button type="button" className="add-cart" onClick={(event) => { event.stopPropagation(); onAddToCart(productId); }} disabled={Number(product.stock) <= 0 || Boolean(busy)}>
          {busy === productId ? "Agregando..." : "Añadir al carrito"}
        </button>
      </div>
    </div>
  </article>;
}

function StoreCatalog({
  categories,
  activeCategory,
  onSelectCategory,
  onRefresh,
  notice,
  loading,
  products,
  favoriteIds,
  busy,
  onOpenProduct,
  onToggleFavorite,
  onAddToCart,
  onResetFilters,
}) {
  return <section className="store-catalog" id="productos">
    <div className="catalog-heading">
      <div><span className="hero-kicker">Selección NEXORA</span><h2>Todo lo que necesitas, en un solo lugar.</h2></div>
      <button className="catalog-refresh" type="button" onClick={onRefresh}>Actualizar catálogo ↻</button>
    </div>
    <div className="category-row" id="categorias" aria-label="Categorías de productos">
      {categories.map((category) => <button key={category} className={activeCategory === category ? "category-active" : ""} type="button" onClick={() => onSelectCategory(category)}>{category}</button>)}
    </div>
    {notice && <div className="store-notice">{notice}</div>}
    {loading ? <div className="store-loading">Preparando tu selección...</div> : <div className="store-grid">
      {products.map((product, index) => <ProductCard
        key={product._id || product.id}
        product={product}
        index={index}
        favoriteIds={favoriteIds}
        busy={busy}
        onOpen={onOpenProduct}
        onToggleFavorite={onToggleFavorite}
        onAddToCart={onAddToCart}
      />)}
      {!products.length && <div className="store-empty">
        No encontramos productos con esa búsqueda.
        <button type="button" onClick={onResetFilters}>Ver todo el catálogo</button>
      </div>}
    </div>}
  </section>;
}

export function FavoritesSection({
  products,
  loading,
  favoriteIds,
  busy,
  onOpenProduct,
  onToggleFavorite,
  onAddToCart,
  onBackToCatalog,
}) {
  return <section className="store-catalog favorites-section" id="favoritos">
    <div className="catalog-heading">
      <div><span className="hero-kicker">Selección NEXORA</span><h2>Tus favoritos</h2></div>
      <button className="catalog-refresh" type="button" onClick={onBackToCatalog}>Ver catálogo</button>
    </div>
    {loading ? <div className="store-loading">Cargando tus favoritos...</div> : <div className="store-grid">
      {products.map((product, index) => <ProductCard
        key={product._id || product.id}
        product={product}
        index={index}
        favoriteIds={favoriteIds}
        busy={busy}
        onOpen={onOpenProduct}
        onToggleFavorite={onToggleFavorite}
        onAddToCart={onAddToCart}
      />)}
      {!products.length && <div className="store-empty">
        Todavía no tienes productos favoritos.
        <button type="button" onClick={onBackToCatalog}>Ver todo el catálogo</button>
      </div>}
    </div>}
  </section>;
}

export default StoreCatalog;
