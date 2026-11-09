import crypto from "crypto";

export class ForgotPasswordService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(email) {
    if (!email) {
      throw {
        statusCode: 400,
        message: "El email es obligatorio"
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.userRepository.findByEmail(
      normalizedEmail
    );

    /*
      Por seguridad no revelamos si el correo existe o no.
    */
    if (!user) {
      return {
        message:
          "Si el correo está registrado, recibirá instrucciones para recuperar su contraseña"
      };
    }

    // Generar token seguro
    const resetToken = crypto
      .randomBytes(32)
      .toString("hex");

    // Generar hash del token
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Token válido durante 15 minutos
    const resetPasswordExpires = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await this.userRepository.updateResetPasswordToken(
      user._id.toString(),
      hashedToken,
      resetPasswordExpires
    );

    return {
      message:
        "Si el correo está registrado, recibirá instrucciones para recuperar su contraseña",

      /*
        SOLO PARA DESARROLLO Y PRUEBAS EN POSTMAN.

        Cuando implementemos el frontend y el correo,
        este token NO debe enviarse en la respuesta.
      */
      resetToken
    };
  }
}