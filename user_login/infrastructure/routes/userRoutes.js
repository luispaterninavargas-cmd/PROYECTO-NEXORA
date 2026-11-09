import express from "express";

// ==============================
// CONTROLLER
// ==============================
import { UserController } from "../controllers/UserController.js";


// ==============================
// REPOSITORY
// ==============================
import { MongoUserRepository } from "../database/MongoUserRepository.js";


// ==============================
// APPLICATION SERVICES
// ==============================
import { RegisterUserService } from "../../application/services/RegisterUserService.js";

import { LoginUserService } from "../../application/services/LoginUserService.js";

import { GetUserByIdService } from "../../application/services/GetUserByIdService.js";

import { ForgotPasswordService } from "../../application/services/ForgotPasswordService.js";

import { ResetPasswordService } from "../../application/services/ResetPasswordService.js";


// ==============================
// AUTH MIDDLEWARE
// ==============================
import { verifyToken } from "../security/auth.js";
import { requireAdmin } from "../security/roleMiddleware.js";
import { AdminUsersService } from "../../application/services/AdminUsersService.js";


const router = express.Router();


// ==========================================
// CREAR REPOSITORIO
// ==========================================
const userRepository = new MongoUserRepository();


// ==========================================
// CREAR SERVICIOS
// ==========================================
const registerUserService =
  new RegisterUserService(userRepository);

const loginUserService =
  new LoginUserService(userRepository);

const getUserByIdService =
  new GetUserByIdService(userRepository);

const forgotPasswordService =
  new ForgotPasswordService(userRepository);

const resetPasswordService =
  new ResetPasswordService(userRepository);

const adminUsersService =
  new AdminUsersService(userRepository);

// ==========================================
// CREAR CONTROLLER
// ==========================================
const userController = new UserController(
  registerUserService,
  loginUserService,
  getUserByIdService,
  forgotPasswordService,
  resetPasswordService,
  adminUsersService
);


// ==========================================
// RUTAS PÚBLICAS
// ==========================================

// Registrar usuario
router.post(
  "/register",
  (req, res) => userController.register(req, res)
);


// Iniciar sesión
router.post(
  "/login",
  (req, res) => userController.login(req, res)
);


// Solicitar recuperación de contraseña
router.post(
  "/forgot-password",
  (req, res) => userController.forgotPassword(req, res)
);


// Restablecer contraseña
router.post(
  "/reset-password/:token",
  (req, res) => userController.resetPassword(req, res)
);


// ==========================================
// RUTAS PROTEGIDAS
// ==========================================

router.get(
  "/admin/users",
  verifyToken,
  requireAdmin,
  (req, res) => userController.listUsers(req, res)
);

router.patch(
  "/admin/users/:id/role",
  verifyToken,
  requireAdmin,
  (req, res) => userController.updateUserRole(req, res)
);

// Obtener usuario por ID
router.get(
  "/:id",
  verifyToken,
  (req, res) => userController.getUserById(req, res)
);


export default router;