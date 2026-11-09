import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";
import { createHash } from "node:crypto";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Middleware de verificación JWT
const verificarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(403).json({
      message: "Token requerido",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token inválido o expirado",
    });
  }
};

// ================================
// USUARIOS
// ================================

// Registrar usuario
app.post("/auth/register", async (req, res) => {
  try {
    const response = await axios.post(
      `${process.env.USERS_SERVICE}/api/users/register`,
      req.body
    );

    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(
      error.response?.data || {
        message: "Error al registrar usuario desde Gateway",
      }
    );
  }
});

// Iniciar sesión
app.post("/auth/login", async (req, res) => {
  try {
    const response = await axios.post(
      `${process.env.USERS_SERVICE}/api/users/login`,
      req.body
    );

    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(
      error.response?.data || {
        message: "Error al iniciar sesión desde Gateway",
      }
    );
  }
});

// Recuperar contraseña
app.post("/auth/forgot-password", async (req, res) => {
  try {
    const response = await axios.post(
      `${process.env.USERS_SERVICE}/api/users/forgot-password`,
      req.body
    );

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(
      "Error en Gateway - recuperar contraseña:",
      error.message
    );

    res.status(error.response?.status || 500).json(
      error.response?.data || {
        message: "Error al solicitar recuperación de contraseña",
      }
    );
  }
});

// Restablecer contraseña
app.post("/auth/reset-password/:token", async (req, res) => {
  try {
    const response = await axios.post(
      `${process.env.USERS_SERVICE}/api/users/reset-password/${req.params.token}`,
      req.body
    );

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(
      "Error en Gateway - restablecer contraseña:",
      error.message
    );

    res.status(error.response?.status || 500).json(
      error.response?.data || {
        message: "Error al restablecer la contraseña",
      }
    );
  }
});

// ================================
// ADMINISTRACIÓN DE USUARIOS
// ================================

app.use("/users", verificarToken, async (req, res) => {
  if (req.usuario.role !== "admin") {
    return res.status(403).json({
      message: "Acceso prohibido. Se requieren permisos de administrador"
    });
  }

  try {
    const response = await axios({
      method: req.method,
      url: `${process.env.USERS_SERVICE}/api/users${req.path}`,
      data: req.body,
      params: req.query,
      headers: {
        Authorization: req.headers.authorization
      }
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    return res.status(error.response?.status || 500).json(
      error.response?.data || {
        message: "Error al administrar usuarios desde Gateway"
      }
    );
  }
});

// ================================
// PRODUCTOS
// ================================

app.use("/productos", verificarToken, async (req, res) => {
  try {
    const destino = `${process.env.PRODUCTS_SERVICE}/api/productos${req.path}`;

    console.log(`Reenviando a: ${destino}`);

    const response = await axios({
      method: req.method,
      url: destino,
      data: req.body,
      headers: {
        Authorization: req.headers["authorization"],
      },
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(
      "Error en Gateway productos:",
      error.message
    );

    res.status(error.response?.status || 500).json(
      error.response?.data || {
        message: "Error en gateway productos",
      }
    );
  }
});

// ================================
// RECOMENDACIONES
// ================================

app.use("/recommendations", verificarToken, async (req, res) => {
  try {
    const destino = `${(process.env.RECOMMENDATIONS_SERVICE || "http://localhost:5201").replace(/\/+$/, "")}/api/recommendations${req.path}`;
    const response = await axios({
      method: req.method,
      url: destino,
      data: req.body,
      params: req.query,
      headers: {
        Authorization: req.headers.authorization
      }
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error en Gateway recomendaciones:", error.message);
    return res.status(error.response?.status || 500).json(
      error.response?.data || {
        message: "Error en gateway de recomendaciones"
      }
    );
  }
});


// ================================
// VENTAS
// ================================

app.post("/sales/payments/mercadopago/webhook", async (req, res) => {
  try {
    const response = await axios.post(
      `${process.env.SALES_SERVICE}/sales/payments/mercadopago/webhook`,
      req.body,
      {
        params: req.query,
        headers: {
          "x-signature": req.headers["x-signature"],
          "x-request-id": req.headers["x-request-id"]
        }
      }
    );
    return res.status(response.status).json(response.data);
  } catch (error) {
    const upstreamMessage = error.response?.data?.message;
    console.error("[GATEWAY] Error reenviando notificación de Mercado Pago:", {
      requestId: req.get("x-request-id") || null,
      resourceId: req.query["data.id"] || req.body?.data?.id || null,
      signatureFingerprint: req.get("x-signature")
        ? createHash("sha256").update(req.get("x-signature")).digest("hex").slice(0, 16)
        : null,
      upstreamStatus: error.response?.status || null,
      upstreamMessage: typeof upstreamMessage === "string"
        ? upstreamMessage
        : error.code || error.message
    });
    return res.status(error.response?.status || 500).json(
      error.response?.data || { message: "No fue posible reenviar la notificación de pago." }
    );
  }
});

app.use("/sales", verificarToken, async (req, res) => {

  try {

    const destino =
      `${process.env.SALES_SERVICE}/sales${req.path}`;

    console.log(
      `Reenviando ventas a: ${destino}`
    );

    const response = await axios({
      method: req.method,
      url: destino,
      data: req.body,
      params: req.query,
      headers: {
        Authorization: req.headers.authorization
      }
    });

    return res
      .status(response.status)
      .json(response.data);

  } catch (error) {

    const upstreamMessage = error.response?.data?.message;
    console.error(
      "Error en Gateway ventas:",
      {
        status: error.response?.status || null,
        message: typeof upstreamMessage === "string"
          ? upstreamMessage
          : error.code || error.message
      }
    );

    return res
      .status(error.response?.status || 500)
      .json(
        error.response?.data || {
          message: "Error en gateway de ventas"
        }
      );
  }
});

// ================================
// RUTA BASE
// ================================

app.get("/", (req, res) => {
  res.send("API Gateway activo en puerto 5300");
});

// ================================
// SERVIDOR
// ================================

app.listen(process.env.PORT, () => {
  console.log(
    `API Gateway corriendo en http://localhost:${process.env.PORT}`
  );
});