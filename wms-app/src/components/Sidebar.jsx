import React from 'react';

export default function Sidebar({
  warehouses,
  selectedWarehouse,
  onSelectWarehouse,
  onCreateWarehouseClick,
  onDeleteWarehouseClick,
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  isDarkTheme,
  onToggleTheme
}) {
  return (
    <aside style={styles.sidebar} className="glass">
      {/* Brand Logo */}
      <div style={styles.brand}>
        <div style={styles.logoIcon}>A</div>
        <div style={styles.brandName}>AetherWMS</div>
      </div>

      {/* Warehouse Selector Dropdown */}
      <div style={styles.selectorSection}>
        <label style={styles.selectorLabel}>Warehouse Space</label>
        <div style={styles.selectorContainer}>
          <select
            className="input-select"
            style={styles.dropdown}
            value={selectedWarehouse ? selectedWarehouse.id : ''}
            onChange={(e) => {
              const wh = warehouses.find(w => w.id === e.target.value);
              if (wh) onSelectWarehouse(wh);
            }}
          >
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.rows}x{wh.columns})
              </option>
            ))}
          </select>
          <button
            onClick={onCreateWarehouseClick}
            className="btn btn-secondary"
            style={styles.plusBtn}
            title="Create New Warehouse"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        {/* Delete Warehouse Button */}
        {selectedWarehouse && (
          <button
            onClick={onDeleteWarehouseClick}
            className="btn"
            style={styles.deleteWarehouseBtn}
            title="Permanently delete this warehouse"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            Delete Warehouse
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <nav style={styles.navMenu}>
        <button
          onClick={() => setActiveTab('grid')}
          style={{
            ...styles.navItem,
            ...(activeTab === 'grid' ? styles.activeNavItem : {})
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={styles.navIcon}>
            <rect x="3" y="3" width="7" height="9" />
            <rect x="14" y="3" width="7" height="5" />
            <rect x="14" y="12" width="7" height="9" />
            <rect x="3" y="16" width="7" height="5" />
          </svg>
          Warehouse Grid
        </button>

        <button
          onClick={() => setActiveTab('custom-fields')}
          style={{
            ...styles.navItem,
            ...(activeTab === 'custom-fields' ? styles.activeNavItem : {})
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={styles.navIcon}>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          Custom Fields Config
        </button>
      </nav>

      {/* Bottom Profile and Theme Toggle */}
      <div style={styles.bottomSection}>
        {/* Theme Toggle Button */}
        <button onClick={onToggleTheme} style={styles.themeToggle} className="btn btn-secondary">
          {isDarkTheme ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              Light Mode
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              Dark Mode
            </>
          )}
        </button>

        {/* Profile Card */}
        <div style={styles.profileCard}>
          <div style={styles.avatar}>
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div style={styles.profileDetails}>
            <div style={styles.profileName}>{currentUser?.name || 'User'}</div>
            <div style={styles.profileEmail}>{currentUser?.email || 'user@aetherwms.com'}</div>
          </div>
          <button onClick={onLogout} style={styles.logoutBtn} title="Sign Out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '280px',
    borderRight: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-sidebar)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    padding: '1.5rem',
    flexShrink: 0
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '2.5rem'
  },
  logoIcon: {
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontFamily: 'var(--font-display)',
    fontSize: '1rem',
    boxShadow: '0 4px 8px var(--primary-glow)'
  },
  brandName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  selectorSection: {
    marginBottom: '2rem'
  },
  selectorLabel: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'block',
    marginBottom: '0.5rem'
  },
  selectorContainer: {
    display: 'flex',
    gap: '0.5rem',
    width: '100%'
  },
  dropdown: {
    flexGrow: 1,
    padding: '0.5rem 0.75rem',
    fontSize: '0.9rem',
    minWidth: 0
  },
  plusBtn: {
    padding: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  deleteWarehouseBtn: {
    marginTop: '0.5rem',
    width: '100%',
    padding: '0.4rem 0.75rem',
    fontSize: '0.78rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: 'var(--danger)',
    borderRadius: '7px',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  navMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    flexGrow: 1
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-display)',
    fontWeight: '500',
    fontSize: '0.95rem',
    cursor: 'pointer',
    textAlign: 'left',
    outline: 'none',
    transition: 'all var(--transition-fast)'
  },
  activeNavItem: {
    background: 'rgba(59, 130, 246, 0.12)',
    color: 'var(--primary)',
    fontWeight: '600'
  },
  navIcon: {
    flexShrink: 0
  },
  bottomSection: {
    marginTop: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid var(--border-color)'
  },
  themeToggle: {
    width: '100%',
    padding: '0.5rem',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  profileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0',
    borderTop: '1px solid transparent'
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontFamily: 'var(--font-display)',
    fontSize: '1rem',
    flexShrink: 0
  },
  profileDetails: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    flexGrow: 1
  },
  profileName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  profileEmail: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.25rem',
    borderRadius: '4px',
    transition: 'color var(--transition-fast)'
  }
};
