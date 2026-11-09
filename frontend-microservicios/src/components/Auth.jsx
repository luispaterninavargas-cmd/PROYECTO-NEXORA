import { useState } from "react";
import {
  iniciarSesion,
  registrarUsuario,
  solicitarRecuperacion,
  restablecerPassword,
} from "../services/usuarios";
import {
  AuthModeSwitch,
  AuthWelcomePanel,
  LoginForm,
  RecoveryForms,
  RegistrationForm,
} from "./AuthForms";

function responseMessage(error, fallback) {
  return error.response?.data?.message
    || error.response?.data?.error
    || fallback;
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const clearMessage = () => {
    setMessage("");
    setMessageType("");
  };

  const clearCredentials = () => {
    setName("");
    setEmail("");
    setPassword("");
  };

  const switchMode = () => {
    setMode((currentMode) => currentMode === "login" ? "registro" : "login");
    clearMessage();
    clearCredentials();
  };

  const showRecovery = () => {
    setMode("recuperar");
    clearMessage();
    clearCredentials();
    setResetToken("");
    setNewPassword("");
  };

  const returnToLogin = () => {
    setMode("login");
    clearMessage();
    clearCredentials();
    setResetToken("");
    setNewPassword("");
  };

  const submitCredentials = async (event) => {
    event.preventDefault();
    clearMessage();
    setLoading(true);

    try {
      if (mode === "registro") {
        await registrarUsuario({ nombre: name, email, password });
        setMessage("Cuenta creada correctamente. Ahora inicia sesión.");
        setMessageType("exito");
        clearCredentials();
        setTimeout(() => {
          setMode("login");
          setMessage("");
        }, 1500);
        return;
      }

      const response = await iniciarSesion({ email, password });
      if (response.token) localStorage.setItem("token", response.token);
      if (response.user) localStorage.setItem("usuario", JSON.stringify(response.user));
      if (typeof onLogin === "function") onLogin(response);
      setMessage("Inicio de sesión exitoso.");
      setMessageType("exito");
    } catch (error) {
      setMessage(responseMessage(error, "Ocurrió un error. Inténtalo nuevamente."));
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const requestRecovery = async (event) => {
    event.preventDefault();
    clearMessage();
    setLoading(true);

    try {
      const response = await solicitarRecuperacion(email);
      if (response.resetToken) setResetToken(response.resetToken);
      setMessage("Solicitud de recuperación realizada correctamente.");
      setMessageType("exito");
    } catch (error) {
      setMessage(responseMessage(error, "No fue posible solicitar la recuperación."));
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    clearMessage();
    setLoading(true);

    try {
      const response = await restablecerPassword(resetToken, newPassword);
      setMessage(response.message || "Contraseña restablecida correctamente.");
      setMessageType("exito");
      setResetToken("");
      setNewPassword("");
      setTimeout(() => {
        setMode("login");
        setEmail("");
        setPassword("");
        setMessage("");
      }, 2000);
    } catch (error) {
      setMessage(responseMessage(error, "No fue posible restablecer la contraseña."));
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const boxClass = [
    "auth-box",
    mode === "registro" && "registro-activo",
    mode === "recuperar" && "recuperacion-activa",
  ].filter(Boolean).join(" ");

  const title = {
    login: "Iniciar sesión",
    registro: "Crear cuenta",
    recuperar: "Recuperar contraseña",
  }[mode];

  return <div className="auth-page">
    <div className={boxClass}>
      <div className="auth-form">
        <div className="auth-title">
          <h1>{title}</h1>
          <div className="title-line" />
        </div>

        {mode === "login" && <LoginForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          onSubmit={submitCredentials}
          onForgot={showRecovery}
          message={message}
          messageType={messageType}
          loading={loading}
        />}
        {mode === "registro" && <RegistrationForm
          name={name}
          setName={setName}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          onSubmit={submitCredentials}
          message={message}
          messageType={messageType}
          loading={loading}
        />}
        {mode === "recuperar" && <RecoveryForms
          email={email}
          setEmail={setEmail}
          resetToken={resetToken}
          password={newPassword}
          setPassword={setNewPassword}
          onRequest={requestRecovery}
          onReset={resetPassword}
          message={message}
          messageType={messageType}
          loading={loading}
        />}

        <AuthModeSwitch mode={mode} onSwitch={switchMode} onBackToLogin={returnToLogin} />
      </div>
      <AuthWelcomePanel mode={mode} onSwitch={switchMode} onBackToLogin={returnToLogin} />
    </div>
  </div>;
}

export default Auth;
