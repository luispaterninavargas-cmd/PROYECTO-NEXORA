import dotenv from 'dotenv';
import express from 'express';
import routesSales from './infrastructure/web/routes/sales.js';
import bodyParser from 'body-parser';
import dbClient from './infrastructure/config/dbSales.js';

// Cargar las variables del .env y dar prioridad a ese archivo
const dotenvResult = dotenv.config({ override: true });

// Verificación segura de la configuración de Mercado Pago
console.info('[VENTAS] Mercado Pago config:', {
    environment: process.env.MP_ENVIRONMENT,
    credentialsType: process.env.MP_CREDENTIALS_TYPE,
    tokenConfigured: Boolean(process.env.MP_ACCESS_TOKEN),
    tokenPrefix: process.env.MP_ACCESS_TOKEN?.split('-')[0] || null
});

// Verificación segura del Webhook Secret
const envWebhookSecret = dotenvResult.parsed?.MP_WEBHOOK_SECRET;
const runtimeWebhookSecret = process.env.MP_WEBHOOK_SECRET;

console.info('[VENTAS] Webhook secret runtime check:', {
    envFileConfigured: Boolean(envWebhookSecret),
    runtimeConfigured: Boolean(runtimeWebhookSecret),
    envMatchesRuntime: envWebhookSecret && runtimeWebhookSecret
        ? envWebhookSecret === runtimeWebhookSecret
        : null
});

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/sales', routesSales);

const PORT = process.env.PORT || 3000;

try {
    await dbClient.ready;

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

} catch (error) {
    console.error(
        'No fue posible iniciar el microservicio de ventas:',
        error
    );

    process.exitCode = 1;
}