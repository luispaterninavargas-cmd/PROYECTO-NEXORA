import jwt from "jsonwebtoken";

const REQUEST_TIMEOUT_MS = 2500;

export async function notifyRecommendationPurchase(
  sale,
  {
    fetchImpl = fetch,
    serviceUrl = process.env.RECOMMENDATIONS_SERVICE || "http://localhost:5201",
    jwtSecret = process.env.JWT_SECRET
  } = {}
) {
  if (!jwtSecret) {
    throw new Error("JWT_SECRET es obligatorio para autenticar la compra en recomendaciones.");
  }

  const baseUrl = serviceUrl.replace(/\/+$/, "");
  const endpoint = baseUrl.endsWith("/api/recommendations")
    ? `${baseUrl}/events/purchase`
    : `${baseUrl}/api/recommendations/events/purchase`;
  const token = jwt.sign(
    { userId: String(sale.id_users), role: "sales-service" },
    jwtSecret,
    { expiresIn: "1m" }
  );
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      items: (sale.items || []).map((item) => ({
        id_product: item.id_product,
        product_name: item.product_name,
        category: item.category || ""
      }))
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`recommendation-service respondió HTTP ${response.status}.`);
  }
}
