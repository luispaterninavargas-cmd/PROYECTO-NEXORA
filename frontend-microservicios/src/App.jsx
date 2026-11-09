import { useEffect, useState } from "react";
import AdminDashboard from "./admin/AdminDashboard";
import Auth from "./components/Auth";
import UserDashboard from "./storefront/UserDashboard";
import "./App.css";
import "./admin/admin.css";
import "./storefront.css";

function readUser() {
  try {
    const savedUser = localStorage.getItem("usuario");
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    return null;
  }
}

function App() {
  const [user, setUser] = useState(readUser);
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  useEffect(() => {
    const sessionExpired = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      setToken(null);
      setUser(null);
    };
    window.addEventListener("session-expired", sessionExpired);
    return () => window.removeEventListener("session-expired", sessionExpired);
  }, []);

  const handleLogin = (response) => {
    if (!response?.token || !response?.user) return;
    localStorage.setItem("token", response.token);
    localStorage.setItem("usuario", JSON.stringify(response.user));
    setToken(response.token);
    setUser(response.user);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setToken(null);
    setUser(null);
  };

  if (!token || !user) return <Auth onLogin={handleLogin} />;
  if (user.role === "admin") return <AdminDashboard session={{ token, user }} onLogout={handleLogout} />;
  return <UserDashboard session={{ token, user }} onLogout={handleLogout} />;
}

export default App;
