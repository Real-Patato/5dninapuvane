import React, { useState } from 'react';
import { getUsers, saveUser, setCurrentUser } from '../utils/storage';
import { supabase } from '../utils/supabaseClient';

async function handleSignUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
  });

  if (error) {
    alert(error.message);
  } else {
    // Pass the signed-up user object up to your handleAuthSuccess in App.jsx
    onAuthSuccess(data.user);
  }
}

async function handleSignIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    alert(error.message);
  } else {
    // Pass the logged-in user object up to your handleAuthSuccess in App.jsx
    onAuthSuccess(data.user);
  }
}

export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    const users = getUsers();

    if (isLogin) {
      // Handle Login
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (user) {
        setCurrentUser(user);
        onAuthSuccess(user);
      } else {
        setError('Invalid email or password.');
      }
    } else {
      // Handle Signup
      const userExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (userExists) {
        setError('An account with this email already exists.');
        return;
      }

      const newUser = {
        id: `user-${Date.now()}`,
        email,
        password,
        name
      };

      saveUser(newUser);
      setCurrentUser(newUser);
      setSuccess('Account created successfully! Logging you in...');
      setTimeout(() => {
        onAuthSuccess(newUser);
      }, 1000);
    }
  };

  const handleGuestLogin = () => {
    const users = getUsers();
    const guestUser = users.find(u => u.email === 'admin@aetherwms.com');
    if (guestUser) {
      setCurrentUser(guestUser);
      onAuthSuccess(guestUser);
    } else {
      // Fallback fallback if not initialized
      const defaultGuest = {
        id: 'user-1',
        email: 'admin@aetherwms.com',
        name: 'Alex Chief'
      };
      setCurrentUser(defaultGuest);
      onAuthSuccess(defaultGuest);
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.backgroundGlow1}></div>
      <div style={styles.backgroundGlow2}></div>

      <div style={styles.card} className="card glass">
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <div style={styles.logoIcon}>A</div>
            <h2 style={styles.title}>AetherWMS</h2>
          </div>
          <p style={styles.subtitle}>Warehouse Intelligence Platform</p>
        </div>

        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              color: isLogin ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: isLogin ? '2px solid var(--primary)' : '2px solid transparent'
            }}
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            Sign In
          </button>
          <button
            style={{
              ...styles.tab,
              color: !isLogin ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: !isLogin ? '2px solid var(--primary)' : '2px solid transparent'
            }}
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            Register
          </button>
        </div>

        {error && <div style={styles.errorAlert} className="badge-danger">{error}</div>}
        {success && <div style={styles.successAlert} className="badge-success">{success}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {!isLogin && (
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              type="email"
              className="input-field"
              placeholder="admin@aetherwms.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={styles.submitBtn}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>or</span>
        </div>

        <button
          type="button"
          onClick={handleGuestLogin}
          className="btn btn-secondary"
          style={styles.guestBtn}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Quick Demo Guest Access
        </button>

        <div style={styles.footer}>
          {isLogin ? (
            <p style={styles.footerText}>
              Testing credentials: <code style={styles.code}>admin@aetherwms.com</code> / <code style={styles.code}>password123</code>
            </p>
          ) : (
            <p style={styles.footerText}>
              Passwords are stored safely in local memory for offline validation.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-main)',
    position: 'relative',
    overflow: 'hidden',
    padding: '1.5rem'
  },
  backgroundGlow1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
    top: '-10%',
    left: '-10%',
    zIndex: 1,
    pointerEvents: 'none'
  },
  backgroundGlow2: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
    bottom: '-10%',
    right: '-10%',
    zIndex: 1,
    pointerEvents: 'none'
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '2.5rem',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 10,
    border: '1px solid var(--border-color)'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '2rem',
    textAlign: 'center'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.25rem'
  },
  logoIcon: {
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontWeight: 'bold',
    fontSize: '1.2rem',
    boxShadow: '0 4px 8px var(--primary-glow)'
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)'
  },
  tabs: {
    display: 'flex',
    width: '100%',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '1.5rem'
  },
  tab: {
    flex: 1,
    background: 'none',
    border: 'none',
    padding: '0.75rem',
    fontFamily: 'var(--font-display)',
    fontWeight: '600',
    fontSize: '0.95rem',
    cursor: 'pointer',
    textAlign: 'center',
    outline: 'none',
    transition: 'all var(--transition-fast)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column'
  },
  submitBtn: {
    marginTop: '0.5rem',
    padding: '0.75rem'
  },
  errorAlert: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    marginBottom: '1.25rem',
    border: '1px solid rgba(239, 68, 68, 0.2)'
  },
  successAlert: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    marginBottom: '1.25rem',
    border: '1px solid rgba(16, 185, 129, 0.2)'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '1.5rem 0',
    color: 'var(--text-muted)'
  },
  dividerText: {
    padding: '0 0.75rem',
    fontSize: '0.8rem',
    textTransform: 'uppercase'
  },
  guestBtn: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '0.9rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem'
  },
  footer: {
    marginTop: '1.5rem',
    textAlign: 'center'
  },
  footerText: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)'
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: '0.1rem 0.3rem',
    borderRadius: '4px',
    color: 'var(--text-primary)'
  }
};
