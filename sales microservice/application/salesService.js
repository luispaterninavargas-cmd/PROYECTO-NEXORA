import salesRepository from "../infrastructure/models/salesRepository.js";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { verifyMercadoPagoWebhook } from "../infrastructure/payments/mercadoPagoWebhook.js";
import { notifyRecommendationPurchase } from "../infrastructure/web/recommendationClient.js";

class SalesService {
  getUserId(user) {
    const userId = user?.userId || user?.id || user?._id;
    if (!userId) {
      const error = new Error("El token no identifica al usuario.");
      error.statusCode = 401;
      throw error;
    }
    return String(userId);
  }

  validateProductId(productId) {
    const id = String(productId || "");
    if (!ObjectId.isValid(id)) {
      const error = new Error("El identificador del producto no es válido.");
      error.statusCode = 400;
      throw error;
    }
    return id;
  }

  validateQuantity(quantity) {
    const parsed = Number(quantity);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99) {
      const error = new Error("La cantidad debe ser un número entero entre 1 y 99.");
      error.statusCode = 400;
      throw error;
    }
    return parsed;
  }

  productServiceUrl() {
    const configuredUrl = (
      process.env.PRODUCTS_SERVICE || "http://localhost:5101"
    ).replace(/\/+$/, "");

    return configuredUrl.endsWith("/api/productos")
      ? configuredUrl
      : `${configuredUrl}/api/productos`;
  }

  async getProduct(productId, authorization) {
    const response = await fetch(`${this.productServiceUrl()}/${encodeURIComponent(productId)}`, {
      headers: { Authorization: authorization }
    });
    const product = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(product?.message || "No fue posible consultar el producto.");
      error.statusCode = response.status;
      throw error;
    }
    return product;
  }

  async getCart(user, authorization) {
    const userId = this.getUserId(user);
    const storedItems = await salesRepository.getCart(userId);
    const items = await Promise.all(storedItems.map(async (item) => {
      const product = await this.getProduct(item.id_product, authorization);
      const price = Number(product.precio ?? product.price);
      if (!Number.isFinite(price) || price < 0) {
        const error = new Error(`El precio del producto ${item.id_product} no es válido.`);
        error.statusCode = 409;
        throw error;
      }
      return {
        id_product: item.id_product,
        quantity: item.quantity,
        product,
        subtotal: price * item.quantity
      };
    }));
    return {
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      total: items.reduce((sum, item) => sum + item.subtotal, 0)
    };
  }

  async addCartItem(user, authorization, productId, quantity = 1) {
    const userId = this.getUserId(user);
    const id = this.validateProductId(productId);
    const amount = this.validateQuantity(quantity);
    const product = await this.getProduct(id, authorization);
    const stock = Number(product.stock);
    const currentItems = await salesRepository.getCart(userId);
    const currentQuantity = currentItems.find((item) => item.id_product === id)?.quantity || 0;
    if (!Number.isFinite(stock) || currentQuantity + amount > stock) {
      const error = new Error(`Solo hay ${Number.isFinite(stock) ? stock : 0} unidades disponibles.`);
      error.statusCode = 409;
      throw error;
    }
    if (currentQuantity + amount > 99) {
      const error = new Error("No puedes agregar más de 99 unidades del mismo producto.");
      error.statusCode = 400;
      throw error;
    }
    await salesRepository.addCartItem(userId, id, amount);
    return this.getCart(user, authorization);
  }

  async setCartQuantity(user, authorization, productId, quantity) {
    const userId = this.getUserId(user);
    const id = this.validateProductId(productId);
    const amount = this.validateQuantity(quantity);
    const product = await this.getProduct(id, authorization);
    if (amount > Number(product.stock)) {
      const error = new Error(`Solo hay ${Number(product.stock) || 0} unidades disponibles.`);
      error.statusCode = 409;
      throw error;
    }
    const updated = await salesRepository.setCartQuantity(userId, id, amount);
    if (!updated) {
      const error = new Error("El producto no está en el carrito.");
      error.statusCode = 404;
      throw error;
    }
    return this.getCart(user, authorization);
  }

  async removeCartItem(user, authorization, productId) {
    const userId = this.getUserId(user);
    const id = this.validateProductId(productId);
    await salesRepository.removeCartItem(userId, id);
    return this.getCart(user, authorization);
  }

  async clearCart(user) {
    return salesRepository.clearCart(this.getUserId(user));
  }

  async adjustProductStock(productId, quantity, operation) {
    const token = jwt.sign(
      { role: "sales-service" },
      process.env.JWT_SECRET,
      { expiresIn: "1m" }
    );
    const response = await fetch(
      `${this.productServiceUrl()}/internal/${encodeURIComponent(productId)}/stock`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ quantity, operation })
      }
    );
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(result?.message || "No fue posible actualizar el inventario.");
      error.statusCode = response.status;
      throw error;
    }
  }

  mercadoPagoClient() {
    if (process.env.MP_ENVIRONMENT !== "sandbox") {
      const error = new Error("Mercado Pago debe configurarse explícitamente en modo sandbox.");
      error.statusCode = 503;
      throw error;
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken || process.env.MP_CREDENTIALS_TYPE !== "test") {
      const error = new Error(
        "Configura el Access Token de prueba del vendedor desde Pruebas > Credenciales de prueba y establece MP_CREDENTIALS_TYPE=test."
      );
      error.statusCode = 503;
      throw error;
    }

    return new MercadoPagoConfig({ accessToken });
  }

  // Mercado Pago puede devolver live_mode:true en pagos entre usuarios de prueba.
  // live_mode:false siempre es válido. live_mode:true solo se acepta si el
  // desarrollador lo habilita explícitamente Y vendedor y comprador son
  // exactamente los usuarios de prueba configurados.
  isTrustedTestPayment(payment) {
    if (payment.live_mode === false) return true;
    if (payment.live_mode !== true) return false;

    const sellerId = String(process.env.MP_ACCESS_TOKEN || "").split("-").pop();
    const buyerId = String(process.env.MP_TEST_BUYER_ID || "");
    return process.env.MP_ENVIRONMENT === "sandbox"
      && process.env.MP_CREDENTIALS_TYPE === "test"
      && process.env.MP_ALLOW_TEST_USER_LIVE_MODE === "true"
      && /^\d+$/.test(sellerId)
      && /^\d+$/.test(buyerId)
      && String(payment.collector_id ?? payment.collector?.id ?? "") === sellerId
      && String(payment.payer?.id ?? "") === buyerId;
  }

  paymentNotificationUrl() {
    const value = process.env.PAYMENT_NOTIFICATION_URL;
    let notificationUrl;
    try {
      notificationUrl = new URL(value);
    } catch {
      const error = new Error("Configura PAYMENT_NOTIFICATION_URL con la URL HTTPS pública del webhook.");
      error.statusCode = 503;
      throw error;
    }
    if (notificationUrl.protocol !== "https:") {
      const error = new Error("PAYMENT_NOTIFICATION_URL debe usar HTTPS.");
      error.statusCode = 503;
      throw error;
    }
    return notificationUrl.toString();
  }

  webhookPaymentId(request) {
    return verifyMercadoPagoWebhook(request, process.env.MP_WEBHOOK_SECRET);
  }

  async createPaymentPreference(user, authorization, productId) {
    const userId = this.getUserId(user);
    const client = this.mercadoPagoClient();
    const notificationUrl = this.paymentNotificationUrl();
    const frontendUrl = new URL(process.env.FRONTEND_URL || "http://localhost:5173");
    const cartItems = productId
      ? [{ id_product: this.validateProductId(productId), quantity: 1 }]
      : await salesRepository.getCart(userId);
    if (cartItems.length === 0) {
      const error = new Error("El carrito está vacío.");
      error.statusCode = 400;
      throw error;
    }

    const items = await Promise.all(cartItems.map(async (item) => {
      const product = await this.getProduct(item.id_product, authorization);
      const price = Number(product.precio ?? product.price);
      if (!Number.isFinite(price) || price <= 0) {
        const error = new Error(`El precio del producto ${item.id_product} no es válido para un pago.`);
        error.statusCode = 409;
        throw error;
      }
      return {
        id_product: item.id_product,
        quantity: this.validateQuantity(item.quantity),
        unit_price: price,
        subtotal: price * item.quantity,
        product_name: product.nombre || product.name || "Producto",
        category: product.categoria || product.category || ""
      };
    }));

    const reservedItems = [];
    let sale;
    try {
      for (const item of items) {
        await this.adjustProductStock(item.id_product, item.quantity, "reserve");
        reservedItems.push(item);
      }

      sale = await salesRepository.create({
        id_users: userId,
        id_product: items[0].id_product,
        items,
        fecha: new Date(),
        total: items.reduce((sum, item) => sum + item.subtotal, 0),
        status: "payment_pending",
        payment: {
          provider: "mercadopago",
          status: "pending"
        }
      });

      const returnUrl = new URL(frontendUrl);
      returnUrl.searchParams.set("payment", "return");
      returnUrl.searchParams.set("sale_id", String(sale._id));
      const preferenceBody = {
        items: items.map((item) => ({
          id: item.id_product,
          title: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency_id: "COP"
        })),
        external_reference: String(sale._id),
        metadata: { sale_id: String(sale._id), environment: "sandbox" },
        notification_url: notificationUrl,
        back_urls: {
          success: returnUrl.toString(),
          failure: returnUrl.toString(),
          pending: returnUrl.toString()
        }
      };

      if (returnUrl.protocol === "https:") {
        preferenceBody.auto_return = "approved";
      }

      const preference = await new Preference(client).create({
        body: preferenceBody
      });

      if (!preference.sandbox_init_point || !preference.id) {
        const error = new Error("Mercado Pago no devolvió un enlace de pago de prueba válido.");
        error.statusCode = 502;
        throw error;
      }

      const savedPreference = await salesRepository.savePaymentPreference(
        String(sale._id),
        preference.id
      );
      if (!savedPreference?.modifiedCount) {
        const error = new Error("No fue posible guardar la preferencia de pago.");
        error.statusCode = 500;
        throw error;
      }

      if (!productId) {
        await salesRepository.clearCart(userId);
      }

      sale = await salesRepository.getOne(String(sale._id));
      return { sale, checkoutUrl: preference.sandbox_init_point };
    } catch (error) {
      if (sale) {
        try {
          await salesRepository.delete(String(sale._id));
        } catch {
          const cleanupError = new Error("No se pudo cancelar la orden de prueba después del error al iniciar el pago.");
          cleanupError.statusCode = 500;
          throw cleanupError;
        }
      }

      const restoreErrors = [];
      for (const item of reservedItems.reverse()) {
        try {
          await this.adjustProductStock(item.id_product, item.quantity, "restore");
        } catch (restoreError) {
          restoreErrors.push(restoreError);
        }
      }
      if (restoreErrors.length > 0) {
        const rollbackError = new Error("No se pudo restaurar todo el inventario tras fallar la creación del pago.");
        rollbackError.statusCode = 500;
        throw rollbackError;
      }
      throw error;
    }
  }

  async processMercadoPagoWebhook(request) {
    const paymentId = this.webhookPaymentId(request);
    let payment;
    try {
      payment = await new Payment(this.mercadoPagoClient()).get({ id: paymentId });
    } catch (cause) {
      const upstreamStatus = Number(cause?.status);
      const error = new Error(
        `No fue posible consultar el pago en Mercado Pago${Number.isInteger(upstreamStatus) && upstreamStatus > 0 ? ` (API HTTP ${upstreamStatus})` : ""}.`
      );
      error.statusCode = 502;
      error.upstreamStatus = Number.isInteger(upstreamStatus) && upstreamStatus > 0
        ? upstreamStatus
        : null;
      error.upstreamMessage = cause?.message || String(cause);
      throw error;
    }
    return this.applyMercadoPagoPayment(payment);
  }

  async verifyMercadoPagoPayment(user, saleId) {
    const userId = this.getUserId(user);
    const sale = await salesRepository.getOne(saleId);
    if (!sale || sale.payment?.provider !== "mercadopago") {
      const error = new Error("No se encontró la orden de Mercado Pago.");
      error.statusCode = 404;
      throw error;
    }
    if (String(sale.id_users) !== userId && user?.role !== "admin") {
      const error = new Error("No tienes permiso para consultar esta orden.");
      error.statusCode = 403;
      throw error;
    }
    if (sale.payment.status === "approved") {
      return { status: "approved" };
    }
    if (sale.payment.status === "rejected" || sale.payment.status === "cancelled") {
      return { status: sale.payment.status };
    }

    let search;
    try {
      search = await new Payment(this.mercadoPagoClient()).search({
        options: {
          external_reference: String(sale._id),
          sort: "date_created",
          criteria: "desc",
          limit: 20
        }
      });
    } catch (cause) {
      const upstreamStatus = Number(cause?.status);
      const error = new Error(
        `No fue posible consultar los pagos en Mercado Pago${Number.isInteger(upstreamStatus) && upstreamStatus > 0 ? ` (API HTTP ${upstreamStatus})` : ""}.`
      );
      error.statusCode = 502;
      error.upstreamStatus = Number.isInteger(upstreamStatus) && upstreamStatus > 0
        ? upstreamStatus
        : null;
      error.upstreamMessage = cause?.message || String(cause);
      throw error;
    }

    const matchingPayments = (search.results || []).filter((payment) =>
      String(payment.external_reference || "") === String(sale._id)
      && Number(payment.transaction_amount) === Number(sale.total)
      && payment.currency_id === "COP"
    );
    const matchingPayment = matchingPayments.find((payment) => this.isTrustedTestPayment(payment));
    if (!matchingPayment?.id) {
      if (matchingPayments.some((payment) => payment.live_mode === true)) {
        const error = new Error(
          "Mercado Pago solo encontró pagos de producción para esta referencia. El pedido no se modificó."
        );
        error.statusCode = 409;
        throw error;
      }
      return { status: "pending" };
    }

    let payment;
    try {
      payment = await new Payment(this.mercadoPagoClient()).get({
        id: matchingPayment.id
      });
    } catch (cause) {
      const upstreamStatus = Number(cause?.status);
      const error = new Error(
        `No fue posible verificar el pago en Mercado Pago${Number.isInteger(upstreamStatus) && upstreamStatus > 0 ? ` (API HTTP ${upstreamStatus})` : ""}.`
      );
      error.statusCode = 502;
      error.upstreamStatus = Number.isInteger(upstreamStatus) && upstreamStatus > 0
        ? upstreamStatus
        : null;
      error.upstreamMessage = cause?.message || String(cause);
      throw error;
    }

    const result = await this.applyMercadoPagoPayment(payment);
    return { status: result.status };
  }

  async applyMercadoPagoPayment(payment) {
    if (!this.isTrustedTestPayment(payment)) {
      const error = new Error(
        "Mercado Pago encontró un pago de producción, pero esta tienda solo acepta pagos de prueba. El pedido no se modificó."
      );
      error.statusCode = 409;
      throw error;
    }

    const saleId = String(payment.external_reference || "");
    const sale = await salesRepository.getOne(saleId);
    if (!sale || sale.payment?.provider !== "mercadopago") {
      const error = new Error("No se encontró la orden asociada al pago.");
      error.statusCode = 404;
      throw error;
    }
    if (payment.currency_id !== "COP" || Math.abs(Number(payment.transaction_amount) - Number(sale.total)) > 0.01) {
      const error = new Error("El valor o la moneda del pago no coincide con la orden.");
      error.statusCode = 409;
      throw error;
    }

    if (!["approved", "rejected", "cancelled"].includes(payment.status)) {
      return { received: true, status: payment.status };
    }

    const paymentUpdate = {
      provider: "mercadopago",
      status: payment.status,
      paymentId: String(payment.id),
      updatedAt: new Date()
    };
    const orderStatus = payment.status === "approved" ? "registered" : "payment_failed";
    const updated = await salesRepository.updatePendingPayment(saleId, paymentUpdate, orderStatus);

    if (!updated?.modifiedCount) {
      const currentSale = await salesRepository.getOne(saleId);
      if (currentSale?.payment?.paymentId === String(payment.id) && currentSale.payment.status === payment.status) {
        return { received: true, status: payment.status };
      }
      if (currentSale?.payment?.status === "approved") {
        return { received: true, status: "approved" };
      }
      const error = new Error("El pago ya fue procesado con un estado diferente.");
      error.statusCode = 409;
      throw error;
    }

    if (payment.status !== "approved") {
      for (const item of sale.items || []) {
        await this.adjustProductStock(item.id_product, item.quantity, "restore");
      }
    } else {
      try {
        await notifyRecommendationPurchase(sale);
      } catch (error) {
        console.warn("[VENTAS] No fue posible registrar la compra en recomendaciones:", {
          saleId,
          reason: error.message
        });
      }
    }

    return { received: true, status: payment.status };
  }

  async checkoutCart(user, authorization, productId) {
    return this.createPaymentPreference(user, authorization, productId);
  }

  async create(data) {
    return await salesRepository.create(data);
  }

  async getAll() {
    return await salesRepository.getAll();
  }

  async updateOrderStatus(id, nextStatus) {
    if (!ObjectId.isValid(id)) {
      const error = new Error("ID de pedido inválido.");
      error.statusCode = 400;
      throw error;
    }

    const allowedTransitions = {
      registered: "preparing",
      preparing: "shipped",
      shipped: "delivered"
    };
    if (!Object.hasOwn(allowedTransitions, nextStatus)) {
      const error = new Error("Estado de pedido no válido.");
      error.statusCode = 400;
      throw error;
    }

    const order = await salesRepository.getOne(id);
    if (!order) {
      const error = new Error("Pedido no encontrado.");
      error.statusCode = 404;
      throw error;
    }

    const currentStatus = order.status ?? "registered";
    if (allowedTransitions[currentStatus] !== nextStatus) {
      const error = new Error(
        currentStatus === nextStatus
          ? "El pedido ya tiene ese estado."
          : "El pedido solo puede avanzar al siguiente estado."
      );
      error.statusCode = 409;
      throw error;
    }

    const result = await salesRepository.updateOrderStatus(
      id,
      order.status,
      nextStatus
    );
    if (!result?.matchedCount) {
      const error = new Error("El pedido cambió mientras lo actualizabas. Actualiza la lista e inténtalo de nuevo.");
      error.statusCode = 409;
      throw error;
    }

    return {
      ...order,
      status: nextStatus,
      updatedAt: new Date()
    };
  }

  async getByUserId(userId) {
    return await salesRepository.getByUserId(userId);
  }

  async getOne(id) {
    return await salesRepository.getOne(id);
  }

  async update(id, data) {
    return await salesRepository.update(id, data);
  }

  async delete(id) {
    return await salesRepository.delete(id);
  }
}

export default new SalesService();