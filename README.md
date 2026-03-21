# AgroPay

App React Native (Expo) + API Node.js (Express) + MongoDB.

## Requisitos

- [Node.js](https://nodejs.org/) LTS
- [MongoDB](https://www.mongodb.com/) en local o [Atlas](https://www.mongodb.com/atlas) (URI en `MONGO_URI`)

## Backend

1. Copia variables de entorno:

   ```bash
   cd backend
   copy .env.example .env
   ```

   Edita `.env`: `JWT_SECRET` obligatorio (cualquier cadena larga en desarrollo), `MONGO_URI` si tu Mongo no es local.

2. Instala e inicia:

   ```bash
   npm install
   npm run dev
   ```

   Por defecto escucha en **http://localhost:3000** (también en la red local, `0.0.0.0`). Rutas de auth: `POST /api/auth/register`, `POST /api/auth/login`.

   **Productos (solo agricultor, con JWT):** prefijo `/api/products` — `GET /mine`, `POST /`, `PUT /:id`, `DELETE /:id` (header `Authorization: Bearer <token>`).

   **Mercado y pedidos (solo comprador, con JWT):**
   - `GET /api/market/products` — catálogo (solo ítems con stock mayor a 0; incluye datos básicos del vendedor).
   - `GET /api/market/products/:id` — detalle para comprar.
   - `POST /api/orders` — cuerpo `{ productId, cantidad, metodoPago? }` (reserva stock al crear).
   - `GET /api/orders/mine`, `GET /api/orders/:id`, `PUT /api/orders/:id/comprobante` — lista, detalle y comprobante: JSON con `comprobanteUrl` (imagen, data URL como en productos) y/o `comprobanteQrPayload` (texto del QR escaneado). Al menos uno obligatorio.

   El registro pide **nombre, apellido, celular**, correo, contraseña y rol (`agricultor` / `comprador`). Si cambiaste el modelo de usuario, los documentos viejos en Mongo sin esos campos pueden seguir iniciando sesión, pero los **usuarios nuevos** deben registrarse otra vez con el formulario actual.

   **Importante:** MongoDB Atlas solo guarda datos. Si ves `ERR_CONNECTION_REFUSED` en el móvil o en web, el **backend tiene que estar encendido** en otra terminal. Sin eso no hay registro ni login.

3. Comprueba salud: abre en el navegador `http://localhost:3000/health` (debe responder `{"ok":true}`).

## Frontend (Expo)

1. En otra terminal:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   (Equivale a `npm start` o `npx expo start`.)

   **Navegador (tecla `w`):** hace falta `react-dom`, `react-native-web` y `@expo/metro-runtime` (instálalos con `npx expo install react-dom react-native-web @expo/metro-runtime` si Expo te lo pide). Luego `npm run dev` y pulsa `w`, o `npm run web`.

   En **web**, `Alert` de React Native no muestra diálogos (es un no-op). Confirmaciones como **Eliminar producto** usan `window.confirm` vía `frontend/src/utils/confirmDialog.js`.

2. La URL del API se resuelve sola en **Expo Go** (usa la misma IP que Metro). Si falla, crea `frontend/.env` con `EXPO_PUBLIC_API_URL=http://TU_IP:3000` y reinicia Expo (`Ctrl+C` y `npx expo start -c`). En **web** usa `http://localhost:3000` (el backend en tu PC).

## Estructura

- `backend/` — Express, Mongoose, JWT, modelo `User` (nombre, apellido, telefono, email, role), rutas `/api/auth`
- `frontend/` — Expo, `App.js` + `AuthContext` + sesión en `authStorage.js`
- `frontend/src/screens/LoginScreen.js` — login y registro (al registrarte vuelves al login; la sesión solo se guarda al **iniciar sesión**)
- `frontend/src/screens/HomeScreen.js` — bienvenida con nombre y datos básicos (base para vistas agricultor/comprador)
- `frontend/src/navigation/AppNavigator.js` — inicio, productos (agricultor), mercado y pedidos (comprador)
- Comprador: **Ver productos** → detalle → **Crear pedido** → **Pago** (comprobante o captura de QR desde galería)
