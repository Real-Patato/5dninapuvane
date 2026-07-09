import React, { useState } from 'react';

export default function CustomFieldsConfig({ customFields, onSaveCustomFields }) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState('text');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleAddField = (e) => {
    e.preventDefault();
    setError('');

    if (!label.trim()) {
      setError('Field label is required.');
      return;
    }

    const fieldId = `field-${Date.now()}`;
    const newField = {
      id: fieldId,
      label: label.trim(),
      type,
      description: description.trim()
    };

    const updated = [...customFields, newField];
    onSaveCustomFields(updated);

    // Reset Form
    setLabel('');
    setType('text');
    setDescription('');
  };

  const handleDeleteField = (id) => {
    const updated = customFields.filter(f => f.id !== id);
    onSaveCustomFields(updated);
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h2 style={styles.title}>Dynamic Custom Fields Engine</h2>
        <p style={styles.subtitle}>
          Create custom metadata fields to capture unique parameters (e.g. Batch Numbers, Temperature Requirements, Supplier Codes). Custom fields dynamically extend product forms across all storage cells.
        </p>
      </div>

      <div style={styles.contentLayout}>
        {/* Create Field Form */}
        <div style={styles.formCard} className="card glass">
          <h3 style={styles.cardTitle}>Define New Metadata Field</h3>
          {error && <div className="badge-danger" style={styles.errorAlert}>{error}</div>}

          <form onSubmit={handleAddField} style={styles.form}>
            <div className="input-group">
              <label className="input-label">Field Label</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Supplier Batch No"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Field Value Type</label>
              <select
                className="input-select"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="text">Text (Alpha-numeric value)</option>
                <option value="number">Number (Numeric capacity/counts)</option>
                <option value="date">Date (Timestamp/Expiration)</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Description (Optional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Unique batch track number code"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={styles.submitBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Register Field
            </button>
          </form>
        </div>

        {/* Fields List */}
        <div style={styles.listCard} className="card glass">
          <h3 style={styles.cardTitle}>Active Custom Schemas ({customFields.length})</h3>
          
          {customFields.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No custom fields configured yet.</p>
              <p style={styles.emptySubtext}>Use the form on the left to add your first metadata field.</p>
            </div>
          ) : (
            <div style={styles.fieldsGrid}>
              {customFields.map((field) => (
                <div key={field.id} style={styles.fieldItem} className="card">
                  <div style={styles.fieldHeader}>
                    <h4 style={styles.fieldLabel}>{field.label}</h4>
                    <span className="badge badge-primary" style={styles.fieldTypeBadge}>
                      {field.type}
                    </span>
                  </div>
                  {field.description && (
                    <p style={styles.fieldDesc}>{field.description}</p>
                  )}
                  <div style={styles.fieldFooter}>
                    <span style={styles.fieldId}>Schema ID: {field.id}</span>
                    <button
                      onClick={() => handleDeleteField(field.id)}
                      className="btn btn-icon"
                      style={styles.deleteBtn}
                      title="Remove Field Schema"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    maxWidth: '800px',
    lineHeight: '1.5'
  },
  contentLayout: {
    display: 'grid',
    gridTemplateColumns: '400px 1fr',
    gap: '2rem',
    alignItems: 'start'
  },
  formCard: {
    padding: '1.5rem',
    borderRadius: '12px'
  },
  listCard: {
    padding: '1.5rem',
    borderRadius: '12px',
    minHeight: '400px'
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    marginBottom: '1.25rem',
    color: 'var(--text-primary)'
  },
  errorAlert: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    marginBottom: '1.25rem',
    border: '1px solid rgba(239, 68, 68, 0.2)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column'
  },
  submitBtn: {
    marginTop: '0.5rem',
    padding: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    textAlign: 'center'
  },
  emptyText: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '0.25rem'
  },
  emptySubtext: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)'
  },
  fieldsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.25rem'
  },
  fieldItem: {
    padding: '1.25rem',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '0.75rem',
    background: 'rgba(0, 0, 0, 0.1)'
  },
  fieldHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.5rem'
  },
  fieldLabel: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    lineHeight: '1.2'
  },
  fieldTypeBadge: {
    fontSize: '0.7rem',
    padding: '0.2rem 0.5rem'
  },
  fieldDesc: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4'
  },
  fieldFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: '0.75rem',
    borderTop: '1px solid var(--border-color)'
  },
  fieldId: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontFamily: 'monospace'
  },
  deleteBtn: {
    color: 'var(--text-muted)',
    padding: '0.25rem'
  }
};
