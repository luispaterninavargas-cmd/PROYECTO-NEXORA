const API_URL = import.meta.env.DEV
  ? ""
  : (import.meta.env.VITE_API_URL || "http://localhost:5300").replace(/\/+$/, "");

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(`No se pudo conectar con el API Gateway${API_URL ? ` (${API_URL})` : ""}.`);
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      window.dispatchEvent(new Event("session-expired"));
    }
    const message = typeof data === "string"
      ? data.trim()
      : data?.message || data?.error;
    throw new Error(message || `No se pudo completar la solicitud (HTTP ${response.status})`);
  }
  return data;
}

const unwrap = (data, key) => data?.[key] ?? data;

export const productsApi = {
  list: async () => unwrap(await request("/productos"), "productos"),
  byId: async (id) => request(`/productos/${encodeURIComponent(id)}`),
  byCategory: async (category) => unwrap(await request(`/productos/categoria/${encodeURIComponent(category)}`), "productos"),
  create: async (body) => unwrap(await request("/productos", { method: "POST", body: JSON.stringify(body) }), "producto"),
  update: async (id, body) => unwrap(await request(`/productos/${id}`, { method: "PUT", body: JSON.stringify(body) }), "producto"),
  remove: (id) => request(`/productos/${id}`, { method: "DELETE" }),
};

export const usersApi = {
  list: async () => unwrap(await request("/users/admin/users"), "users"),
  updateRole: (id, role) => request(`/users/admin/users/${encodeURIComponent(id)}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  }),
};

export const recommendationsApi = {
  mine: (cartProductIds = []) => {
    const query = cartProductIds.length
      ? `?cartProductIds=${encodeURIComponent(cartProductIds.join(","))}`
      : "";
    return request(`/recommendations/me${query}`);
  },
  refresh: (actions, cartProductIds = []) => request("/recommendations/refresh", {
    method: "POST",
    body: JSON.stringify({ actions, cartProductIds }),
  }),
  events: (actions) => request("/recommendations/events", {
    method: "POST",
    body: JSON.stringify({ actions }),
  }),
};

export const salesApi = {
  list: async () => unwrap(await request("/sales"), "ventas"),
  getOne: (id) => request(`/sales/${encodeURIComponent(id)}`),
  verifyMercadoPagoPayment: (saleId) => request(
    `/sales/payments/mercadopago/verify/${encodeURIComponent(saleId)}`
  ),
  create: async (body) => request("/sales", { method: "POST", body: JSON.stringify(body) }),
  update: async (id, body) => request(`/sales/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  updateOrderStatus: (id, status) => request(`/sales/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }),
  remove: (id) => request(`/sales/${id}`, { method: "DELETE" }),
};

export const cartApi = {
  get: () => request("/sales/cart"),
  checkout: (productId) => request("/sales/cart/checkout", {
    method: "POST",
    ...(productId ? { body: JSON.stringify({ productId }) } : {}),
  }),
  add: (productId, quantity = 1) => request("/sales/cart/items", {
    method: "POST",
    body: JSON.stringify({ id_product: productId, quantity }),
  }),
  setQuantity: (productId, quantity) => request(
    `/sales/cart/items/${encodeURIComponent(productId)}`,
    { method: "PATCH", body: JSON.stringify({ quantity }) }
  ),
  remove: (productId) => request(
    `/sales/cart/items/${encodeURIComponent(productId)}`,
    { method: "DELETE" }
  ),
  clear: () => request("/sales/cart", { method: "DELETE" }),
};
