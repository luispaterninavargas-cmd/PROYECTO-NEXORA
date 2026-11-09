import { useState } from "react";
import { idOf, productImages } from "./adminUtils";

const emptySale = { id_product: "", fecha: "", total: "" };

export function ProductForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => {
    const images = productImages(initial);
    return {
      ...initial,
      imagenes: [...images, ...Array(Math.max(0, 3 - images.length)).fill("")],
    };
  });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateImage = (index, value) => setForm((current) => ({
    ...current,
    imagenes: current.imagenes.map((image, imageIndex) => imageIndex === index ? value : image),
  }));
  const removeImage = (index) => setForm((current) => ({
    ...current,
    imagenes: current.imagenes.filter((_, imageIndex) => imageIndex !== index),
  }));

  const submit = (event) => {
    event.preventDefault();
    const imagenes = form.imagenes.map((image) => image.trim()).filter(Boolean);
    onSubmit({ ...form, imagenes, imagen: imagenes[0], precio: Number(form.precio), stock: Number(form.stock) });
  };

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <form className="editor modal-editor" onSubmit={submit}>
      <div className="form-heading">
        <div><span className="eyebrow">CATÁLOGO</span><h3>{initial._id ? "Editar producto" : "Nuevo producto"}</h3></div>
        <button type="button" className="icon-button" onClick={onCancel}>×</button>
      </div>
      <label>Nombre<input required value={form.nombre} onChange={(event) => update("nombre", event.target.value)} /></label>
      <label>Descripción<textarea value={form.descripcion} rows="3" onChange={(event) => update("descripcion", event.target.value)} /></label>
      <div className="two-col">
        <label>Categoría<input required value={form.categoria} onChange={(event) => update("categoria", event.target.value)} /></label>
        <label>Marca<input required value={form.marca} onChange={(event) => update("marca", event.target.value)} /></label>
      </div>
      <div className="two-col">
        <label>Precio<input required min="0" type="number" step="0.01" value={form.precio} onChange={(event) => update("precio", event.target.value)} /></label>
        <label>Stock<input required min="0" type="number" value={form.stock} onChange={(event) => update("stock", event.target.value)} /></label>
      </div>
      <div className="product-image-fields">
        <div className="image-fields-heading">
          <div><strong>Imágenes del producto</strong><span>Agrega al menos 3. Las siguientes son opcionales.</span></div>
        </div>
        {form.imagenes.map((image, index) => <label className="image-url-field" key={index}>
          <span>Imagen {index + 1}{index < 3 ? " · obligatoria" : " · opcional"}</span>
          <div className="image-url-control">
            <input required={index < 3} type="url" value={image} onChange={(event) => updateImage(index, event.target.value)} placeholder="https://..." />
            {index >= 3 && <button type="button" className="remove-image" onClick={() => removeImage(index)} aria-label={`Quitar imagen ${index + 1}`}>×</button>}
          </div>
        </label>)}
        <button type="button" className="add-image" onClick={() => update("imagenes", [...form.imagenes, ""])}>+ Añadir otra imagen</button>
      </div>
      <div className="actions">
        <button type="button" className="secondary" onClick={onCancel}>Cancelar</button>
        <button className="primary">Guardar producto</button>
      </div>
    </form>
  </div>;
}

export function SalesPanel({ sales, products, onCreate, onDelete }) {
  const [form, setForm] = useState(emptySale);

  const submit = (event) => {
    event.preventDefault();
    onCreate({ ...form, id_users: "", total: Number(form.total), fecha: form.fecha || new Date().toISOString() });
    setForm(emptySale);
  };

  return <section className="panel">
    <div className="section-title">
      <div><span className="eyebrow">OPERACIÓN</span><h2>Ventas</h2></div>
      <span className="count">{sales.length} registros</span>
    </div>
    <form className="sale-form" onSubmit={submit}>
      <select required value={form.id_product} onChange={(event) => setForm((current) => ({ ...current, id_product: event.target.value }))}>
        <option value="">Seleccionar producto</option>
        {products.map((product) => <option key={idOf(product)} value={idOf(product)}>{product.nombre || product.name || idOf(product)}</option>)}
      </select>
      <input required type="number" min="0" step="0.01" placeholder="Total" value={form.total} onChange={(event) => setForm((current) => ({ ...current, total: event.target.value }))} />
      <button className="primary">Registrar venta</button>
    </form>
    <div className="table-wrap">
      <table>
        <thead><tr><th>Productos</th><th>Fecha</th><th>Total</th><th /></tr></thead>
        <tbody>{sales.map((sale) => {
          const productNames = Array.isArray(sale.items) && sale.items.length
            ? sale.items.map((item) => item.product_name || products.find((product) => idOf(product) === item.id_product)?.nombre || item.id_product).join(", ")
            : products.find((product) => idOf(product) === sale.id_product)?.nombre || sale.id_product || "—";
          return <tr key={idOf(sale)}>
            <td>{productNames}</td>
            <td>{sale.fecha ? new Date(sale.fecha).toLocaleDateString("es-CO") : "—"}</td>
            <td className="price">${Number(sale.total || 0).toLocaleString("es-CO")}</td>
            <td><button className="danger-link" onClick={() => onDelete(idOf(sale))}>Eliminar</button></td>
          </tr>;
        })}</tbody>
      </table>
      {!sales.length && <div className="empty">Aún no hay ventas registradas.</div>}
    </div>
  </section>;
}

const orderStatusLabels = {
  payment_pending: "Pago pendiente",
  payment_failed: "Pago rechazado",
  registered: "Recibido",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
};

const nextOrderStatus = {
  registered: "preparing",
  preparing: "shipped",
  shipped: "delivered",
};

function OrderRow({ order, busy, onStatusChange, onVerifyPayment }) {
  const currentStatus = order.status || "registered";
  const nextStatus = nextOrderStatus[currentStatus];
  const [status, setStatus] = useState(nextStatus || "");
  const items = Array.isArray(order.items) && order.items.length
    ? order.items
    : order.id_product
      ? [{ id_product: order.id_product, product_name: order.product_name || order.id_product, quantity: 1, subtotal: order.total }]
      : [];
  const orderDate = order.fecha || order.createdAt;

  const submitStatus = (event) => {
    event.preventDefault();
    onStatusChange(idOf(order), status);
  };

  return <tr>
    <td><strong className="order-reference">#{String(idOf(order)).slice(-8).toUpperCase()}</strong></td>
    <td>{orderDate ? new Date(orderDate).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }) : "—"}</td>
    <td className="order-buyer" title={order.id_users || ""}>{order.id_users || "—"}</td>
    <td>
      <details className="order-items-details">
        <summary>{items.length} {items.length === 1 ? "producto" : "productos"}</summary>
        <ul>{items.map((item, index) => <li key={`${item.id_product || item.product_name}-${index}`}>
          <span>{item.product_name || item.nombre || item.id_product || "Producto"} × {item.quantity || 1}</span>
          {Number.isFinite(Number(item.subtotal)) && <strong>${Number(item.subtotal).toLocaleString("es-CO")}</strong>}
        </li>)}</ul>
      </details>
    </td>
    <td className="price">${Number(order.total || 0).toLocaleString("es-CO")}</td>
    <td><span className={`order-status status-${currentStatus}`}>{orderStatusLabels[currentStatus] || "Recibido"}</span></td>
    <td>{currentStatus === "payment_pending"
      ? <button
        className="role-save"
        type="button"
        onClick={() => onVerifyPayment(idOf(order))}
        disabled={busy}
      >
        {busy ? "Verificando…" : "Verificar pago"}
      </button>
      : nextStatus ? <form className="order-status-editor" onSubmit={submitStatus}>
      <label className="visually-hidden" htmlFor={`order-status-${idOf(order)}`}>Avanzar estado del pedido</label>
      <select id={`order-status-${idOf(order)}`} value={status} onChange={(event) => setStatus(event.target.value)} disabled={busy}>
        <option value={nextStatus}>{orderStatusLabels[nextStatus]}</option>
      </select>
      <button type="submit" className="role-save" disabled={busy}>{busy ? "Guardando…" : "Actualizar"}</button>
    </form> : currentStatus === "payment_failed"
      ? <span className="order-complete">Pago no aprobado</span>
      : <span className="order-complete">Pedido finalizado</span>}</td>
  </tr>;
}

export function OrdersPanel({ orders, loading, busyOrderId, onRefresh, onStatusChange, onVerifyPayment }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const filteredOrders = orders.filter((order) => statusFilter === "all" || (order.status || "registered") === statusFilter);
  const statusCounts = orders.reduce((counts, order) => {
    const status = order.status || "registered";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  return <section className="panel orders-panel">
    <div className="section-title">
      <div><span className="eyebrow">PREPARACIÓN Y ENTREGA</span><h2>Gestión de pedidos</h2></div>
      <button className="secondary" type="button" onClick={onRefresh} disabled={loading}>↻ Actualizar</button>
    </div>
    <div className="order-status-summary" aria-label="Resumen de pedidos">
      {Object.entries(orderStatusLabels).map(([status, label]) => <div key={status}>
        <span>{label}</span><strong>{statusCounts[status] || 0}</strong>
      </div>)}
    </div>
    <div className="orders-toolbar">
      <p>Verifica los pagos pendientes con Mercado Pago; los pedidos pagados se actualizan automáticamente.</p>
      <label>Mostrar
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">Todos los estados</option>
          {Object.entries(orderStatusLabels).map(([status, label]) => <option value={status} key={status}>{label}</option>)}
        </select>
      </label>
    </div>
    {loading ? <div className="loading">Cargando pedidos…</div> : <div className="table-wrap">
      <table className="orders-table">
        <thead><tr><th>Pedido</th><th>Fecha</th><th>Cliente (ID)</th><th>Detalle</th><th>Total</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>{filteredOrders.map((order) => <OrderRow
          key={`${idOf(order)}-${order.status || "registered"}`}
          order={order}
          busy={busyOrderId === idOf(order)}
          onStatusChange={onStatusChange}
          onVerifyPayment={onVerifyPayment}
        />)}</tbody>
      </table>
      {!filteredOrders.length && <div className="empty">{orders.length ? "No hay pedidos en este estado." : "Todavía no hay pedidos registrados."}</div>}
    </div>}
  </section>;
}

function UserRoleRow({ user, busy, isCurrentUser, onSave }) {
  const [role, setRole] = useState(user.role);
  const changed = role !== user.role;

  const submit = async (event) => {
    event.preventDefault();
    if (changed) await onSave(user._id, role);
  };

  return <tr>
    <td><strong>{user.nombre || "Sin nombre"}</strong></td>
    <td>{user.email}</td>
    <td><span className={`role-badge ${user.role === "admin" ? "administrator" : ""}`}>{user.role === "admin" ? "Administrador" : "Usuario"}</span></td>
    <td>{user.fechaRegistro ? new Date(user.fechaRegistro).toLocaleDateString("es-CO") : "—"}</td>
    <td><form className="role-editor" onSubmit={submit}>
      <label className="visually-hidden" htmlFor={`role-${user._id}`}>Rol para {user.nombre || user.email}</label>
      <select id={`role-${user._id}`} value={role} onChange={(event) => setRole(event.target.value)} disabled={busy}>
        <option value="user" disabled={isCurrentUser}>Usuario</option>
        <option value="admin">Administrador</option>
      </select>
      <button className="role-save" type="submit" disabled={busy || !changed}>{busy ? "Guardando…" : "Guardar"}</button>
    </form></td>
  </tr>;
}

export function UsersPanel({ users, loading, notice, noticeSuccess, busyUserId, currentUserId, onRefresh, onRoleChange }) {
  const adminCount = users.filter((user) => user.role === "admin").length;

  return <section className="panel users-panel">
    <div className="section-title">
      <div><span className="eyebrow">ACCESO AL SISTEMA</span><h2>Usuarios y roles</h2></div>
      <div className="users-panel-actions">
        <span className="count">{users.length} cuentas · {adminCount} administradores</span>
        <button className="secondary" type="button" onClick={onRefresh} disabled={loading}>↻ Actualizar</button>
      </div>
    </div>
    <p className="users-role-note">Los cambios de rol aplican cuando el usuario vuelva a iniciar sesión.</p>
    {notice && <div className={`notice inline ${noticeSuccess ? "users-role-success" : ""}`} role={noticeSuccess ? "status" : "alert"}>{notice}</div>}
    {loading ? <div className="loading">Cargando usuarios…</div> : <div className="table-wrap">
      <table className="users-table">
        <thead><tr><th>Nombre</th><th>Correo</th><th>Rol actual</th><th>Registro</th><th>Asignar rol</th></tr></thead>
        <tbody>{users.map((user) => <UserRoleRow key={user._id} user={user} busy={busyUserId === user._id} isCurrentUser={user._id === currentUserId} onSave={onRoleChange} />)}</tbody>
      </table>
      {!users.length && <div className="empty">No hay cuentas de usuario para mostrar.</div>}
    </div>}
  </section>;
}

export function ProductGrid({ products, onEdit, onDelete }) {
  return <div className="product-grid">
    {products.map((product, index) => <article className="product-card" key={idOf(product)}>
      <div className="product-image">
        <span className="product-number" aria-label={`Producto ${index + 1}`}>{index + 1}</span>
        {(product.imagenes?.[0] || product.imagen) && <img src={product.imagenes?.[0] || product.imagen} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />}
      </div>
      <div className="product-info">
        <h3>{product.nombre || product.name || "Producto sin nombre"}</h3>
        <p>{product.descripcion || "Sin descripción"}</p>
        <div className="product-meta">
          <strong>${Number(product.precio || product.price || 0).toLocaleString("es-CO")}</strong>
          <span>{product.stock ?? 0} disponibles</span>
        </div>
        <div className="card-actions">
          <button onClick={() => onEdit({ ...product, categoria: product.categoria ?? "", marca: product.marca ?? "", precio: product.precio ?? product.price ?? "", stock: product.stock ?? "", imagenes: productImages(product) })}>Editar</button>
          <button className="danger-link" onClick={() => onDelete(idOf(product))}>Eliminar</button>
        </div>
      </div>
    </article>)}
    {!products.length && <div className="empty">No hay productos todavía. Crea el primero para comenzar.</div>}
  </div>;
}

export function InventoryAlertsPanel({ products, refreshing, lastChecked, error, threshold, onRefresh, onEdit }) {
  const outOfStock = products
    .filter((product) => Number(product.stock ?? 0) <= 0)
    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
  const lowStock = products
    .filter((product) => Number(product.stock ?? 0) > 0 && Number(product.stock) <= threshold)
    .sort((a, b) => Number(a.stock) - Number(b.stock));
  const alerts = [
    ...outOfStock.map((product) => ({ product, status: "out" })),
    ...lowStock.map((product) => ({ product, status: "low" })),
  ];

  return <section className="panel inventory-alerts-panel">
    <div className="section-title">
      <div><span className="eyebrow">SEGUIMIENTO DE EXISTENCIAS</span><h2>Alertas de inventario</h2></div>
      <button className="secondary" type="button" onClick={onRefresh} disabled={refreshing}>
        {refreshing ? "Actualizando…" : "↻ Actualizar"}
      </button>
    </div>
    <p className="inventory-alerts-intro">
      Avisamos cuando un producto llega a {threshold} unidades o se agota por completo.
      {lastChecked && <span> Última revisión: {lastChecked.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}.</span>}
    </p>
    {error && <div className="notice inline" role="alert">{error}</div>}
    <div className="inventory-alert-counts" aria-label="Resumen de alertas de stock">
      <div className="inventory-count-out"><span>Agotados</span><strong>{outOfStock.length}</strong></div>
      <div className="inventory-count-low"><span>Por agotarse</span><strong>{lowStock.length}</strong></div>
    </div>
    {alerts.length ? <ul className="inventory-alert-list" aria-live="polite">
      {alerts.map(({ product, status }) => <li className={`inventory-alert-row inventory-alert-${status}`} key={idOf(product)}>
        <div className="inventory-alert-product">
          <strong>{product.nombre || product.name || "Producto sin nombre"}</strong>
          <span>{product.categoria || "Sin categoría"}</span>
        </div>
        <div className="inventory-alert-stock">
          <strong>{Number(product.stock ?? 0)}</strong>
          <span>{status === "out" ? "Agotado" : "unidades disponibles"}</span>
        </div>
        <button type="button" className="inventory-alert-edit" onClick={() => onEdit(product)}>
          Editar stock
        </button>
      </li>)}
    </ul> : <div className="inventory-alert-empty" role="status">
      <strong>Inventario al día</strong>
      <span>No hay productos agotados ni con {threshold} unidades o menos.</span>
    </div>}
  </section>;
}
