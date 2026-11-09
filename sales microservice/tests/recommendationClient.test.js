import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { notifyRecommendationPurchase } from "../infrastructure/web/recommendationClient.js";

test("sends approved purchase items and their categories to recommendations", async () => {
  let request;
  const secret = "test-secret";

  await notifyRecommendationPurchase({
    id_users: "user-1",
    items: [{
      id_product: "product-1",
      product_name: "Laptop",
      category: "Tecnología"
    }]
  }, {
    jwtSecret: secret,
    serviceUrl: "http://recommendations.test",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, status: 201 };
    }
  });

  assert.equal(request.url, "http://recommendations.test/api/recommendations/events/purchase");
  assert.deepEqual(JSON.parse(request.options.body), {
    items: [{
      id_product: "product-1",
      product_name: "Laptop",
      category: "Tecnología"
    }]
  });
  const tokenPayload = jwt.verify(
    request.options.headers.Authorization.slice("Bearer ".length),
    secret
  );
  assert.equal(tokenPayload.userId, "user-1");
  assert.equal(tokenPayload.role, "sales-service");
});

test("reports a non-success response from recommendations", async () => {
  await assert.rejects(
    notifyRecommendationPurchase({
      id_users: "user-1",
      items: []
    }, {
      jwtSecret: "test-secret",
      fetchImpl: async () => ({ ok: false, status: 503 })
    }),
    /HTTP 503/
  );
});
