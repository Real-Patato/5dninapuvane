import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { store } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'aetherwms-secret-sqlite-key-2026-prod';

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function handleLogin(body) {
  const { email, password } = body || {};
  if (!email || !password) {
    return { status: 400, data: { success: false, error: 'Email and password are required.' } };
  }

  const user = store.findByEmail(email);
  if (!user) {
    return { status: 401, data: { success: false, error: 'Invalid email or password.' } };
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return { status: 401, data: { success: false, error: 'Invalid email or password.' } };
  }

  const token = generateToken(user);
  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.created_at
  };

  return {
    status: 200,
    data: {
      success: true,
      token,
      user: safeUser
    }
  };
}

export function handleRegister(body) {
  const { email, password, name, role } = body || {};
  if (!email || !password || !name) {
    return { status: 400, data: { success: false, error: 'Email, password, and name are required.' } };
  }

  const existing = store.findByEmail(email);
  if (existing) {
    return { status: 409, data: { success: false, error: 'An account with this email address already exists.' } };
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const newId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const user = store.createUser({
    id: newId,
    email,
    passwordHash,
    name,
    role: role || 'Warehouse Manager'
  });

  const token = generateToken(user);
  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.created_at
  };

  return {
    status: 201,
    data: {
      success: true,
      token,
      user: safeUser
    }
  };
}

export function handleVerifySession(token) {
  if (!token) {
    return { status: 401, data: { success: false, error: 'No authorization token provided.' } };
  }

  try {
    const cleanToken = token.replace(/^Bearer\s+/i, '');
    const decoded = jwt.verify(cleanToken, JWT_SECRET);
    const user = store.findById(decoded.id);
    if (!user) {
      return { status: 401, data: { success: false, error: 'User session expired or account not found.' } };
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.created_at
    };

    return {
      status: 200,
      data: {
        success: true,
        user: safeUser
      }
    };
  } catch (err) {
    return { status: 401, data: { success: false, error: 'Invalid or expired session token.' } };
  }
}
