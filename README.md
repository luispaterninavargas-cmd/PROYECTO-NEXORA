# Microservicios e-commerce

## Requisitos

- Node.js y npm instalados.
- MongoDB en ejecución y variables de entorno configuradas para los servicios.

## Ejecución

Desde la raíz del proyecto, instala las dependencias e inicia los servicios:

```powershell
npm install
npm run dev
```

El comando `npm run dev` inicia los microservicios, el API Gateway y el frontend.

## Variables de entorno

Guarda las variables locales en archivos `.env`; la configuración de Git los ignora en cualquier carpeta. Si un servicio incluye un `.env.example`, úsalo como plantilla y completa los valores solo en tu `.env` local. No subas credenciales reales ni las pegues en reportes o mensajes.

Si una credencial ya se incluyó en un commit, quitar el archivo no la elimina del historial de Git: rótala antes de publicar el repositorio.

## Acceso desde internet con el túnel de VS Code

1. Inicia MongoDB y verifica que los archivos `.env` locales de los servicios tengan sus variables configuradas. No publiques ni compartas esos archivos.
2. Desde la raíz del proyecto ejecuta `npm run dev`.
3. En VS Code abre **Ports** (Reenvío de puertos), reenvía el puerto **5173** y cambia su visibilidad a **Public**. Abre la URL HTTPS que muestra VS Code.

Durante el desarrollo, Vite reenvía las llamadas `/auth`, `/users`, `/productos`, `/recommendations` y `/sales` al API Gateway local (puerto 5300). Solo es necesario publicar el frontend; no publiques los puertos de los microservicios ni el gateway por separado para navegar la tienda. El servidor permite los dominios `*.devtunnels.ms` del túnel.

Un puerto marcado como **Public** puede recibir solicitudes de cualquier persona que tenga la URL. Usa credenciales de prueba y no expongas datos reales. Para probar notificaciones de Mercado Pago, sí se necesita publicar además el puerto del gateway y actualizar `PAYMENT_NOTIFICATION_URL` y `FRONTEND_URL` en la configuración local de ventas con las URL HTTPS actuales; reinicia los servicios después de cambiarlas.
