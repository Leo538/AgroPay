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

/** Pedidos creados en la ventana reciente (solo agricultor). */
export async function fetchPedidosRecientesCount() {
  const res = await fetch(
    `${API_BASE_URL}/api/farmer/orders/alerts/resumen`,
    { method: 'GET', headers: await authHeaders() }
  );
  const data = await handleResponse(res);
  return typeof data.pedidosRecientes === 'number' ? data.pedidosRecientes : 0;
}

/** Productos publicados en la ventana reciente con stock (solo comprador). */
export async function fetchProductosNuevosCount() {
  const res = await fetch(`${API_BASE_URL}/api/market/alerts/resumen`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  const data = await handleResponse(res);
  return typeof data.productosNuevos === 'number' ? data.productosNuevos : 0;
}

/** Lista para panel de inicio (máx. 25 ítems en servidor). */
export async function fetchPedidosRecientesLista() {
  const res = await fetch(
    `${API_BASE_URL}/api/farmer/orders/alerts/recientes`,
    { method: 'GET', headers: await authHeaders() }
  );
  return handleResponse(res);
}

export async function fetchProductosRecientesLista() {
  const res = await fetch(`${API_BASE_URL}/api/market/alerts/recientes`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  return handleResponse(res);
}
