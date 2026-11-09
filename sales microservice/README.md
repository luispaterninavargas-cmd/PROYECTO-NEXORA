# Pagos de prueba con Mercado Pago

El checkout usa Mercado Pago Checkout Pro en sandbox. El microservicio confirma
los pagos consultando directamente a Mercado Pago, tanto al recibir un webhook
firmado como cuando el comprador vuelve a la tienda. El retorno del navegador
por sí solo nunca confirma una transacción.

## Configuración local

1. En Mercado Pago Developers, crea una aplicación y cuentas de prueba de
   vendedor y comprador para Colombia.
2. Copia el Access Token de la **cuenta vendedora de prueba** desde la sección
   **Pruebas > Credenciales de prueba** de la aplicación y el secreto de firma
   de **Webhooks > Modo de prueba** al `.env` del microservicio de ventas. El
   prefijo del token no determina si es de prueba o producción. Usa el valor
   que aparece en la sección de credenciales de prueba y establece
   `MP_CREDENTIALS_TYPE=test` y `MP_ENVIRONMENT=sandbox`; usa `.env.example`
   como referencia. El backend solo registra pagos que Mercado Pago confirma
   como pruebas (`live_mode=false`).
3. Expón el API Gateway por HTTPS con un túnel público y configura esa dirección
   como URL de notificación en `PAYMENT_NOTIFICATION_URL`.
4. Registra esa misma URL en la sección Webhooks de la aplicación de Mercado
   Pago y activa notificaciones de pagos. Usa el secreto generado por esa
   configuración en `MP_WEBHOOK_SECRET`.
5. Configura `FRONTEND_URL` con la dirección desde la que abrirás la tienda.
   Para probar desde otro dispositivo, usa también una URL pública del frontend.
6. Reinicia ventas y el API Gateway.

Al volver de Checkout Pro, la tienda solicita al backend verificar la orden.
El backend busca el pago por la referencia externa de la orden y valida su
estado, importe, moneda y modo antes de actualizarla. Si el proveedor aún no
encuentra el pago, la tienda reintenta la consulta brevemente; el webhook sigue
activo como confirmación asíncrona.
Si hay varios pagos con la misma referencia, la conciliación prioriza el pago
de prueba; nunca aplica un pago de producción en este flujo.

El webhook debe llegar a:

`https://<dominio-publico-del-gateway>/sales/payments/mercadopago/webhook`

En Checkout Pro inicia sesión como el comprador de prueba y usa las tarjetas y
titulares indicados en la documentación de pruebas de Mercado Pago. No ingreses
datos de una tarjeta real. Inicia sesión en Checkout Pro con el comprador de
prueba y usa las tarjetas de prueba de Mercado Pago. El modo `sandbox`,
credenciales copiadas de la sección de prueba y `MP_CREDENTIALS_TYPE=test` son
obligatorios. No uses credenciales de la sección de producción. El backend
rechaza cualquier pago que Mercado Pago marque como producción
(`live_mode=true`).
