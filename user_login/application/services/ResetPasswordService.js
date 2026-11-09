import crypto from "crypto";
import bcrypt from "bcryptjs";

export class ResetPasswordService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(token, password) {
    if (!token) {
      throw {
        statusCode: 400,
        message: "El token de recuperación es obligatorio"
      };
    }

    if (!password) {
      throw {
        statusCode: 400,
        message: "La nueva contraseña es obligatoria"
      };
    }

    if (password.length < 6) {
      throw {
        statusCode: 400,
        message:
          "La contraseña debe tener al menos 6 caracteres"
      };
    }

    // Crear hash del token recibido
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Buscar usuario con token válido
    const user = await this.userRepository.findByResetToken(
      hashedToken
    );

    if (!user) {
      throw {
        statusCode: 400,
        message:
          "El token de recuperación es inválido o ha expirado"
      };
    }

    // Generar hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Actualizar contraseña y eliminar token
    await this.userRepository.updatePassword(
      user._id.toString(),
      hashedPassword
    );

    return {
      message: "Contraseña actualizada correctamente"
    };
  }
}