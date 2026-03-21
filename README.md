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

2. La URL del API se resuelve sola en **Expo Go** (usa la misma IP que Metro). Si falla, crea `frontend/.env` con `EXPO_PUBLIC_API_URL=http://TU_IP:3000` y reinicia Expo (`Ctrl+C` y `npx expo start -c`). En **web** usa `http://localhost:3000` (el backend en tu PC).

## Estructura

- `backend/` — Express, Mongoose, JWT, modelo `User` (nombre, apellido, telefono, email, role), rutas `/api/auth`
- `frontend/` — Expo, `App.js` + `AuthContext` + sesión en `authStorage.js`
- `frontend/src/screens/LoginScreen.js` — login y registro (al registrarte vuelves al login; la sesión solo se guarda al **iniciar sesión**)
- `frontend/src/screens/HomeScreen.js` — bienvenida con nombre y datos básicos (base para vistas agricultor/comprador)
- `frontend/src/navigation/AppNavigator.js` — reservado para cuando añadas más pantallas con React Navigation
