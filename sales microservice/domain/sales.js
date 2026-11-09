import express from "express";

import salesController from "./controllers/salesController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import adminMiddleware
    from "../middlewares/adminMiddleware.js";

const router = express.Router();


// ==========================================
// RUTAS DE ADMINISTRADOR
// ==========================================

// Crear venta
router.post(
    "/",
    authMiddleware,
    adminMiddleware,
    salesController.create
);

// Actualizar venta
router.put(
    "/:id",
    authMiddleware,
    adminMiddleware,
    salesController.update
);

// Eliminar venta
router.delete(
    "/:id",
    authMiddleware,
    adminMiddleware,
    salesController.delete
);


// ==========================================
// RUTAS DE CONSULTA
// ==========================================

// Obtener todas las ventas
router.get(
    "/",
    salesController.getAll
);

// Obtener una venta
router.get(
    "/:id",
    salesController.getOnline
);

export default router;