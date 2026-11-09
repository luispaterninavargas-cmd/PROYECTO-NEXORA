export function errorMessage(error) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado";
}

export function idOf(item) {
  return item?._id || item?.id || item?.id_sales;
}

export function productImages(product) {
  if (Array.isArray(product.imagenes) && product.imagenes.length) {
    return product.imagenes;
  }
  return product.imagen ? [product.imagen] : [];
}

export function categoriesFromProducts(products) {
  return [...new Set(
    products
      .map((product) => String(product.categoria || "").trim())
      .filter(Boolean)
  )].sort((first, second) => first.localeCompare(second, "es"));
}
