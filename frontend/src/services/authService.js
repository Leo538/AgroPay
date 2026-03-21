import { getExpoGoProjectConfig } from 'expo';
import { Platform } from 'react-native';
import { normalizePhone } from '../utils/validation';

const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '3000';

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
 */
export async function login(email, password) {
  return requestJson('/api/auth/login', {
    email: email.trim(),
    password,
  });
}

/**
 * @param {object} p
 * @param {string} p.nombre
 * @param {string} p.apellido
 * @param {string} p.telefono
 * @param {string} p.email
 * @param {string} p.password
 * @param {'agricultor' | 'comprador'} p.role
 */
export async function register(p) {
  return requestJson('/api/auth/register', {
    nombre: String(p.nombre || '').trim(),
    apellido: String(p.apellido || '').trim(),
    telefono: normalizePhone(p.telefono),
    email: String(p.email || '').trim(),
    password: p.password,
    role: p.role,
  });
}
