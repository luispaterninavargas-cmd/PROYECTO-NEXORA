export function productKey(product) {
  return String(product._id || product.id || product.nombre || "");
}

export function getProductImages(product) {
  const images = Array.isArray(product?.imagenes)
    ? product.imagenes.filter((image) => typeof image === "string" && image.trim())
    : [];
  return images.length ? images : product?.imagen ? [product.imagen] : [];
}

export function normalizeSearchValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}
