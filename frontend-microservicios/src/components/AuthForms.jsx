function AuthIcon({ name }) {
  const paths = {
    user: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>,
    mail: <><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="m4.5 7 7.5 5.5L19.5 7" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  };

  return <svg className="auth-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function AuthInput({ icon, minLength, onChange, ...props }) {
  const handleChange = (event) => {
    if (minLength) {
      const tooShort = event.target.value.length > 0 && event.target.value.length < minLength;
      event.target.setCustomValidity(
        tooShort ? `Debe tener al menos ${minLength} caracteres.` : ""
      );
    }
    onChange?.(event);
  };

  return <div className="input-box">
    <input {...props} minLength={minLength} onChange={handleChange} />
    <span><AuthIcon name={icon} /></span>
  </div>;
}

function AuthMessage({ message, type }) {
  return message ? <div className={`mensaje ${type}`}>{message}</div> : null;
}

export function LoginForm({ email, setEmail, password, setPassword, onSubmit, onForgot, message, messageType, loading }) {
  return <form onSubmit={onSubmit}>
    <AuthInput icon="mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Correo electrónico" required />
    <AuthInput icon="lock" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña" required minLength={6} />
    <div className="forgot-password">
      <button type="button" onClick={onForgot}>¿Olvidaste tu contraseña?</button>
    </div>
    <AuthMessage message={message} type={messageType} />
    <button type="submit" className="auth-button" disabled={loading}>
      {loading ? "Procesando..." : "Iniciar sesión"}
    </button>
  </form>;
}

export function RegistrationForm({ name, setName, email, setEmail, password, setPassword, onSubmit, message, messageType, loading }) {
  return <form onSubmit={onSubmit}>
    <AuthInput icon="user" type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre completo" required />
    <AuthInput icon="mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Correo electrónico" required />
    <AuthInput icon="lock" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña" required minLength={6} />
    <AuthMessage message={message} type={messageType} />
    <button type="submit" className="auth-button" disabled={loading}>
      {loading ? "Procesando..." : "Registrarse"}
    </button>
  </form>;
}

export function RecoveryForms({
  email,
  setEmail,
  resetToken,
  password,
  setPassword,
  onRequest,
  onReset,
  message,
  messageType,
  loading,
}) {
  return <div className="recuperacion-container">
    {!resetToken ? <form onSubmit={onRequest}>
      <AuthInput icon="mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Correo electrónico" required />
      <button type="submit" className="auth-button" disabled={loading}>
        {loading ? "Enviando..." : "Solicitar recuperación"}
      </button>
    </form> : <form onSubmit={onReset} className="reset-form">
      <AuthInput icon="lock" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nueva contraseña" required minLength={6} />
      <button type="submit" className="auth-button" disabled={loading}>
        {loading ? "Restableciendo..." : "Cambiar contraseña"}
      </button>
    </form>}
    <AuthMessage message={message} type={messageType} />
  </div>;
}

export function AuthModeSwitch({ mode, onSwitch, onBackToLogin }) {
  return <div className="switch-text">
    {mode === "login" && <>¿No tienes una cuenta?{" "}<button type="button" onClick={onSwitch}>Regístrate</button></>}
    {mode === "registro" && <>¿Ya tienes una cuenta?{" "}<button type="button" onClick={onSwitch}>Inicia sesión</button></>}
    {mode === "recuperar" && <>¿Recordaste tu contraseña?{" "}<button type="button" onClick={onBackToLogin}>Inicia sesión</button></>}
  </div>;
}

export function AuthWelcomePanel({ mode, onSwitch, onBackToLogin }) {
  const copy = {
    login: ["¡BIENVENIDO DE NUEVO!", "Nos alegra volver a verte."],
    registro: ["¡BIENVENIDO!", "Crea tu cuenta y comienza a disfrutar."],
    recuperar: ["RECUPERA TU CUENTA", "Restablece tu contraseña de forma segura."],
  }[mode];

  return <div className="welcome-panel">
    <div className="welcome-content">
      <h2>{copy[0]}</h2>
      <p>{copy[1]}</p>
      <button type="button" className="welcome-button" onClick={mode === "recuperar" ? onBackToLogin : onSwitch}>
        {mode === "login" ? "Registrarse" : mode === "registro" ? "Iniciar sesión" : "Volver al inicio"}
      </button>
    </div>
  </div>;
}
