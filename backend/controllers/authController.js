const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const MIN_PASSWORD_LENGTH = 8;
const MIN_NAME_LENGTH = 2;

function isValidEmail(email) {
  const s = String(email || '').trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

const PHONE_DIGITS = 10;

function normalizePhone(p) {
  return String(p || '').replace(/\D/g, '');
}

function isValidPhone(value) {
  const n = normalizePhone(value);
  return n.length === PHONE_DIGITS && /^[0-9]+$/.test(n);
}

function isValidPersonName(value) {
  const t = String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
  if (t.length < MIN_NAME_LENGTH || t.length > 60) return false;
  if (/[0-9]/.test(t)) return false;
  return /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]+$/.test(t);
}

function signToken(userId) {
  return jwt.sign({ userId: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

function userPayload(user) {
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    nombre: user.nombre || '',
    apellido: user.apellido || '',
    telefono: user.telefono || '',
  };
}

const ALLOWED_ROLES = ['agricultor', 'comprador'];

async function register(req, res) {
  try {
    const emailRaw = req.body?.email;
    const password = req.body?.password;
    const roleRaw = req.body?.role;
    const nombreRaw = req.body?.nombre;
    const apellidoRaw = req.body?.apellido;
    const telefonoRaw = req.body?.telefono;

    const normalizedEmail =
      emailRaw != null ? String(emailRaw).toLowerCase().trim() : '';
    const role =
      roleRaw != null ? String(roleRaw).trim().toLowerCase() : '';
    const nombre = nombreRaw != null ? String(nombreRaw).trim() : '';
    const apellido = apellidoRaw != null ? String(apellidoRaw).trim() : '';
    const telefonoNorm = normalizePhone(telefonoRaw);

    if (
      !normalizedEmail ||
      password == null ||
      password === '' ||
      !role ||
      !nombre ||
      !apellido ||
      !telefonoNorm
    ) {
      return res.status(400).json({
        message:
          'Completa nombre, apellido, celular, correo, contraseña y tipo de usuario.',
      });
    }
    if (!isValidPersonName(nombre)) {
      return res.status(400).json({
        message:
          'El nombre: solo letras y espacios, sin números ni caracteres especiales (mínimo 2 letras).',
      });
    }
    if (!isValidPersonName(apellido)) {
      return res.status(400).json({
        message:
          'El apellido: solo letras y espacios, sin números ni caracteres especiales (mínimo 2 letras).',
      });
    }
    if (!isValidPhone(telefonoRaw)) {
      return res.status(400).json({
        message:
          'El celular debe tener exactamente 10 dígitos, solo números (sin letras ni símbolos).',
      });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        message: 'El tipo de usuario debe ser agricultor o comprador.',
      });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: 'Escribe un correo electrónico válido (ejemplo@correo.com).',
      });
    }
    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(409).json({
        message: 'Ese correo ya está registrado. Prueba a iniciar sesión.',
      });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      nombre,
      apellido,
      telefono: telefonoNorm,
      email: normalizedEmail,
      password: hash,
      role,
    });

    const token = signToken(user._id);
    return res.status(201).json({
      message: 'Usuario registrado',
      token,
      user: userPayload(user),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error' });
  }
}

async function login(req, res) {
  try {
    const emailRaw = req.body?.email;
    const password = req.body?.password;

    const normalizedEmail =
      emailRaw != null ? String(emailRaw).toLowerCase().trim() : '';

    if (!normalizedEmail || password == null || password === '') {
      return res.status(400).json({
        message: 'Escribe tu correo y contraseña.',
      });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: 'Escribe un correo electrónico válido (ejemplo@correo.com).',
      });
    }
    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+password'
    );
    if (!user) {
      return res.status(401).json({
        message:
          'No existe una cuenta con este correo. Revisa el correo o regístrate.',
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({
        message: 'La contraseña no es correcta. Vuelve a intentarlo.',
      });
    }

    const token = signToken(user._id);
    return res.json({
      message: 'Bienvenido',
      token,
      user: userPayload(user),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error' });
  }
}

module.exports = { register, login };
