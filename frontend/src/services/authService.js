import { getExpoGoProjectConfig } from 'expo';
import { Platform } from 'react-native';

const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '3000';

/**
 * Orden:
 * 1) EXPO_PUBLIC_API_URL en .env (reinicia Expo tras cambiarlo)
 * 2) Expo Go: misma máquina que Metro (IP que ves en exp://192.168.x.x:8081)
 * 3) Android emulador: 10.0.2.2
 * 4) Web / iOS simulador: localhost
 */
function resolveApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (fromEnv) {
    return fromEnv;
  }

  if (Platform.OS !== 'web') {
    const debuggerHost = getExpoGoProjectConfig()?.debuggerHost;
    if (debuggerHost) {
      const host = debuggerHost.split(':')[0];
      if (host) {
        return `http://${host}:${API_PORT}`;
      }
    }
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function requestJson(path, body) {
  const url = `${API_BASE_URL}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const err = new Error(
      'Sin conexión al servidor. En otra terminal ejecuta el backend (carpeta backend: npm run dev) y comprueba que el API responda.'
    );
    err.cause = e;
    err.code = 'NETWORK_ERROR';
    throw err;
  }
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const err = new Error(data.message || 'Error');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>}
 */
export async function login(email, password) {
  return requestJson('/api/auth/login', {
    email: email.trim(),
    password,
  });
}

/**
 * @param {string} email
 * @param {string} password
 * @param {'agricultor' | 'comprador'} role
 * @returns {Promise<object>}
 */
export async function register(email, password, role) {
  return requestJson('/api/auth/register', {
    email: email.trim(),
    password,
    role,
  });
}
