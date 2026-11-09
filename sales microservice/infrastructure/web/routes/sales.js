import express from "express";

import salesController
  from "./controllers/salesController.js";

import authMiddleware
  from "../middlewares/authMiddleware.js";

import adminMiddleware
  from "../middlewares/adminMiddleware.js";

const router = express.Router();

router.post(
  "/payments/mercadopago/webhook",
  salesController.mercadoPagoWebhook
);

router.get(
  "/payments/mercadopago/verify/:saleId",
  authMiddleware,
  salesController.verifyMercadoPagoPayment
);

router.post("/cart/checkout", authMiddleware, salesController.checkoutCart);
router.get("/cart", authMiddleware, salesController.getCart);
router.post("/cart/items", authMiddleware, salesController.addCartItem);
router.patch("/cart/items/:productId", authMiddleware, salesController.setCartQuantity);
router.delete("/cart/items/:productId", authMiddleware, salesController.removeCartItem);
router.delete("/cart", authMiddleware, salesController.clearCart);


// Las ventas manuales solo las registra el administrador. Los clientes deben
// completar Checkout Pro antes de que una compra pase a estado registrado.
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  salesController.create
);


// Usuario autenticado
router.get(
  "/mis-ventas",
  authMiddleware,
  salesController.getMySales
);


// Administrador
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  salesController.getAll
);

router.patch(
  "/:id/status",
  authMiddleware,
  adminMiddleware,
  salesController.updateOrderStatus
);


// Usuario propietario o administrador
router.get(
  "/:id",
  authMiddleware,
  salesController.getOne
);


// Administrador
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  salesController.update
);


// Administrador
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  salesController.delete
);

export default router;