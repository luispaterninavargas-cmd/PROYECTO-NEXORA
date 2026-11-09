export class UserController {
  constructor(
    registerUserService,
    loginUserService,
    getUserByIdService,
    forgotPasswordService,
    resetPasswordService,
    adminUsersService
  ) {
    this.registerUserService = registerUserService;
    this.loginUserService = loginUserService;
    this.getUserByIdService = getUserByIdService;
    this.forgotPasswordService = forgotPasswordService;
    this.resetPasswordService = resetPasswordService;
    this.adminUsersService = adminUsersService;
  }

  // ==============================
  // REGISTRAR USUARIO
  // ==============================
  async register(req, res) {
    try {
      const { nombre, email, password } = req.body;

      const result = await this.registerUserService.execute({
        nombre,
        email,
        password
      });

      return res.status(201).json(result);

    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "Error al registrar el usuario"
      });
    }
  }


  // ==============================
  // INICIAR SESIÓN
  // ==============================
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const result = await this.loginUserService.execute({
        email,
        password
      });

      return res.status(200).json(result);

    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "Error al iniciar sesión"
      });
    }
  }


  // ==============================
  // OBTENER USUARIO POR ID
  // ==============================
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      /*
       Verificamos que el usuario autenticado
       solamente pueda consultar su propia información.
      */
      if (req.user.userId !== id) {
        return res.status(403).json({
          message: "No tienes permiso para consultar este usuario"
        });
      }

      const result = await this.getUserByIdService.execute(id);

      return res.status(200).json(result);

    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "Error al obtener el usuario"
      });
    }
  }

  async listUsers(req, res) {
    try {
      const users = await this.adminUsersService.list();
      return res.status(200).json(users);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "Error al obtener los usuarios"
      });
    }
  }

  async updateUserRole(req, res) {
    try {
      const user = await this.adminUsersService.changeRole(
        req.params.id,
        req.body.role,
        req.user.userId
      );
      return res.status(200).json({
        message: "Rol actualizado correctamente. El usuario deberá iniciar sesión de nuevo para que el cambio aplique.",
        user
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "Error al actualizar el rol"
      });
    }
  }


  // ==============================
  // SOLICITAR RECUPERACIÓN
  // ==============================
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const result = await this.forgotPasswordService.execute(
        email
      );

      return res.status(200).json(result);

    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message:
          error.message ||
          "Error al solicitar recuperación de contraseña"
      });
    }
  }


  // ==============================
  // RESTABLECER CONTRASEÑA
  // ==============================
  async resetPassword(req, res) {
    try {
      const { token } = req.params;

      const { password } = req.body;

      const result = await this.resetPasswordService.execute(
        token,
        password
      );

      return res.status(200).json(result);

    } catch (error) {
      return res.status(error.statusCode || 500).json({
        message:
          error.message ||
          "Error al restablecer la contraseña"
      });
    }
  }
}