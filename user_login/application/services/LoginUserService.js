import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export class LoginUserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ email, password }) {
    if (!email || !password) {
      throw {
        statusCode: 400,
        message: "Email y contraseña son obligatorios"
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user =
      await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw {
        statusCode: 401,
        message: "Credenciales incorrectas"
      };
    }

    const passwordValid =
      await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      throw {
        statusCode: 401,
        message: "Credenciales incorrectas"
      };
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "24h"
      }
    );

    return {
      message: "Inicio de sesión exitoso",
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        role: user.role
      }
    };
  }
}