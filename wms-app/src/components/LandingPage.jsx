import React from 'react';

export default function LandingPage({ onNavigate, currentUser }) {
  return (
    <div style={styles.container}>
      {/* Background Decor */}
      <div style={styles.glow1}></div>
      <div style={styles.glow2}></div>

      {/* Navigation Header */}
      <header style={styles.header} className="glass">
        <div style={styles.logo}>
          <div style={styles.logoIcon}>A</div>
          <span style={styles.logoText}>AetherWMS</span>
        </div>
        <div style={styles.navLinks}>
          <a href="#features" style={styles.navLink}>Features</a>
          <a href="#benefits" style={styles.navLink}>Benefits</a>
          {currentUser ? (
            <button
              onClick={() => onNavigate('dashboard')}
              className="btn btn-primary"
            >
              Dashboard
            </button>
          ) : (
            <button
              onClick={() => onNavigate('auth')}
              className="btn btn-secondary"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section style={styles.heroSection} className="animate-fade-in">
        <div style={styles.heroContent}>
          <div style={styles.badge} className="badge badge-primary">
            Next-Gen Warehouse Logistics
          </div>
          <h1 style={styles.heroTitle}>
            Spatial Inventory <br />
            <span style={styles.heroTitleGradient}>Intelligence Platform</span>
          </h1>
          <p style={styles.heroSubtitle}>
            AetherWMS empowers logistics, manufacturing, and ecommerce operators to visualize physical space, manage dynamic product fields, and track inventory metrics with absolute precision.
          </p>
          <div style={styles.ctaGroup}>
            <button
              onClick={() => onNavigate(currentUser ? 'dashboard' : 'auth')}
              className="btn btn-primary"
              style={styles.heroBtnPrimary}
            >
              {currentUser ? 'Go to Dashboard' : 'Get Started for Free'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
            <a href="#features" className="btn btn-secondary" style={styles.heroBtnSecondary}>
              Explore Features
            </a>
          </div>
        </div>

        {/* Hero Visual Mockup */}
        <div style={styles.heroVisual} className="card glass">
          <div style={styles.visualHeader}>
            <div style={styles.dots}>
              <span style={{...styles.dot, backgroundColor: '#ef4444'}}></span>
              <span style={{...styles.dot, backgroundColor: '#f59e0b'}}></span>
              <span style={{...styles.dot, backgroundColor: '#10b981'}}></span>
            </div>
            <div style={styles.visualTitle}>Main Storage Grid Preview</div>
          </div>
          <div style={styles.mockGrid}>
            {[
              { id: 'A1', cat: 'Milk', pal: '4.2', fill: '84%', color: 'var(--success)' },
              { id: 'A2', cat: 'Beverages', pal: '3.0', fill: '60%', color: 'var(--primary)' },
              { id: 'A3', cat: 'Empty', pal: '0.0', fill: '0%', color: 'var(--text-muted)' },
              { id: 'B1', cat: 'Electronics', pal: '5.0', fill: '100%', color: 'var(--warning)' },
              { id: 'B2', cat: 'Produce', pal: '2.4', fill: '48%', color: 'var(--accent)' },
              { id: 'B3', cat: 'Dairy', pal: '1.2', fill: '24%', color: 'var(--primary)' }
            ].map((cell, idx) => (
              <div key={idx} style={{...styles.mockCell, border: `1px solid ${cell.fill !== '0%' ? 'var(--border-hover)' : 'var(--border-color)'}`}}>
                <div style={styles.mockCellHeader}>
                  <span style={styles.mockCellId}>{cell.id}</span>
                  <span style={{...styles.mockCellBadge, color: cell.color}}>{cell.cat}</span>
                </div>
                <div style={styles.mockCellProgressContainer}>
                  <div style={{...styles.mockCellProgress, width: cell.fill, backgroundColor: cell.color}}></div>
                </div>
                <div style={styles.mockCellFooter}>
                  <span>Pallets: {cell.pal}</span>
                  <span>{cell.fill}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" style={styles.featuresSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Precision Tools for Modern Operations</h2>
          <p style={styles.sectionSubtitle}>
            Engineered to remove inventory management blindspots and scale without complexity.
          </p>
        </div>

        <div style={styles.featuresGrid}>
          <div style={styles.featureCard} className="card glass">
            <div style={{...styles.featureIcon, background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
            </div>
            <h3 style={styles.featureTitle}>Visual Warehouse Grids</h3>
            <p style={styles.featureDesc}>
              Map your physical rows and columns dynamically. Color indicators let you see empty space, capacity alerts, and inventory categorization in real-time.
            </p>
          </div>

          <div style={styles.featureCard} className="card glass">
            <div style={{...styles.featureIcon, background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent)'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3 style={styles.featureTitle}>Flexible Custom Metadata</h3>
            <p style={styles.featureDesc}>
              Define custom fields (e.g. temperature requirements, supplier codes, batch numbers) on the fly. Support text, numbers, and dates out of the box.
            </p>
          </div>

          <div style={styles.featureCard} className="card glass">
            <div style={{...styles.featureIcon, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                <path d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
            </div>
            <h3 style={styles.featureTitle}>Pallet Optimization metrics</h3>
            <p style={styles.featureDesc}>
              Track inventory using custom conversion rates. Input raw units and allow the system to calculate layout volume and total occupied pallet metrics.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>© 2026 AetherWMS Technology Group. Built for extreme logistics excellence.</p>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'var(--bg-main)',
    minHeight: '100vh',
    width: '100vw',
    position: 'relative',
    overflowY: 'auto',
    overflowX: 'hidden'
  },
  glow1: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
    top: '-20%',
    right: '-10%',
    zIndex: 1,
    pointerEvents: 'none'
  },
  glow2: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
    bottom: '20%',
    left: '-10%',
    zIndex: 1,
    pointerEvents: 'none'
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 3rem',
    margin: '0 auto',
    maxWidth: '1400px',
    borderRadius: '0 0 12px 12px'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  logoIcon: {
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontFamily: 'var(--font-display)',
    fontSize: '1rem'
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem'
  },
  navLink: {
    color: 'var(--text-secondary)',
    fontWeight: '500',
    fontSize: '0.95rem'
  },
  heroSection: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr',
    gap: '4rem',
    alignItems: 'center',
    padding: '6rem 3rem',
    maxWidth: '1400px',
    margin: '0 auto',
    zIndex: 10,
    position: 'relative'
  },
  heroContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  badge: {
    marginBottom: '1.5rem',
    padding: '0.4rem 0.8rem',
    fontWeight: '600'
  },
  heroTitle: {
    fontSize: '3.75rem',
    lineHeight: '1.15',
    fontWeight: '800',
    color: 'var(--text-primary)',
    marginBottom: '1.5rem'
  },
  heroTitleGradient: {
    background: 'linear-gradient(to right, var(--primary), var(--accent))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  heroSubtitle: {
    fontSize: '1.15rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    marginBottom: '2.5rem',
    maxWidth: '560px'
  },
  ctaGroup: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center'
  },
  heroBtnPrimary: {
    padding: '0.8rem 1.75rem',
    fontSize: '1rem',
    gap: '0.75rem'
  },
  heroBtnSecondary: {
    padding: '0.8rem 1.75rem',
    fontSize: '1rem'
  },
  heroVisual: {
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border-color)',
    height: 'fit-content'
  },
  visualHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '1rem',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '1.5rem'
  },
  dots: {
    display: 'flex',
    gap: '0.35rem'
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },
  visualTitle: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontFamily: 'monospace'
  },
  mockGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem'
  },
  mockCell: {
    padding: '0.75rem',
    borderRadius: '8px',
    background: 'rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  mockCellHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  mockCellId: {
    fontSize: '0.85rem',
    fontWeight: '700',
    fontFamily: 'monospace',
    color: 'var(--text-primary)'
  },
  mockCellBadge: {
    fontSize: '0.7rem',
    fontWeight: '600'
  },
  mockCellProgressContainer: {
    height: '4px',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  mockCellProgress: {
    height: '100%',
    borderRadius: '2px'
  },
  mockCellFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontFamily: 'monospace'
  },
  featuresSection: {
    padding: '6rem 3rem',
    maxWidth: '1400px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 10
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '4rem'
  },
  sectionTitle: {
    fontSize: '2.25rem',
    color: 'var(--text-primary)',
    marginBottom: '1rem'
  },
  sectionSubtitle: {
    fontSize: '1.05rem',
    color: 'var(--text-secondary)',
    maxWidth: '600px',
    margin: '0 auto'
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '2rem'
  },
  featureCard: {
    padding: '2.5rem 2rem',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  featureIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem'
  },
  featureTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '0.75rem'
  },
  featureDesc: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.6'
  },
  footer: {
    padding: '3rem',
    textAlign: 'center',
    borderTop: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    marginTop: '4rem'
  }
};
