import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import "./infrastructure/config/dbClient.js";

import productRoutes
    from "./infrastructure/web/routes/productos.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5101;

app.use(cors());

app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({
        service: "microservicio-productos",
        status: "OK"
    });
});

app.use(
    "/api/productos",
    productRoutes
);

app.use((req, res) => {
    res.status(404).json({
        message: "Ruta no encontrada"
    });
});

app.use((err, req, res, next) => {

    console.error(err);

    res.status(500).json({
        message: "Error interno del servidor"
    });
});

app.listen(PORT, () => {

    console.log(
        `Microservicio de Productos ejecutándose en http://localhost:${PORT}`
    );

});