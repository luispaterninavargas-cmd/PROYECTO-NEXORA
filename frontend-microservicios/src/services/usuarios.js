
import axios from "axios";

const API_URL = import.meta.env.DEV
  ? ""
  : (import.meta.env.VITE_USERS_API || "http://localhost:5300");

const usuariosAPI = axios.create({
  baseURL: API_URL,
});

// Registrar usuario
export const registrarUsuario = async (datos) => {
  const response = await usuariosAPI.post("/auth/register", datos);
  return response.data;
};

// Iniciar sesión
export const iniciarSesion = async (datos) => {
  const response = await usuariosAPI.post("/auth/login", datos);
  return response.data;
};

// Obtener usuario por ID
export const obtenerUsuario = async (id, token) => {
  const response = await usuariosAPI.get(`/api/users/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Solicitar recuperación de contraseña
export const solicitarRecuperacion = async (email) => {
  const response = await usuariosAPI.post(
    "/auth/forgot-password",
    { email }
  );

  return response.data;
};

// Restablecer contraseña
export const restablecerPassword = async (token, password) => {
  const response = await usuariosAPI.post(
    `/auth/reset-password/${token}`,
    { password }
  );

  return response.data;
};