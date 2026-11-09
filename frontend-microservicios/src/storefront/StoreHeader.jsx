import { useEffect, useRef, useState } from "react";
import StoreIcon from "../components/StoreIcon";

function StoreHeader({
  session,
  onLogout,
  search,
  onSearchChange,
  onSearchSubmit,
  showFavorites,
  favoriteCount,
  onToggleFavorites,
  cartOpen,
  cartCount,
  onToggleCart,
}) {
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    const closeAccountMenu = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", closeAccountMenu);
    return () => document.removeEventListener("mousedown", closeAccountMenu);
  }, []);

  return <header className="store-header">
    <div className="store-topline">
      <a className="store-brand" href="#inicio"><img src="/assets/nexora-logo.png" alt="" /><span>NEXORA</span></a>
      <form className="store-search" onSubmit={onSearchSubmit}>
        <button className="search-submit" type="submit" aria-label="Buscar"><StoreIcon name="search" /></button>
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Buscar productos..." aria-label="Buscar productos" />
        {search && <button type="button" onClick={() => onSearchChange("")} aria-label="Limpiar búsqueda">×</button>}
      </form>
      <div className="store-actions">
        <button
          className={showFavorites ? "favorites-button active" : "favorites-button"}
          type="button"
          onClick={onToggleFavorites}
          aria-label={showFavorites ? "Ver todo el catálogo" : `Ver favoritos, ${favoriteCount} productos`}
          aria-pressed={showFavorites}
        >
          <StoreIcon name="heart" />{favoriteCount > 0 && <span>{favoriteCount}</span>}
        </button>
        <button
          className={cartOpen ? "cart-button active" : "cart-button"}
          type="button"
          onClick={onToggleCart}
          aria-label={`Abrir carrito, ${cartCount} productos`}
          aria-expanded={cartOpen}
        >
          <StoreIcon name="cart" />{cartCount > 0 && <span>{cartCount}</span>}
        </button>
        <div className={accountOpen ? "store-account account-open" : "store-account"} ref={accountRef}>
          <button className="account-trigger" type="button" onClick={() => setAccountOpen((open) => !open)} aria-expanded={accountOpen} aria-haspopup="true">
            <span className="account-avatar"><StoreIcon name="user" /></span>
            <span className="account-summary"><strong>{session.user?.nombre || "Tu cuenta"}</strong><small>Cuenta personal</small></span>
          </button>
          {accountOpen && <div className="account-menu" role="menu">
            <div className="account-menu-header">
              <strong>{session.user?.nombre || "Tu cuenta"}</strong>
              <span>{session.user?.email || "Correo no disponible"}</span>
            </div>
            <button className="account-logout" type="button" onClick={onLogout}>Cerrar sesión</button>
          </div>}
        </div>
      </div>
    </div>
    <nav className="store-nav" aria-label="Navegación principal">
      <a href="#inicio">Inicio</a>
      <a href="#productos">Productos</a>
      <a href="#categorias">Categorías</a>
      <a href="#para-ti">Para ti</a>
    </nav>
  </header>;
}

export default StoreHeader;
