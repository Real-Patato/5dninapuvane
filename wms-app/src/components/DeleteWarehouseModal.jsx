import React, { useState } from 'react';

export default function DeleteWarehouseModal({ warehouse, onClose, onConfirm }) {
  const [typedName, setTypedName] = useState('');
  const isConfirmed = typedName.trim() === warehouse?.name?.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isConfirmed) return;
    onConfirm();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container animate-scale-in"
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.dangerIconWrap}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <div>
              <h3 style={styles.title}>Delete Warehouse</h3>
              <p style={styles.subtitle}>This action is permanent and cannot be undone</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Warning Banner */}
          <div style={styles.warningBanner}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div style={styles.warningText}>
              <strong style={{ color: 'var(--danger)' }}>You are about to permanently delete:</strong>
              <div style={styles.warehouseName}>&ldquo;{warehouse?.name}&rdquo;</div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                All floor plan data, cell configurations, product inventory, and custom metadata for this warehouse will be <strong>irreversibly destroyed</strong>.
              </span>
            </div>
          </div>

          {/* Details Card */}
          <div style={styles.detailsCard} className="card">
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Warehouse</span>
              <span style={styles.detailValue}>{warehouse?.name}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Grid Size</span>
              <span style={styles.detailValue}>{warehouse?.rows} rows × {warehouse?.columns} columns</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Configured Cells</span>
              <span style={styles.detailValue}>{Object.keys(warehouse?.cells || {}).length} cells</span>
            </div>
          </div>

          {/* Confirmation Form */}
          <form onSubmit={handleSubmit} style={styles.form}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={styles.confirmLabel}>
                To confirm, type the warehouse name exactly:
                <span style={styles.nameHint}>&nbsp;{warehouse?.name}</span>
              </label>
              <input
                type="text"
                className="input-field"
                style={{
                  ...styles.confirmInput,
                  borderColor: typedName
                    ? isConfirmed
                      ? 'var(--danger)'
                      : 'rgba(239,68,68,0.3)'
                    : 'var(--border-color)'
                }}
                placeholder={`Type "${warehouse?.name}" to enable deletion`}
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                autoFocus
                autoComplete="off"
              />
            </div>

            {/* Action Buttons */}
            <div style={styles.actions}>
              <button
                type="button"
                className="btn btn-secondary"
                style={styles.cancelBtn}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn"
                style={{
                  ...styles.deleteBtn,
                  opacity: isConfirmed ? 1 : 0.4,
                  cursor: isConfirmed ? 'pointer' : 'not-allowed',
                  pointerEvents: isConfirmed ? 'auto' : 'none'
                }}
                disabled={!isConfirmed}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete Warehouse Permanently
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  modal: {
    maxWidth: '520px',
    width: '100%'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid rgba(239, 68, 68, 0.15)',
    backgroundColor: 'rgba(239, 68, 68, 0.04)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  dangerIconWrap: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  title: {
    fontSize: '1.15rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  subtitle: {
    fontSize: '0.78rem',
    color: 'var(--danger)',
    marginTop: '0.1rem',
    fontWeight: '500'
  },
  body: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  warningBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.875rem',
    padding: '1rem 1.25rem',
    borderRadius: '10px',
    backgroundColor: 'rgba(239, 68, 68, 0.07)',
    border: '1px solid rgba(239, 68, 68, 0.2)'
  },
  warningText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  warehouseName: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontFamily: 'monospace',
    marginTop: '0.2rem'
  },
  detailsCard: {
    padding: '0.875rem 1rem',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem'
  },
  detailLabel: {
    color: 'var(--text-muted)',
    fontWeight: '500'
  },
  detailValue: {
    color: 'var(--text-primary)',
    fontFamily: 'monospace',
    fontWeight: '600'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  confirmLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  nameHint: {
    fontFamily: 'monospace',
    color: 'var(--danger)',
    fontWeight: '700',
    fontSize: '0.85rem'
  },
  confirmInput: {
    letterSpacing: '0.02em',
    fontFamily: 'monospace'
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end'
  },
  cancelBtn: {
    flex: 1
  },
  deleteBtn: {
    flex: 2,
    backgroundColor: 'var(--danger)',
    color: '#ffffff',
    border: 'none',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    borderRadius: '8px',
    fontFamily: 'var(--font-display)',
    fontWeight: '600',
    fontSize: '0.9rem',
    transition: 'all 0.2s'
  }
};
