import { loadSession } from './authStorage';
import { API_BASE_URL } from './authService';

async function authHeaders() {
  const s = await loadSession();
  const h = { 'Content-Type': 'application/json' };
  if (s?.token) h.Authorization = `Bearer ${s.token}`;
  return h;
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Error');
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Precios de mercado — solo agricultor. Respuesta: `listaOficialEma` (EP-EMA). */
export async function fetchFarmerReferencePrices() {
  const res = await fetch(`${API_BASE_URL}/api/farmer/referencia-precios`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  return handleResponse(res);
}
