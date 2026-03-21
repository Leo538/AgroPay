const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const MIN_PASSWORD_LENGTH = 8;

function isValidEmail(email) {
  const s = String(email || '').trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function signToken(userId) {
  return jwt.sign({ userId: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

const ALLOWED_ROLES = ['agricultor', 'comprador'];

async function register(req, res) {
  try {
    const emailRaw = req.body?.email;
    const password = req.body?.password;
    const roleRaw = req.body?.role;

    const normalizedEmail =
      emailRaw != null ? String(emailRaw).toLowerCase().trim() : '';
    const role =
      roleRaw != null ? String(roleRaw).trim().toLowerCase() : '';

    if (!normalizedEmail || password == null || password === '' || !role) {
      return res.status(400).json({
        message: 'Completa correo, contraseña y tipo de usuario (agricultor o comprador).',
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
      email: normalizedEmail,
      password: hash,
      role: role,
    });

    const token = signToken(user._id);
    return res.status(201).json({
      message: 'Usuario registrado',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
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
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error' });
  }
}

module.exports = { register, login };
