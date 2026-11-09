function StoreHero() {
  const exploreCatalog = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("para-ti")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  };

  return <section className="store-hero" id="inicio">
    <div>
      <span className="hero-kicker">Tecnología para tu próximo nivel</span>
      <h1>Encuentra lo que<br /><em>te mueve.</em></h1>
      <p>Componentes, accesorios y dispositivos elegidos para hacer más simple tu día.</p>
      <button className="hero-action" type="button" onClick={exploreCatalog}>Explorar catálogo <span>↓</span></button>
    </div>
    <div className="hero-orbit" aria-hidden="true"><span>01</span><b>smart<br />selection</b></div>
  </section>;
}

export default StoreHero;
