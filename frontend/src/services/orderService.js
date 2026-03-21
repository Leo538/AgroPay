import { loadSession } from './authStorage';
import { API_BASE_URL } from './authService';

async function authJsonHeaders() {
  const s = await loadSession();
  const h = { 'Content-Type': 'application/json' };
  if (s?.token) {
    h.Authorization = `Bearer ${s.token}`;
  }
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

export async function fetchMarketProducts() {
  const res = await fetch(`${API_BASE_URL}/api/market/products`, {
    method: 'GET',
    headers: await authJsonHeaders(),
  });
  return handleResponse(res);
}

export async function fetchMarketProduct(id) {
  const res = await fetch(`${API_BASE_URL}/api/market/products/${id}`, {
    method: 'GET',
    headers: await authJsonHeaders(),
  });
  return handleResponse(res);
}

export async function createOrder(body) {
  const res = await fetch(`${API_BASE_URL}/api/orders`, {
    method: 'POST',
    headers: await authJsonHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function fetchMyOrders() {
  const res = await fetch(`${API_BASE_URL}/api/orders/mine`, {
    method: 'GET',
    headers: await authJsonHeaders(),
  });
  return handleResponse(res);
}

export async function fetchOrder(id) {
  const res = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
    method: 'GET',
    headers: await authJsonHeaders(),
  });
  return handleResponse(res);
}

/**
 * @param {string} id
 * @param {{
 *   comprobanteUrl?: string,
 *   comprobanteQrPayload?: string,
 *   montoDeclarado?: string | number,
 *   referenciaDeclarada?: string,
 * }} payload
 */
export async function uploadOrderComprobante(id, payload) {
  const res = await fetch(`${API_BASE_URL}/api/orders/${id}/comprobante`, {
    method: 'PUT',
    headers: await authJsonHeaders(),
    body: JSON.stringify({
      comprobanteUrl: payload?.comprobanteUrl || '',
      comprobanteQrPayload: payload?.comprobanteQrPayload || '',
      montoDeclarado: payload?.montoDeclarado,
      referenciaDeclarada: payload?.referenciaDeclarada,
    }),
  });
  return handleResponse(res);
}

export async function fetchFarmerOrders() {
  const res = await fetch(`${API_BASE_URL}/api/farmer/orders`, {
    method: 'GET',
    headers: await authJsonHeaders(),
  });
  return handleResponse(res);
}

export async function fetchFarmerOrder(id) {
  const res = await fetch(`${API_BASE_URL}/api/farmer/orders/${id}`, {
    method: 'GET',
    headers: await authJsonHeaders(),
  });
  return handleResponse(res);
}

export async function farmerConfirmarPago(id) {
  const res = await fetch(`${API_BASE_URL}/api/farmer/orders/${id}/confirmar`, {
    method: 'PUT',
    headers: await authJsonHeaders(),
  });
  return handleResponse(res);
}

export async function farmerRechazarPedido(id, motivo) {
  const res = await fetch(`${API_BASE_URL}/api/farmer/orders/${id}/rechazar`, {
    method: 'PUT',
    headers: await authJsonHeaders(),
    body: JSON.stringify({ motivo }),
  });
  return handleResponse(res);
}

export async function farmerMarcarEntregado(id) {
  const res = await fetch(`${API_BASE_URL}/api/farmer/orders/${id}/entregado`, {
    method: 'PUT',
    headers: await authJsonHeaders(),
  });
  return handleResponse(res);
}
