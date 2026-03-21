import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as loginApi from '../services/authService';
import { isValidEmail, MIN_PASSWORD_LENGTH } from '../utils/validation';

const COLORS = {
  greenDark: '#2E7D32',
  greenLight: '#66BB6A',
  yellow: '#FBC02D',
  white: '#FFFFFF',
  grayLight: '#F5F5F5',
  textMuted: '#424242',
  error: '#C62828',
  errorBg: '#FFEBEE',
};

const initialBlurred = {
  email: false,
  password: false,
  confirmPassword: false,
};

/**
 * strict: al enviar el formulario (todos los campos obligatorios).
 * live: mientras escribes / al salir del campo (onBlur).
 */
function computeFieldErrors({
  isLogin,
  email,
  password,
  confirmPassword,
  role,
  blurred,
  strict,
}) {
  const e = { email: '', password: '', confirmPassword: '', role: '' };
  const trim = email.trim();

  if (strict) {
    if (!trim) {
      e.email = 'Escribe tu correo electrónico.';
    } else if (!isValidEmail(trim)) {
      e.email = 'Usa un correo válido (ejemplo: nombre@correo.com).';
    }

    if (!password) {
      e.password = 'Escribe tu contraseña.';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      e.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres (faltan ${MIN_PASSWORD_LENGTH - password.length}).`;
    }

    if (!isLogin) {
      if (!confirmPassword) {
        e.confirmPassword = 'Confirma tu contraseña escribiéndola otra vez.';
      } else if (confirmPassword !== password) {
        e.confirmPassword = 'Las dos contraseñas deben ser iguales.';
      }
      if (!role || !['agricultor', 'comprador'].includes(role)) {
        e.role = 'Elige si eres agricultor o comprador.';
      }
    }
    return e;
  }

  // En vivo (login y registro)
  if (trim.length > 0 && !isValidEmail(trim)) {
    e.email = 'Usa un correo válido (ejemplo: nombre@correo.com).';
  } else if (blurred.email && !trim) {
    e.email = 'Escribe tu correo electrónico.';
  }

  if (password.length > 0 && password.length < MIN_PASSWORD_LENGTH) {
    e.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres (faltan ${MIN_PASSWORD_LENGTH - password.length}).`;
  } else if (blurred.password && !password) {
    e.password = 'Escribe tu contraseña.';
  } else if (!isLogin && confirmPassword.length > 0 && !password) {
    e.password = 'Escribe primero la contraseña arriba.';
  }

  if (!isLogin) {
    if (
      confirmPassword.length > 0 &&
      password.length > 0 &&
      confirmPassword !== password
    ) {
      e.confirmPassword = 'Las dos contraseñas deben ser iguales.';
    } else if (
      blurred.confirmPassword &&
      password.length >= MIN_PASSWORD_LENGTH &&
      !confirmPassword
    ) {
      e.confirmPassword = 'Confirma tu contraseña escribiéndola otra vez.';
    }
  }

  return e;
}

function hasAnyError(err) {
  return Object.values(err).some((msg) => msg && msg.length > 0);
}

export default function LoginScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('agricultor');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [blurred, setBlurred] = useState(initialBlurred);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const isLogin = mode === 'login';

  const fieldErrors = useMemo(
    () =>
      computeFieldErrors({
        isLogin,
        email,
        password,
        confirmPassword,
        role,
        blurred,
        strict: submitAttempted,
      }),
    [
      isLogin,
      email,
      password,
      confirmPassword,
      role,
      blurred,
      submitAttempted,
    ]
  );

  function clearFormOnModeChange() {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole('agricultor');
    setSubmitError('');
    setBlurred(initialBlurred);
    setSubmitAttempted(false);
  }

  const handleSubmit = async () => {
    setSubmitError('');
    const strictErrs = computeFieldErrors({
      isLogin,
      email,
      password,
      confirmPassword,
      role,
      blurred,
      strict: true,
    });
    if (hasAnyError(strictErrs)) {
      setSubmitAttempted(true);
      return;
    }

    const trimmedEmail = email.trim();
    setLoading(true);
    try {
      if (isLogin) {
        await loginApi.login(trimmedEmail, password);
        setSubmitAttempted(false);
        setBlurred(initialBlurred);
        Alert.alert('Bienvenido', 'Has iniciado sesión correctamente.');
      } else {
        await loginApi.register(trimmedEmail, password, role);
        setPassword('');
        setConfirmPassword('');
        setSubmitAttempted(false);
        setBlurred(initialBlurred);
        setMode('login');
        Alert.alert(
          'Cuenta creada',
          'Ya puedes iniciar sesión con tu correo y contraseña.'
        );
      }
    } catch (err) {
      const message =
        typeof err?.message === 'string' && err.message.length > 0
          ? err.message
          : 'No se pudo completar. Revisa tus datos o la conexión.';
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.logoEmoji} accessibilityLabel="AgroPay">
              🌾
            </Text>
            <Text style={styles.title}>AgroPay</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Inicia sesión para continuar' : 'Crea tu cuenta en un paso'}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <Pressable
                style={[styles.toggleBtn, isLogin && styles.toggleBtnActive]}
                onPress={() => {
                  setMode('login');
                  clearFormOnModeChange();
                }}
                accessibilityRole="button"
                accessibilityLabel="Modo iniciar sesión"
              >
                <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
                  Iniciar sesión
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, !isLogin && styles.toggleBtnActive]}
                onPress={() => {
                  setMode('register');
                  clearFormOnModeChange();
                }}
                accessibilityRole="button"
                accessibilityLabel="Modo registrarse"
              >
                <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
                  Registrarse
                </Text>
              </Pressable>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                style={[styles.input, fieldErrors.email ? styles.inputError : null]}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#9E9E9E"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setSubmitError('');
                }}
                onBlur={() => setBlurred((b) => ({ ...b, email: true }))}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                accessibilityLabel="Correo electrónico"
              />
              {fieldErrors.email ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>
              ) : null}
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={[styles.input, fieldErrors.password ? styles.inputError : null]}
                placeholder="Tu contraseña"
                placeholderTextColor="#9E9E9E"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setSubmitError('');
                }}
                onBlur={() => setBlurred((b) => ({ ...b, password: true }))}
                secureTextEntry
                editable={!loading}
                accessibilityLabel="Contraseña"
              />
              {fieldErrors.password ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>
              ) : (
                <Text style={styles.hintNeutral}>
                  Mínimo {MIN_PASSWORD_LENGTH} caracteres
                </Text>
              )}
            </View>

            {!isLogin && (
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Confirmar contraseña</Text>
                <TextInput
                  style={[
                    styles.input,
                    fieldErrors.confirmPassword ? styles.inputError : null,
                  ]}
                  placeholder="Repite la misma contraseña"
                  placeholderTextColor="#9E9E9E"
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    setSubmitError('');
                  }}
                  onBlur={() =>
                    setBlurred((b) => ({ ...b, confirmPassword: true }))
                  }
                  secureTextEntry
                  editable={!loading}
                  accessibilityLabel="Confirmar contraseña"
                />
                {fieldErrors.confirmPassword ? (
                  <Text style={styles.fieldErrorText}>{fieldErrors.confirmPassword}</Text>
                ) : (
                  <Text style={styles.hintNeutral}>
                    Debe coincidir con la contraseña de arriba
                  </Text>
                )}
              </View>
            )}

            {!isLogin && (
              <View style={[styles.roleSection, styles.fieldBlock]}>
                <Text style={styles.label}>¿Quién eres?</Text>
                {fieldErrors.role ? (
                  <Text style={styles.fieldErrorText}>{fieldErrors.role}</Text>
                ) : null}
                <Pressable
                  style={[
                    styles.roleCard,
                    role === 'agricultor' && styles.roleCardSelected,
                    fieldErrors.role ? styles.roleCardWarn : null,
                  ]}
                  onPress={() => {
                    setRole('agricultor');
                    setSubmitError('');
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: role === 'agricultor' }}
                >
                  <Text style={styles.roleEmoji}>👨‍🌾</Text>
                  <View style={styles.roleTextWrap}>
                    <Text style={styles.roleTitle}>Agricultor</Text>
                    <Text style={styles.roleHint}>Vendo mis productos</Text>
                  </View>
                </Pressable>
                <Pressable
                  style={[
                    styles.roleCard,
                    role === 'comprador' && styles.roleCardSelected,
                    fieldErrors.role ? styles.roleCardWarn : null,
                  ]}
                  onPress={() => {
                    setRole('comprador');
                    setSubmitError('');
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: role === 'comprador' }}
                >
                  <Text style={styles.roleEmoji}>🛒</Text>
                  <View style={styles.roleTextWrap}>
                    <Text style={styles.roleTitle}>Comprador</Text>
                    <Text style={styles.roleHint}>Compro productos frescos</Text>
                  </View>
                </Pressable>
              </View>
            )}

            {submitError ? (
              <View style={styles.submitErrorBox} accessibilityLiveRegion="polite">
                <Text style={styles.submitErrorText}>{submitError}</Text>
              </View>
            ) : null}

            <Pressable
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={isLogin ? 'Iniciar sesión' : 'Registrarse'}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.greenDark} />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {isLogin ? 'Iniciar sesión' : 'Registrarse'}
                </Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.footer}>Simple, rápido y seguro 🌱</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.greenDark,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  logoEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 17,
    color: COLORS.grayLight,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.grayLight,
    borderRadius: 14,
    padding: 4,
    marginBottom: 22,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: COLORS.greenLight,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  toggleTextActive: {
    color: COLORS.white,
  },
  fieldBlock: {
    marginBottom: 6,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.greenDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 17,
    marginBottom: 6,
    color: '#212121',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorBg,
  },
  fieldErrorText: {
    fontSize: 14,
    color: COLORS.error,
    marginBottom: 12,
    lineHeight: 20,
  },
  hintNeutral: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 14,
    lineHeight: 20,
  },
  roleSection: {
    marginBottom: 4,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.grayLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  roleCardSelected: {
    borderColor: COLORS.greenDark,
    backgroundColor: '#E8F5E9',
  },
  roleCardWarn: {
    borderColor: COLORS.error,
  },
  roleEmoji: {
    fontSize: 36,
    marginRight: 14,
  },
  roleTextWrap: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  roleHint: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  submitErrorBox: {
    backgroundColor: COLORS.errorBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  submitErrorText: {
    fontSize: 15,
    color: COLORS.error,
    lineHeight: 22,
  },
  primaryBtn: {
    backgroundColor: COLORS.yellow,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  footer: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 15,
    color: COLORS.grayLight,
  },
});
