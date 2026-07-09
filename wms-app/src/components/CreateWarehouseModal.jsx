import React, { useState } from 'react';

export default function CreateWarehouseModal({ onClose, onCreate, onEdit, warehouseToEdit }) {
  const isEditing = !!warehouseToEdit;
  const [name, setName] = useState(warehouseToEdit ? warehouseToEdit.name : '');
  const [rows, setRows] = useState(warehouseToEdit ? warehouseToEdit.rows : 5);
  const [columns, setColumns] = useState(warehouseToEdit ? warehouseToEdit.columns : 6);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Warehouse name is required.');
      return;
    }

    if (rows < 1 || rows > 30) {
      setError('Rows must be between 1 and 30.');
      return;
    }

    if (columns < 1 || columns > 30) {
      setError('Columns must be between 1 and 30.');
      return;
    }

    const payload = {
      name: name.trim(),
      rows: parseInt(rows, 10),
      columns: parseInt(columns, 10)
    };

    if (isEditing) {
      onEdit(payload);
    } else {
      onCreate(payload);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={styles.modal}
      >
        <div className="modal-header">
          <h3 style={styles.title}>
            {isEditing ? 'Configure Workspace Layout' : 'Initialize New Warehouse'}
          </h3>
          <button className="btn-icon" onClick={onClose} style={styles.closeBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="badge-danger" style={styles.errorAlert}>{error}</div>}

            <div className="input-group">
              <label className="input-label">Warehouse Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. North Distribution Annex"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div style={styles.dimensionsRow}>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Vertical Rows (Max 30)</label>
                <input
                  type="number"
                  className="input-field"
                  min="1"
                  max="30"
                  value={rows}
                  onChange={(e) => setRows(e.target.value)}
                  required
                />
                <span style={styles.inputHint}>Rows are lettered (A, B, C...)</span>
              </div>

              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Horizontal Columns (Max 30)</label>
                <input
                  type="number"
                  className="input-field"
                  min="1"
                  max="30"
                  value={columns}
                  onChange={(e) => setColumns(e.target.value)}
                  required
                />
                <span style={styles.inputHint}>Columns are numbered (1, 2, 3...)</span>
              </div>
            </div>

            <div style={styles.previewBox} className="card">
              <div style={styles.previewTitle}>Layout Grid Map Preview</div>
              <div style={styles.previewDescription}>
                This will {isEditing ? 'resize your' : 'initialize a'} grid of <strong>{rows * columns}</strong> storage cells, labeled from <strong>A-1</strong> up to <strong>{String.fromCharCode(64 + parseInt(rows || 1, 10))}-{columns}</strong>.
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditing ? 'Save Layout Settings' : 'Create Warehouse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  modal: {
    maxWidth: '500px'
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  closeBtn: {
    padding: '0.25rem'
  },
  errorAlert: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    marginBottom: '1.25rem',
    border: '1px solid rgba(239, 68, 68, 0.2)'
  },
  dimensionsRow: {
    display: 'flex',
    gap: '1.5rem',
    marginBottom: '1rem'
  },
  inputHint: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.1rem'
  },
  previewBox: {
    marginTop: '1.5rem',
    padding: '1rem',
    background: 'rgba(0, 0, 0, 0.1)',
    border: '1px dashed var(--border-color)'
  },
  previewTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: '600',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginBottom: '0.25rem'
  },
  previewDescription: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)'
  }
};
