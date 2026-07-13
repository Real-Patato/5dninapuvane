import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'aether.db');

// We use node:sqlite or fallback to pure memory/file JSON database if sqlite is unavailable
let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  try {
    // Attempt built-in Node v22+ sqlite driver
    const { DatabaseSync } = awaitImportNodeSqlite();
    if (DatabaseSync) {
      dbInstance = new DatabaseSync(DB_PATH);
      initializeSchema(dbInstance);
      return dbInstance;
    }
  } catch (err) {
    console.warn('[SQLite Backend] Native node:sqlite warning/fallback:', err.message);
  }

  // Fallback to pure JSON file-backed SQLite simulation if sqlite module fails to load
  dbInstance = new JsonFileDatabase(DB_PATH + '.json');
  initializeSchema(dbInstance);
  return dbInstance;
}

function awaitImportNodeSqlite() {
  try {
    // Synchronous require or dynamic check
    const sqliteModule = import('node:sqlite');
    return sqliteModule;
  } catch {
    return null;
  }
}

// Ensure schema and seeding
export function initializeSchema(db) {
  if (db instanceof JsonFileDatabase) {
    db.init();
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS aether_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'Admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default admin if not exists
    const checkStmt = db.prepare('SELECT id FROM aether_users WHERE email = ?');
    const existing = checkStmt.get('admin@aetherwms.com');
    if (!existing) {
      const insertStmt = db.prepare(`
        INSERT INTO aether_users (id, email, password_hash, name, role)
        VALUES (?, ?, ?, ?, ?)
      `);
      const defaultHash = bcrypt.hashSync('password123', 10);
      insertStmt.run('user-admin-sqlite', 'admin@aetherwms.com', defaultHash, 'Alex Chief (Admin)', 'System Administrator');
      console.log('[SQLite Backend] Seeded default user admin@aetherwms.com / password123 into aether.db');
    }
  }
}

// Synchronous wrapper for node:sqlite or JSON file database
export class SQLiteUserStore {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    try {
      // Dynamic synchronous check for node:sqlite
      const { DatabaseSync } = require('node:sqlite');
      this.db = new DatabaseSync(DB_PATH);
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS aether_users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'Admin',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      const checkStmt = this.db.prepare('SELECT id FROM aether_users WHERE email = ?');
      const existing = checkStmt.get('admin@aetherwms.com');
      if (!existing) {
        const insertStmt = this.db.prepare(`
          INSERT INTO aether_users (id, email, password_hash, name, role)
          VALUES (?, ?, ?, ?, ?)
        `);
        const defaultHash = bcrypt.hashSync('password123', 10);
        insertStmt.run('user-admin-sqlite', 'admin@aetherwms.com', defaultHash, 'Alex Chief (Admin)', 'System Administrator');
        console.log('[SQLite Backend] Seeded admin@aetherwms.com into SQLite database.');
      }
    } catch (err) {
      console.log('[SQLite Backend] Using file-backed storage fallback:', err.message);
      this.db = new JsonFileDatabase(DB_PATH + '.json');
      this.db.init();
    }
  }

  findByEmail(email) {
    if (this.db instanceof JsonFileDatabase) {
      return this.db.findByEmail(email);
    }
    const stmt = this.db.prepare('SELECT id, email, password_hash, name, role, created_at FROM aether_users WHERE lower(email) = lower(?)');
    return stmt.get(email);
  }

  findById(id) {
    if (this.db instanceof JsonFileDatabase) {
      return this.db.findById(id);
    }
    const stmt = this.db.prepare('SELECT id, email, password_hash, name, role, created_at FROM aether_users WHERE id = ?');
    return stmt.get(id);
  }

  createUser({ id, email, passwordHash, name, role = 'Warehouse Manager' }) {
    if (this.db instanceof JsonFileDatabase) {
      return this.db.createUser({ id, email, passwordHash, name, role });
    }
    const stmt = this.db.prepare(`
      INSERT INTO aether_users (id, email, password_hash, name, role)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, email, passwordHash, name, role);
    return this.findById(id);
  }
}

class JsonFileDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.users = [];
  }

  init() {
    if (fs.existsSync(this.filePath)) {
      try {
        const data = fs.readFileSync(this.filePath, 'utf8');
        this.users = JSON.parse(data || '[]');
      } catch {
        this.users = [];
      }
    }
    const existing = this.users.find(u => u.email.toLowerCase() === 'admin@aetherwms.com');
    if (!existing) {
      const defaultHash = bcrypt.hashSync('password123', 10);
      this.users.push({
        id: 'user-admin-sqlite',
        email: 'admin@aetherwms.com',
        password_hash: defaultHash,
        name: 'Alex Chief (Admin)',
        role: 'System Administrator',
        created_at: new Date().toISOString()
      });
      this.save();
      console.log('[SQLite Backend File-Store] Seeded admin@aetherwms.com');
    }
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.users, null, 2), 'utf8');
  }

  findByEmail(email) {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  findById(id) {
    return this.users.find(u => u.id === id) || null;
  }

  createUser({ id, email, passwordHash, name, role }) {
    const user = {
      id,
      email,
      password_hash: passwordHash,
      name,
      role: role || 'Warehouse Manager',
      created_at: new Date().toISOString()
    };
    this.users.push(user);
    this.save();
    return user;
  }
}

export const store = new SQLiteUserStore();
