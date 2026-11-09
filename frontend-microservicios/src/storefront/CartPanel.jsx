import { getProductImages } from "./productHelpers";

function CartPanel({
  open,
  cart,
  loading,
  busy,
  notice,
  noticeType,
  onClose,
  onDecrease,
  onIncrease,
  onRemove,
  onCheckout,
  onClear,
}) {
  if (!open) return null;

  return <div className="cart-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="store-cart-panel" aria-label="Tu carrito" aria-modal="true" role="dialog">
      <div className="store-cart-heading">
        <div><span className="hero-kicker">Tu compra</span><h2>Carrito <span>{cart.count}</span></h2></div>
        <button className="cart-close" type="button" onClick={onClose} aria-label="Cerrar carrito">×</button>
      </div>
      {notice && <div className={`store-cart-notice ${noticeType}`} role={noticeType === "success" ? "status" : "alert"}>{notice}</div>}
      {loading ? <p className="store-cart-empty">Cargando tus productos...</p> : cart.items.length === 0
        ? <p className="store-cart-empty">Tu carrito está vacío. Agrega productos del catálogo para verlos aquí.</p>
        : <>
          <div className="store-cart-items">
            {cart.items.map((item) => {
              const itemName = item.product?.nombre || item.product?.name || "Producto";
              const productId = item.id_product;
              const itemImage = getProductImages(item.product || {})[0];

              return <article className="store-cart-item" key={productId}>
                <div className="store-cart-image">{itemImage && <img src={itemImage} alt="" />}</div>
                <div className="store-cart-details">
                  <h3>{itemName}</h3>
                  <p>${Number(item.subtotal).toLocaleString("es-CO")}</p>
                  <div className="store-cart-controls">
                    <button type="button" aria-label={`Disminuir ${itemName}`} disabled={busy === productId} onClick={() => onDecrease(item)}>−</button>
                    <span>{item.quantity}</span>
                    <button type="button" aria-label={`Aumentar ${itemName}`} disabled={busy === productId || item.quantity >= Number(item.product?.stock)} onClick={() => onIncrease(item)}>+</button>
                    <button className="store-cart-remove" type="button" disabled={busy === productId} onClick={() => onRemove(item)}>Quitar</button>
                  </div>
                </div>
              </article>;
            })}
          </div>
          <div className="store-cart-total"><span>Total</span><strong>${Number(cart.total).toLocaleString("es-CO")}</strong></div>
          <button className="store-cart-checkout" type="button" disabled={Boolean(busy)} onClick={onCheckout}>{busy === "checkout" ? "Abriendo Mercado Pago..." : "Continuar al pago"}</button>
          <button className="store-cart-clear" type="button" disabled={Boolean(busy)} onClick={onClear}>Vaciar carrito</button>
        </>}
    </aside>
  </div>;
}

export default CartPanel;
