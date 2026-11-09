import bcrypt from "bcryptjs";

export class RegisterUserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ nombre, email, password }) {
    if (!nombre || !email || !password) {
      throw {
        statusCode: 400,
        message: "Nombre, email y contraseña son obligatorios"
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser =
      await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw {
        statusCode: 409,
        message: "El correo electrónico ya está registrado"
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.userRepository.create({
      nombre: nombre.trim(),
      email: normalizedEmail,
      password: hashedPassword,

      // Todo registro público es usuario normal
      role: "user"
    });

    return {
      message: "Usuario registrado correctamente",
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        role: user.role
      }
    };
  }
}