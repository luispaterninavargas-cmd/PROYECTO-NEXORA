import mongoose from "mongoose";

export class AdminUsersService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async list() {
    return this.userRepository.findAllForAdministration();
  }

  async changeRole(id, role, actorId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("ID de usuario inválido");
      error.statusCode = 400;
      throw error;
    }

    if (!["user", "admin"].includes(role)) {
      const error = new Error("El rol debe ser user o admin");
      error.statusCode = 400;
      throw error;
    }

    if (String(id) === String(actorId) && role !== "admin") {
      const error = new Error("No puedes quitarte a ti mismo el rol de administrador");
      error.statusCode = 400;
      throw error;
    }

    const currentUser = await this.userRepository.findById(id);
    if (!currentUser) {
      const error = new Error("Usuario no encontrado");
      error.statusCode = 404;
      throw error;
    }

    if (currentUser.role === "admin" && role !== "admin") {
      const adminCount = await this.userRepository.countAdmins();
      if (adminCount <= 1) {
        const error = new Error("No se puede quitar el rol al único administrador");
        error.statusCode = 409;
        throw error;
      }
    }

    return this.userRepository.updateRole(id, role);
  }
}
