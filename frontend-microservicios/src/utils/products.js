export function sortProducts(products) {
  return [...products].sort((first, second) => {
    const firstId = Number(first.id);
    const secondId = Number(second.id);
    const firstHasId = Number.isFinite(firstId);
    const secondHasId = Number.isFinite(secondId);

    if (firstHasId && secondHasId) return firstId - secondId;
    if (firstHasId) return -1;
    if (secondHasId) return 1;
    return String(first.nombre || "").localeCompare(String(second.nombre || ""), "es");
  });
}

function productCreationTime(product) {
  const createdAt = Date.parse(product.createdAt || "");
  if (Number.isFinite(createdAt)) return createdAt;

  const productId = String(product._id || product.id || "");
  if (/^[\da-f]{24}$/i.test(productId)) {
    return Number.parseInt(productId.slice(0, 8), 16) * 1000;
  }

  return 0;
}

export function sortProductsByNewest(products) {
  return [...products].sort((first, second) =>
    productCreationTime(second) - productCreationTime(first)
  );
}
