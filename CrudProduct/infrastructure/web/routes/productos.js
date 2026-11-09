import express from "express";

import productController
    from "../controllers/productController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import adminMiddleware
    from "../middlewares/adminMiddleware.js";

import salesServiceMiddleware
    from "../middlewares/salesServiceMiddleware.js";

const router = express.Router();

router.post(
    "/internal/:id/stock",
    authMiddleware,
    salesServiceMiddleware,
    productController.adjustStock
);

// ==========================================
// RUTAS DE ADMINISTRADOR
// ==========================================

// Crear producto
router.post(
    "/",
    authMiddleware,
    adminMiddleware,
    productController.crearProducto
);

// Actualizar producto
router.put(
    "/:id",
    authMiddleware,
    adminMiddleware,
    productController.actualizarProducto
);

// Eliminar producto
router.delete(
    "/:id",
    authMiddleware,
    adminMiddleware,
    productController.eliminarProducto
);

// ==========================================
// RUTAS DE CONSULTA
// ==========================================

// Obtener todos
router.get(
    "/",
    productController.getAll
);

// Obtener por categoría
router.get(
    "/categoria/:categoria",
    productController.getByCategory
);

// Obtener por ID
router.get(
    "/:id",
    productController.getOne
);

export default router;