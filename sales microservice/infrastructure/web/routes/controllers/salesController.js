import salesService from "../../../../application/salesService.js";
import { createHash } from "node:crypto";

function signatureFingerprint(value) {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

class SalesController {

  async getCart(req, res) {
    try {
      return res.status(200).json(
        await salesService.getCart(req.user, req.headers.authorization)
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async addCartItem(req, res) {
    try {
      return res.status(200).json(
        await salesService.addCartItem(
          req.user,
          req.headers.authorization,
          req.body.id_product,
          req.body.quantity
        )
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async setCartQuantity(req, res) {
    try {
      return res.status(200).json(
        await salesService.setCartQuantity(
          req.user,
          req.headers.authorization,
          req.params.productId,
          req.body.quantity
        )
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async removeCartItem(req, res) {
    try {
      return res.status(200).json(
        await salesService.removeCartItem(
          req.user,
          req.headers.authorization,
          req.params.productId
        )
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async clearCart(req, res) {
    try {
      await salesService.clearCart(req.user);
      return res.status(200).json({ message: "Carrito vaciado correctamente." });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async checkoutCart(req, res) {
    try {
      const result = await salesService.createPaymentPreference(
        req.user,
        req.headers.authorization,
        req.body?.productId
      );
      return res.status(201).json({
        message: "Orden de prueba creada. Completa el pago en Mercado Pago.",
        sale: result.sale,
        checkoutUrl: result.checkoutUrl
      });
    } catch (error) {
      if (!error.statusCode || error.statusCode >= 500) {
        console.error("Error iniciando pago de prueba:", error.message);
      }
      return res.status(error.statusCode || 500).json({ message: error.message || "No fue posible iniciar el pago de prueba." });
    }
  }

  async verifyMercadoPagoPayment(req, res) {
    try {
      const result = await salesService.verifyMercadoPagoPayment(
        req.user,
        req.params.saleId
      );
      return res.status(200).json(result);
    } catch (error) {
      if (!error.statusCode || error.statusCode >= 500) {
        console.error("Error verificando pago de Mercado Pago:", error.message);
      }
      return res.status(error.statusCode || 500).json({
        message: error.message || "No fue posible verificar el pago."
      });
    }
  }

  async mercadoPagoWebhook(req, res) {
    try {
      await salesService.processMercadoPagoWebhook(req);
      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("[VENTAS] Notificación de Mercado Pago rechazada:", {
        requestId: req.get("x-request-id") || null,
        resourceId: req.query["data.id"] || req.body?.data?.id || null,
        signatureFingerprint: signatureFingerprint(req.get("x-signature")),
        action: req.body?.action || null,
        httpStatus: error.statusCode || 500,
        upstreamStatus: error.upstreamStatus || null,
        reason: error.upstreamMessage || error.message || "Error desconocido"
      });
      return res.status(error.statusCode || 500).json({
        message: error.message || "No fue posible procesar la notificación de pago."
      });
    }
  }

  async create(req, res) {
    try {

      const {
        id_product,
        fecha,
        total
      } = req.body;

      const id_users = req.user.userId;

      if (!id_product || total === undefined) {
        return res.status(400).json({
          message: "id_product y total son obligatorios"
        });
      }

      const sale = {
        id_users,
        id_product,
        fecha: fecha || new Date(),
        total
      };

      const data = await salesService.create(sale);

      return res.status(201).json(data);

    } catch (error) {

      console.error("Error creando venta:", error);

      return res.status(500).json({
        message: "Error al crear la venta"
      });
    }
  }

  async getAll(req, res) {
    try {

      const data = await salesService.getAll();

      return res.status(200).json(data);

    } catch (error) {

      console.error("Error obteniendo ventas:", error);

      return res.status(500).json({
        message: "Error al obtener las ventas"
      });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const order = await salesService.updateOrderStatus(
        req.params.id,
        req.body?.status
      );
      return res.status(200).json({
        message: "Estado del pedido actualizado correctamente.",
        order
      });
    } catch (error) {
      if (!error.statusCode || error.statusCode >= 500) {
        console.error("Error actualizando estado del pedido:", error);
      }
      return res.status(error.statusCode || 500).json({
        message: error.message || "Error al actualizar el pedido."
      });
    }
  }

  async getMySales(req, res) {
    try {

      const data =
        await salesService.getByUserId(req.user.userId);

      return res.status(200).json(data);

    } catch (error) {

      console.error("Error obteniendo mis ventas:", error);

      return res.status(500).json({
        message: "Error al obtener tus ventas"
      });
    }
  }

  async getOne(req, res) {
    try {

      const { id } = req.params;

      const sale = await salesService.getOne(id);

      if (!sale) {
        return res.status(404).json({
          message: "Venta no encontrada"
        });
      }

      if (req.user.role === "admin") {
        return res.status(200).json(sale);
      }

      if (sale.id_users !== req.user.userId) {
        return res.status(403).json({
          message: "No tienes permiso para consultar esta venta"
        });
      }

      return res.status(200).json(sale);

    } catch (error) {

      console.error("Error obteniendo venta:", error);

      return res.status(500).json({
        message: "Error al obtener la venta"
      });
    }
  }

  async update(req, res) {
    try {

      const { id } = req.params;

      const result =
        await salesService.update(id, req.body);

      if (!result) {
        return res.status(400).json({
          message: "ID de venta inválido"
        });
      }

      if (result.matchedCount === 0) {
        return res.status(404).json({
          message: "Venta no encontrada"
        });
      }

      return res.status(200).json({
        message: "Venta actualizada correctamente"
      });

    } catch (error) {

      console.error("Error actualizando venta:", error);

      return res.status(500).json({
        message: "Error al actualizar la venta"
      });
    }
  }

  async delete(req, res) {
    try {

      const { id } = req.params;

      const result =
        await salesService.delete(id);

      if (!result) {
        return res.status(400).json({
          message: "ID de venta inválido"
        });
      }

      if (result.deletedCount === 0) {
        return res.status(404).json({
          message: "Venta no encontrada"
        });
      }

      return res.status(200).json({
        message: "Venta eliminada correctamente"
      });

    } catch (error) {

      console.error("Error eliminando venta:", error);

      return res.status(500).json({
        message: "Error al eliminar la venta"
      });
    }
  }
}

export default new SalesController();