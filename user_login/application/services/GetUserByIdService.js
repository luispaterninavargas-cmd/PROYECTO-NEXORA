import mongoose from "mongoose";

export class GetUserByIdService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("ID de usuario inválido");
      error.code = "INVALID_USER_ID";
      throw error;
    }

    const user = await this.userRepository.findById(id);

    if (!user) {
      const error = new Error("Usuario no encontrado");
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    return user;
  }
}