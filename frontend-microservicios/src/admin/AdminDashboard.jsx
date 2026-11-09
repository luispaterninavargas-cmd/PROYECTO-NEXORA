import { useEffect, useMemo, useState } from "react";
import { productsApi, salesApi, usersApi } from "./adminApi";
import { InventoryAlertsPanel, OrdersPanel, ProductForm, ProductGrid, SalesPanel, UsersPanel } from "./AdminPanels";
import { categoriesFromProducts, errorMessage, idOf, productImages } from "./adminUtils";
import { sortProducts, sortProductsByNewest } from "../utils/products";
import StoreIcon from "../components/StoreIcon";

const LOW_STOCK_THRESHOLD = 5;

const emptyProduct = {
  nombre: "",
  descripcion: "",
  categoria: "",
  marca: "",
  precio: "",
  stock: "",
  imagenes: ["", "", ""],
};

const pageTitles = {
  products: "Productos",
  sales: "Ventas",
  orders: "Pedidos",
  users: "Usuarios",
  inventoryAlerts: "Alertas de inventario",
};

const pageDescriptions = {
  users: "Consulta las cuentas y administra quién tiene acceso de administrador.",
  orders: "Revisa las compras y actualiza su avance hasta la entrega.",
  inventoryAlerts: "Identifica productos agotados o próximos a agotarse.",
};

function DashboardSidebar({ session, view, onNavigate, onLogout, inventoryAlertCount }) {
  const sections = [
    ["overview", "◈", "Resumen"],
    ["products", "package", "Productos"],
    ["inventoryAlerts", "warning", "Alertas"],
    ["sales", "sales", "Ventas"],
    ["orders", "orders", "Pedidos"],
    ["users", "user", "Usuarios"],
  ];

  return <aside className="sidebar">
    <div className="logo"><span>NEXORA</span></div>
    <nav>
      {sections.map(([key, icon, label]) => <button
        className={view === key ? "selected" : ""}
        key={key}
        type="button"
        onClick={() => onNavigate(key)}
        aria-current={view === key ? "page" : undefined}
        aria-label={key === "inventoryAlerts" ? `Alertas de inventario: ${inventoryAlertCount}` : undefined}
      >
        {["products", "inventoryAlerts", "users", "sales", "orders"].includes(key) ? <StoreIcon name={icon} /> : icon} <span>{label}</span>
        {key === "inventoryAlerts" && inventoryAlertCount > 0 && <span className="inventory-nav-count" aria-hidden="true">{inventoryAlertCount}</span>}
      </button>)}
    </nav>
    <div className="sidebar-bottom">
      <div className="user-mini">
        <span>{(session.user?.nombre || session.user?.email || "U")[0].toUpperCase()}</span>
        <div><strong>{session.user?.nombre || "Usuario"}</strong><small>{session.user?.email}</small></div>
      </div>
      <button className="logout" type="button" onClick={onLogout}>↪ Cerrar sesión</button>
    </div>
  </aside>;
}

function DashboardHeader({ view, user, onRefresh }) {
  const title = view === "overview" ? `Hola, ${user?.nombre || "bienvenido"} 👋` : pageTitles[view];
  const description = view === "overview"
    ? "Esto es lo que está pasando con tu negocio."
    : pageDescriptions[view] || "Administra la información de tu operación.";

  return <header>
    <div>
      <span className="eyebrow">PANEL DE CONTROL</span>
      <h1>{title}</h1>
      <p className="muted">{description}</p>
    </div>
    {view !== "users" && <button className="refresh" type="button" onClick={onRefresh}>↻ Actualizar</button>}
  </header>;
}

function OverviewPanel({ products, sales, total, lowStockCount, outOfStockCount, onViewInventoryAlerts, onViewProducts, onEditProduct, onDeleteProduct }) {
  return <>
    <div className="stats">
      <div><span>Productos activos</span><strong>{products.length}</strong><small>En tu catálogo</small></div>
      <div><span>Ventas registradas</span><strong>{sales.length}</strong><small>Operaciones totales</small></div>
      <div><span>Ingresos acumulados</span><strong>${total.toLocaleString("es-CO")}</strong><small>Valor de ventas</small></div>
    </div>
    <section className="panel inventory-overview">
      <div className="inventory-overview-copy">
        <span className="eyebrow">ESTADO DEL STOCK</span>
        <h2>{outOfStockCount + lowStockCount ? "Hay productos que requieren atención" : "Inventario al día"}</h2>
        <p>Las alertas se actualizan automáticamente cada minuto.</p>
      </div>
      <div className="inventory-overview-totals">
        <div className="inventory-count-out"><span>Agotados</span><strong>{outOfStockCount}</strong></div>
        <div className="inventory-count-low"><span>Por agotarse</span><strong>{lowStockCount}</strong></div>
      </div>
      <button className="secondary" type="button" onClick={onViewInventoryAlerts}>Revisar inventario</button>
    </section>
    <section className="panel">
      <div className="section-title">
        <div><span className="eyebrow">CATÁLOGO</span><h2>Productos recientes</h2></div>
        <button className="text-button" type="button" onClick={onViewProducts}>Ver todos →</button>
      </div>
      <ProductGrid products={sortProductsByNewest(products).slice(0, 4)} onEdit={onEditProduct} onDelete={onDeleteProduct} />
    </section>
  </>;
}

function CatalogPanel({ products, categories, editing, onNew, onSearch, searchType, setSearchType, searchTerm, setSearchTerm, onClearSearch, onEdit, onDelete, onSave }) {
  return <section className="panel catalog-panel">
    <div className="section-title">
      <div><span className="eyebrow">INVENTARIO</span><h2>Productos</h2></div>
      <button className="primary" type="button" onClick={onNew}>+ Nuevo producto</button>
    </div>
    <form className="product-search" onSubmit={onSearch}>
      <select value={searchType} onChange={(event) => setSearchType(event.target.value)}>
        <option value="category">Categoría</option>
        <option value="id">ID de MongoDB</option>
      </select>
      <input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        list={searchType === "category" ? "product-category-suggestions" : undefined}
        placeholder={searchType === "id" ? "ObjectId del producto" : categories.length ? "Busca o elige una categoría" : "No hay categorías disponibles"}
        aria-label={searchType === "id" ? "Buscar por ID de MongoDB" : "Buscar por categoría"}
      />
      <datalist id="product-category-suggestions">{categories.map((category) => <option key={category} value={category} />)}</datalist>
      <button className="secondary" type="submit">Buscar</button>
      <button className="text-button" type="button" onClick={onClearSearch}>Ver todos</button>
    </form>
    {editing && <ProductForm initial={editing} onCancel={() => onEdit(null)} onSubmit={onSave} />}
    <ProductGrid products={products} onEdit={onEdit} onDelete={onDelete} />
  </section>;
}

function Dashboard({ session, onLogout }) {
  const [products, setProducts] = useState([]);
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [inventoryLastChecked, setInventoryLastChecked] = useState(null);
  const [inventoryRefreshing, setInventoryRefreshing] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [availableCategories, setAvailableCategories] = useState([]);
  const [sales, setSales] = useState([]);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [searchType, setSearchType] = useState("category");
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersNotice, setUsersNotice] = useState("");
  const [usersNoticeSuccess, setUsersNoticeSuccess] = useState(false);
  const [busyUserId, setBusyUserId] = useState("");
  const [busyOrderId, setBusyOrderId] = useState("");

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [productResult, saleResult] = await Promise.allSettled([
        productsApi.list(),
        salesApi.list(),
      ]);
      const messages = [];

      if (productResult.status === "fulfilled") {
        const loadedProducts = Array.isArray(productResult.value) ? sortProducts(productResult.value) : [];
        setProducts(loadedProducts);
        setInventoryProducts(loadedProducts);
        setInventoryLastChecked(new Date());
        setInventoryError("");
        setAvailableCategories(categoriesFromProducts(loadedProducts));
      } else {
        const message = errorMessage(productResult.reason);
        messages.push(`Productos: ${message}`);
        setInventoryError(`No se pudieron actualizar las alertas de inventario: ${message}`);
      }

      if (saleResult.status === "fulfilled") {
        setSales(Array.isArray(saleResult.value) ? saleResult.value : []);
      } else {
        messages.push(`Ventas no disponible: ${errorMessage(saleResult.reason)}`);
      }
      if (messages.length) setNotice({ message: messages.join(" | "), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(false); }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timeoutId = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    let active = true;
    const refreshInventory = async () => {
      try {
        const result = await productsApi.list();
        if (!active) return;
        const loadedProducts = Array.isArray(result) ? sortProducts(result) : [];
        setInventoryProducts(loadedProducts);
        setInventoryLastChecked(new Date());
        setInventoryError("");
      } catch (error) {
        if (active) setInventoryError(`No se pudieron actualizar las alertas de inventario: ${errorMessage(error)}`);
      }
    };
    const intervalId = window.setInterval(refreshInventory, 60_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const refreshInventoryManually = async () => {
    setInventoryRefreshing(true);
    try {
      const result = await productsApi.list();
      const loadedProducts = Array.isArray(result) ? sortProducts(result) : [];
      setInventoryProducts(loadedProducts);
      setInventoryLastChecked(new Date());
      setInventoryError("");
    } catch (error) {
      setInventoryError(`No se pudieron actualizar las alertas de inventario: ${errorMessage(error)}`);
    } finally {
      setInventoryRefreshing(false);
    }
  };

  const editInventoryProduct = (product) => {
    setView("products");
    setEditing({
      ...product,
      nombre: product.nombre || product.name || "",
      categoria: product.categoria ?? "",
      marca: product.marca ?? "",
      precio: product.precio ?? product.price ?? "",
      stock: product.stock ?? 0,
      imagenes: productImages(product),
    });
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersNotice("");
    setUsersNoticeSuccess(false);
    try {
      const result = await usersApi.list();
      setUsers(Array.isArray(result) ? result : []);
    } catch (error) {
      setUsersNotice(errorMessage(error));
    } finally {
      setUsersLoading(false);
    }
  };

  const changeUserRole = async (id, role) => {
    setBusyUserId(id);
    setUsersNotice("");
    setUsersNoticeSuccess(false);
    try {
      const result = await usersApi.updateRole(id, role);
      if (result.user) {
        setUsers((current) => current.map((user) => user._id === result.user._id ? result.user : user));
      }
      setUsersNotice(result.message || "Rol actualizado. El usuario debe iniciar sesión de nuevo.");
      setUsersNoticeSuccess(true);
    } catch (error) {
      setUsersNotice(errorMessage(error));
    } finally {
      setBusyUserId("");
    }
  };

  const changeOrderStatus = async (id, status) => {
    setBusyOrderId(id);
    setNotice(null);
    try {
      const result = await salesApi.updateOrderStatus(id, status);
      if (result.order) {
        setSales((current) => current.map((order) => idOf(order) === id ? result.order : order));
      }
      setNotice({ message: result.message || "Estado del pedido actualizado.", type: "success" });
    } catch (error) {
      setNotice({ message: errorMessage(error), type: "error" });
    } finally {
      setBusyOrderId("");
    }
  };

  const verifyOrderPayment = async (id) => {
    setBusyOrderId(id);
    setNotice(null);
    try {
      const result = await salesApi.verifyMercadoPagoPayment(id);
      await load(false);
      if (result.status === "approved") {
        setNotice({ message: "Pago aprobado por Mercado Pago y pedido actualizado.", type: "success" });
      } else if (result.status === "pending") {
        setNotice({ message: "Mercado Pago todavía no confirma el pago. Puedes volver a comprobarlo más tarde.", type: "warning" });
      } else if (result.status === "rejected" || result.status === "cancelled") {
        setNotice({ message: `Mercado Pago informa que el pago está ${result.status === "rejected" ? "rechazado" : "cancelado"}.`, type: "warning" });
      } else {
        setNotice({ message: "Mercado Pago devolvió un estado de pago no reconocido.", type: "warning" });
      }
    } catch (error) {
      setNotice({ message: errorMessage(error), type: "error" });
    } finally {
      setBusyOrderId("");
    }
  };

  const run = async (operation, success) => {
    const scrollPosition = window.scrollY;
    setNotice(null);
    try {
      await operation();
      setNotice({ message: success, type: "success" });
      await load();
      requestAnimationFrame(() => window.scrollTo({ top: scrollPosition, behavior: "auto" }));
    } catch (error) {
      setNotice({ message: errorMessage(error), type: "error" });
    }
  };

  const searchProducts = async (event) => {
    event.preventDefault();
    const value = searchTerm.trim();
    if (!value) {
      setNotice({ message: "Escribe un valor para buscar.", type: "warning" });
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      const result = searchType === "id"
        ? await productsApi.byId(value)
        : await productsApi.byCategory(value);
      setProducts(Array.isArray(result) ? sortProducts(result) : result ? [result] : []);
    } catch (error) {
      setProducts([]);
      setNotice({ message: errorMessage(error), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    load();
  };
  const navigate = (nextView) => {
    setView(nextView);
    if (nextView === "orders") load();
    if (nextView === "users") loadUsers();
  };
  const saveProduct = (body) => run(async () => {
    if (editing._id) await productsApi.update(editing._id, body);
    else await productsApi.create(body);
    setEditing(null);
  }, "Producto guardado");
  const removeProduct = (id) => run(() => productsApi.remove(id), "Producto eliminado");
  const total = useMemo(() => sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0), [sales]);
  const outOfStockCount = inventoryProducts.filter((product) => Number(product.stock ?? 0) <= 0).length;
  const lowStockCount = inventoryProducts.filter((product) => Number(product.stock ?? 0) > 0 && Number(product.stock) <= LOW_STOCK_THRESHOLD).length;
  const inventoryAlertCount = outOfStockCount + lowStockCount;

  let content;
  if (view === "users") {
    content = <UsersPanel
      users={users}
      loading={usersLoading}
      notice={usersNotice}
      noticeSuccess={usersNoticeSuccess}
      busyUserId={busyUserId}
      currentUserId={session.user?._id || session.user?.id}
      onRefresh={loadUsers}
      onRoleChange={changeUserRole}
    />;
  } else if (loading) {
    content = <div className="loading">Cargando información...</div>;
  } else if (view === "orders") {
    content = <OrdersPanel
      orders={sales}
      loading={loading}
      busyOrderId={busyOrderId}
      onRefresh={load}
      onStatusChange={changeOrderStatus}
      onVerifyPayment={verifyOrderPayment}
    />;
  } else if (view === "inventoryAlerts") {
    content = <InventoryAlertsPanel
      products={inventoryProducts}
      refreshing={inventoryRefreshing}
      lastChecked={inventoryLastChecked}
      error={inventoryError}
      threshold={LOW_STOCK_THRESHOLD}
      onRefresh={refreshInventoryManually}
      onEdit={editInventoryProduct}
    />;
  } else if (view === "sales") {
    content = <SalesPanel
      sales={sales}
      products={products}
      onCreate={(body) => run(() => salesApi.create(body), "Venta registrada")}
      onDelete={(id) => run(() => salesApi.remove(id), "Venta eliminada")}
    />;
  } else if (view === "products") {
    content = <CatalogPanel
      products={products}
      categories={availableCategories}
      editing={editing}
      onNew={() => setEditing(emptyProduct)}
      onSearch={searchProducts}
      searchType={searchType}
      setSearchType={setSearchType}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      onClearSearch={clearSearch}
      onEdit={setEditing}
      onDelete={removeProduct}
      onSave={saveProduct}
    />;
  } else {
    content = <OverviewPanel
      products={products}
      sales={sales}
      total={total}
      lowStockCount={lowStockCount}
      outOfStockCount={outOfStockCount}
      onViewInventoryAlerts={() => setView("inventoryAlerts")}
      onViewProducts={() => setView("products")}
      onEditProduct={setEditing}
      onDeleteProduct={removeProduct}
    />;
  }

  return <main className="app-shell">
    <DashboardSidebar session={session} view={view} onNavigate={navigate} onLogout={onLogout} inventoryAlertCount={inventoryAlertCount} />
    <section className="content">
      <DashboardHeader view={view} user={session.user} onRefresh={load} />
      <div className="admin-view" key={view}>{content}</div>
    </section>
    {notice && <div
      className={`admin-toast admin-toast-${notice.type}`}
      role={notice.type === "error" ? "alert" : "status"}
      aria-live={notice.type === "error" ? "assertive" : "polite"}
    >
      <span>{notice.message}</span>
      <button type="button" aria-label="Cerrar notificación" onClick={() => setNotice(null)}>×</button>
    </div>}
  </main>;
}

export default Dashboard;
