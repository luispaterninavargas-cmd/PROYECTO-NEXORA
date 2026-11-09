import { useEffect, useRef, useState } from "react";
import StoreIcon from "../components/StoreIcon";
import { getProductImages, productKey } from "./productHelpers";

function ProductDetail({ product, busy, favoriteIds, notice, onClose, onAddToCart, onBuy, onToggleFavorite }) {
  const [imageIndex, setImageIndex] = useState(0);
  const thumbnailsRef = useRef(null);
  const thumbnailRefs = useRef([]);
  const images = getProductImages(product);
  const image = images[imageIndex] || images[0];
  const changeImage = (direction) => {
    setImageIndex((current) => (current + direction + images.length) % images.length);
  };
  const key = productKey(product);
  const isFavorite = favoriteIds.includes(key);
  const productId = String(product._id || product.id);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  useEffect(() => {
    const container = thumbnailsRef.current;
    const activeThumbnail = thumbnailRefs.current[imageIndex];
    if (!container || !activeThumbnail) return;

    const containerBounds = container.getBoundingClientRect();
    const thumbnailBounds = activeThumbnail.getBoundingClientRect();
    const targetLeft = container.scrollLeft
      + thumbnailBounds.left
      - containerBounds.left
      - (container.clientWidth - thumbnailBounds.width) / 2;
    container.scrollTo({ left: targetLeft, behavior: "smooth" });
  }, [imageIndex]);

  return <div className="product-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="product-detail-panel" role="dialog" aria-modal="true" aria-labelledby="product-detail-title">
      <button className="product-detail-close" type="button" autoFocus onClick={onClose} aria-label="Cerrar detalles">×</button>
      <div className="product-detail-image">
        {image ? <>
          <div className="product-detail-main-image">
            <img src={image} alt={`${product.nombre || "Producto"}, imagen ${imageIndex + 1}`} onError={(event) => { event.currentTarget.hidden = true; }} />
          </div>
          {images.length > 1 && <div className="product-detail-gallery-controls">
            <button className="product-image-arrow" type="button" onClick={() => changeImage(-1)} aria-label="Ver imagen anterior">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <div className="product-detail-thumbnails" ref={thumbnailsRef} aria-label="Imágenes del producto">
              {images.map((thumbnail, index) => <button
                className={index === imageIndex ? "active" : ""}
                type="button"
                key={`${thumbnail}-${index}`}
                ref={(element) => { thumbnailRefs.current[index] = element; }}
                onClick={() => setImageIndex(index)}
                aria-label={`Ver imagen ${index + 1}`}
                aria-pressed={index === imageIndex}
              >
                <img src={thumbnail} alt="" />
              </button>)}
            </div>
            <button className="product-image-arrow" type="button" onClick={() => changeImage(1)} aria-label="Ver imagen siguiente">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>}
        </> : <span>NEXORA</span>}
      </div>
      <div className="product-detail-content">
        <span className="product-detail-category">
          {product.categoria || "Tecnología"}
          {product.marca ? ` · ${product.marca}` : ""}
        </span>
        <h2 id="product-detail-title">{product.nombre || product.name || "Producto"}</h2>
        <div className="product-detail-price">
          ${Number(product.precio || product.price || 0).toLocaleString("es-CO")}
        </div>
        <p className="product-detail-description">
          {product.descripcion || "Consulta los detalles de este producto en el catálogo NEXORA."}
        </p>
        <p className={Number(product.stock) > 0 ? "product-detail-stock" : "product-detail-stock unavailable"}>
          {Number(product.stock) > 0 ? `${product.stock} disponibles` : "Agotado"}
        </p>
        {notice && <div className="store-cart-notice" role="alert">{notice}</div>}
        <div className="product-detail-actions">
          <button className="product-detail-add" type="button" disabled={Number(product.stock) < 1 || Boolean(busy)} onClick={() => onAddToCart(productId)}>
            {busy === productId ? "Agregando..." : "Añadir al carrito"}
          </button>
          <button className="product-detail-buy" type="button" disabled={Number(product.stock) < 1 || Boolean(busy)} onClick={() => onBuy(product)}>
            {busy === `buy-${productId}` ? "Abriendo Mercado Pago..." : "Comprar ahora"}
          </button>
          <button className={isFavorite ? "product-detail-favorite active" : "product-detail-favorite"} type="button" aria-pressed={isFavorite} onClick={() => onToggleFavorite(product)}>
            <StoreIcon name="heart" />
            {isFavorite ? "Guardado en favoritos" : "Añadir a favoritos"}
          </button>
        </div>
      </div>
    </section>
  </div>;
}

export default ProductDetail;
