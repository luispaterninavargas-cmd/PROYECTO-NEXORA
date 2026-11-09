import {
  InvalidWebhookSignatureError,
  SignatureFailureReason,
  WebhookSignatureValidator
} from "mercadopago";

function safeLogValue(value) {
  return String(value || "").replace(/[\r\n\t]/g, " ").slice(0, 200) || null;
}

export function verifyMercadoPagoWebhook(request, secret) {
  const queryDataId = request.query["data.id"] || request.query.data?.id;
  const receivedDataId = Array.isArray(queryDataId) ? queryDataId[0] : queryDataId;
  const dataId = String(receivedDataId || "");
  const normalizedDataId = /^[a-z\d]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const requestId = request.headers["x-request-id"];
  const signature = request.headers["x-signature"];
  const signatureText = Array.isArray(signature) ? signature[0] : signature;
  const timestamp = String(signatureText || "")
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("ts="))
    ?.slice(3)
    .trim();
  const secretConfigured = typeof secret === "string" && secret.length > 0;
  const diagnostics = {
    dataId: safeLogValue(dataId),
    requestId: safeLogValue(requestId),
    timestamp: safeLogValue(timestamp),
    signaturePresent: Boolean(signatureText),
    secretConfigured
  };

  if (!secretConfigured) {
    console.error("[VENTAS] Secreto MP_WEBHOOK_SECRET no configurado.", diagnostics);
    const error = new Error("El secreto del webhook de Mercado Pago no está configurado.");
    error.statusCode = 503;
    throw error;
  }

  if (!normalizedDataId || !requestId || !timestamp || !signatureText) {
    console.warn("[VENTAS] Firma de notificación de Mercado Pago incompleta.", {
      ...diagnostics,
      signatureValid: false,
      reason: "missing_data_or_signature_fields"
    });
    const error = new Error("La notificación de pago no contiene una firma válida.");
    error.statusCode = 401;
    throw error;
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: signatureText,
      xRequestId: requestId,
      dataId: normalizedDataId,
      secret
    });
  } catch (cause) {
    const reason = cause instanceof InvalidWebhookSignatureError
      ? cause.reason
      : SignatureFailureReason.SignatureMismatch;
    console.warn("[VENTAS] Firma de notificación de Mercado Pago inválida.", {
      ...diagnostics,
      signatureValid: false,
      reason
    });
    const error = new Error(reason);
    error.statusCode = 401;
    throw error;
  }

  console.info("[VENTAS] Firma de notificación de Mercado Pago válida.", {
    ...diagnostics,
    signatureValid: true
  });
  return normalizedDataId;
}
