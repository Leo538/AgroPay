import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_TOKEN = '@agropay_token';
const KEY_USER = '@agropay_user';

/**
 * @returns {Promise<{ token: string, user: object } | null>}
 */
export async function loadSession() {
  try {
    const [token, userJson] = await AsyncStorage.multiGet([KEY_TOKEN, KEY_USER]);
    const t = token[1];
    const u = userJson[1];
    if (!t || !u) return null;
    return { token: t, user: JSON.parse(u) };
  } catch {
    return null;
  }
}

/**
 * @param {string} token
 * @param {object} user
 */
export async function saveSession(token, user) {
  await AsyncStorage.multiSet([
    [KEY_TOKEN, token],
    [KEY_USER, JSON.stringify(user)],
  ]);
}

export async function clearSession() {
  await AsyncStorage.multiRemove([KEY_TOKEN, KEY_USER]);
}
