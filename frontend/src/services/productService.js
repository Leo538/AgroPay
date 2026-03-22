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

export async function fetchMyProducts() {
  const res = await fetch(`${API_BASE_URL}/api/products/mine`, {
    method: 'GET',
    headers: await authJsonHeaders(),
  });
  return handleResponse(res);
}

/**
 * @param {object} body
 */
export async function createProduct(body) {
  const res = await fetch(`${API_BASE_URL}/api/products`, {
    method: 'POST',
    headers: await authJsonHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

/**
 * @param {string} id
 * @param {object} body
 */
export async function updateProduct(id, body) {
  const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
    method: 'PUT',
    headers: await authJsonHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

/**
 * @param {string} id
 */
export async function deleteProduct(id) {
  const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
    method: 'DELETE',
    headers: await authJsonHeaders(),
  });
  return handleResponse(res);
}
