export class IUserRepository {
  async create(user) {
    throw new Error("Method not implemented");
  }

  async findByEmail(email) {
    throw new Error("Method not implemented");
  }

  async findById(id) {
    throw new Error("Method not implemented");
  }

  async findAllForAdministration() {
    throw new Error("Method not implemented");
  }

  async updateRole(id, role) {
    throw new Error("Method not implemented");
  }

  async countAdmins() {
    throw new Error("Method not implemented");
  }

  // Guardar token temporal de recuperación
  async updateResetPasswordToken(
    userId,
    resetPasswordToken,
    resetPasswordExpires
  ) {
    throw new Error("Method not implemented");
  }

  // Buscar usuario mediante token de recuperación
  async findByResetToken(resetPasswordToken) {
    throw new Error("Method not implemented");
  }

  // Actualizar contraseña y eliminar token
  async updatePassword(userId, password) {
    throw new Error("Method not implemented");
  }
}