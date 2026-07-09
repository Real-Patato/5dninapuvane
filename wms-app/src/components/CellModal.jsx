import React, { useState, useEffect } from 'react';
import { calculatePallets } from '../utils/mockData';

export default function CellModal({
  coordinate,
  cellData,
  customFields,
  onClose,
  onSaveCellData
}) {
  const isCellEmpty = !cellData.products || cellData.products.length === 0;

  // Form states
  const [category, setCategory] = useState(cellData.category || '');
  const [editingProductId, setEditingProductId] = useState(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [itemsPerPallet, setItemsPerPallet] = useState('');
  const [stock, setStock] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  
  // Custom fields inputs state
  const [customFieldsValues, setCustomFieldsValues] = useState({});
  const [error, setError] = useState('');

  // Sync state if cellData changes
  useEffect(() => {
    setCategory(cellData.category || '');
    resetForm();
  }, [cellData]);

  const resetForm = () => {
    setEditingProductId(null);
    setName('');
    setPrice('');
    setItemsPerPallet('');
    setStock('');
    setExpirationDate('');
    
    // Reset custom fields values
    const initialVals = {};
    customFields.forEach(field => {
      initialVals[field.id] = '';
    });
    setCustomFieldsValues(initialVals);
    setError('');
  };

  const handleEditClick = (product) => {
    setEditingProductId(product.id);
    setName(product.name);
    setPrice(product.price);
    setItemsPerPallet(product.itemsPerPallet);
    setStock(product.stock);
    setExpirationDate(product.expirationDate);

    // Populate custom fields values
    const currentVals = {};
    customFields.forEach(field => {
      currentVals[field.id] = product.customFields?.[field.id] || '';
    });
    setCustomFieldsValues(currentVals);
  };

  const handleCustomFieldChange = (fieldId, value) => {
    setCustomFieldsValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!name.trim()) {
      setError('Product Name is required.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Price per unit must be a positive number.');
      return;
    }

    const itemsPerPalNum = parseInt(itemsPerPallet, 10);
    if (isNaN(itemsPerPalNum) || itemsPerPalNum <= 0) {
      setError('Items per Pallet must be greater than zero.');
      return;
    }

    const stockNum = parseInt(stock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setError('Total Stock must be a non-negative number.');
      return;
    }

    // Determine category to save
    let finalCategory = category.trim();
    if (!isCellEmpty) {
      finalCategory = cellData.category; // Lock to existing category
    }

    if (!finalCategory) {
      setError('A cell category is required.');
      return;
    }

    const productsList = [...(cellData.products || [])];

    const productPayload = {
      id: editingProductId || `p-${Date.now()}`,
      name: name.trim(),
      price: priceNum,
      itemsPerPallet: itemsPerPalNum,
      stock: stockNum,
      expirationDate: expirationDate || new Date().toISOString().split('T')[0],
      customFields: { ...customFieldsValues }
    };

    if (editingProductId) {
      // Update existing product
      const idx = productsList.findIndex(p => p.id === editingProductId);
      if (idx !== -1) {
        productsList[idx] = productPayload;
      }
    } else {
      // Add new product
      productsList.push(productPayload);
    }

    // Call save handler
    onSaveCellData(coordinate, finalCategory, productsList);
    resetForm();
  };

  const handleDeleteProduct = (productId) => {
    const productsList = (cellData.products || []).filter(p => p.id !== productId);
    
    // If we have deleted all products, we clear the category too
    const finalCategory = productsList.length === 0 ? '' : cellData.category;
    onSaveCellData(coordinate, finalCategory, productsList);
    resetForm();
  };

  const cleanCoord = coordinate.replace('-', '');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={styles.modal}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <span className="badge badge-primary" style={styles.cellBadge}>Cell {cleanCoord}</span>
            <h3 style={styles.title}>
              {isCellEmpty ? 'Unassigned Storage Cell' : `Storage Category: ${cellData.category}`}
            </h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body" style={styles.body}>
          {/* Active Product Variants Grid/List */}
          <div style={styles.variantsSection}>
            <h4 style={styles.sectionHeading}>Stored Product Variants</h4>
            {isCellEmpty ? (
              <div style={styles.emptyState}>
                <p>No products stored in cell {cleanCoord}.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Complete the form below to stock this cell.
                </p>
              </div>
            ) : (
              <div style={styles.variantsList}>
                {cellData.products.map((prod) => {
                  const pallets = calculatePallets(prod.stock, prod.itemsPerPallet);
                  return (
                    <div
                      key={prod.id}
                      style={{
                        ...styles.productCard,
                        border: editingProductId === prod.id ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                        backgroundColor: editingProductId === prod.id ? 'rgba(59, 130, 246, 0.04)' : 'rgba(0, 0, 0, 0.1)'
                      }}
                      className="card"
                    >
                      <div style={styles.prodHeader}>
                        <div>
                          <h5 style={styles.prodName}>{prod.name}</h5>
                          <span style={styles.prodPrice}>${prod.price.toFixed(2)} / unit</span>
                        </div>
                        <div style={styles.prodActions}>
                          <button
                            onClick={() => handleEditClick(prod)}
                            className="btn btn-icon"
                            style={styles.actionBtn}
                            title="Edit Variant"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="btn btn-icon"
                            style={{ ...styles.actionBtn, color: 'var(--danger)' }}
                            title="Remove Variant"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Pallet conversion calculation */}
                      <div style={styles.metricsGrid}>
                        <div style={styles.metricItem}>
                          <span style={styles.metricLabel}>Stock Qty</span>
                          <span style={styles.metricVal}>{prod.stock} units</span>
                        </div>
                        <div style={styles.metricItem}>
                          <span style={styles.metricLabel}>Pallet Ratio</span>
                          <span style={styles.metricVal}>{prod.itemsPerPallet} u/Pallet</span>
                        </div>
                        <div style={styles.metricItem}>
                          <span style={styles.metricLabel}>Calculated Load</span>
                          <span style={{ ...styles.metricVal, color: 'var(--primary)', fontWeight: 'bold' }}>
                            {pallets.toFixed(2)} Pallets
                          </span>
                        </div>
                        <div style={styles.metricItem}>
                          <span style={styles.metricLabel}>Expiration</span>
                          <span style={styles.metricVal}>{prod.expirationDate}</span>
                        </div>
                      </div>

                      {/* Custom metadata display */}
                      {Object.keys(prod.customFields || {}).length > 0 && (
                        <div style={styles.customValuesBox}>
                          {customFields.map(field => {
                            const val = prod.customFields[field.id];
                            if (val === undefined || val === '') return null;
                            return (
                              <div key={field.id} style={styles.customValRow}>
                                <span style={styles.customValLabel}>{field.label}:</span>
                                <span style={styles.customValVal}>{val}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form to Add / Edit Product */}
          <div style={styles.formSection}>
            <h4 style={styles.sectionHeading}>
              {editingProductId ? 'Edit Product Variant' : 'Add Product Variant'}
            </h4>
            
            {error && <div className="badge-danger" style={styles.errorAlert}>{error}</div>}

            <form onSubmit={handleFormSubmit} style={styles.form}>
              {/* Category selector (Only editable on first product) */}
              <div className="input-group">
                <label className="input-label">Cell Category</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Milk, Electronics, Beverages"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={!isCellEmpty}
                  required
                />
                {!isCellEmpty && (
                  <span style={styles.inputHint}>
                    This cell strictly stores <strong>{cellData.category}</strong>. Delete all products to reassign category.
                  </span>
                )}
              </div>

              {/* Product Name */}
              <div className="input-group">
                <label className="input-label">Product Name / Variant</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Almond Milk Unsweetened 1L"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Price & Items per Pallet */}
              <div style={styles.formRow}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Price per Unit ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Units per Pallet</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 50"
                    value={itemsPerPallet}
                    onChange={(e) => setItemsPerPallet(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Stock and Expiration Date */}
              <div style={styles.formRow}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Total Stock Quantity</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 150"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Expiration Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Pallet Live Calculator Indicator */}
              {itemsPerPallet > 0 && stock >= 0 && (
                <div style={styles.calculatorOutput} className="badge badge-primary">
                  Conversion calculation: {stock} units / {itemsPerPallet} per Pallet = <strong>{calculatePallets(stock, itemsPerPallet).toFixed(2)} Pallets</strong>
                </div>
              )}

              {/* Dynamic Custom Fields Section */}
              {customFields.length > 0 && (
                <div style={styles.customFieldsSection}>
                  <div style={styles.customFieldsDivider}>
                    <span style={styles.dividerText}>Custom Metadata Fields</span>
                  </div>
                  
                  <div style={styles.customFieldsFormGrid}>
                    {customFields.map(field => (
                      <div key={field.id} className="input-group">
                        <label className="input-label">
                          {field.label}
                          {field.description && <span style={styles.fieldDescTip} title={field.description}> (?)</span>}
                        </label>
                        <input
                          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          className="input-field"
                          placeholder={`Enter ${field.label}`}
                          value={customFieldsValues[field.id] || ''}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={styles.formActions}>
                {editingProductId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  {editingProductId ? 'Save Variant Changes' : 'Stock Variant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  modal: {
    maxWidth: '850px',
    display: 'grid',
    gridTemplateRows: 'auto 1fr'
  },
  cellBadge: {
    marginBottom: '0.25rem',
    fontSize: '0.7rem',
    padding: '0.2rem 0.5rem',
    fontWeight: 'bold',
    fontFamily: 'monospace'
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  body: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
    padding: '1.5rem',
    maxHeight: '75vh',
    overflowY: 'auto'
  },
  variantsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    borderRight: '1px solid var(--border-color)',
    paddingRight: '1.5rem'
  },
  sectionHeading: {
    fontFamily: 'var(--font-display)',
    fontWeight: '600',
    fontSize: '1rem',
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '0.5rem'
  },
  emptyState: {
    padding: '3rem 1rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.9rem'
  },
  variantsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    overflowY: 'auto',
    maxHeight: '55vh',
    paddingRight: '0.25rem'
  },
  productCard: {
    padding: '1rem',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  prodHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.5rem'
  },
  prodName: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    lineHeight: '1.2'
  },
  prodPrice: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  },
  prodActions: {
    display: 'flex',
    gap: '0.15rem'
  },
  actionBtn: {
    padding: '0.2rem'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.5rem',
    background: 'rgba(0, 0, 0, 0.15)',
    padding: '0.5rem',
    borderRadius: '6px'
  },
  metricItem: {
    display: 'flex',
    flexDirection: 'column'
  },
  metricLabel: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase'
  },
  metricVal: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    fontFamily: 'monospace'
  },
  customValuesBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '0.5rem'
  },
  customValRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem'
  },
  customValLabel: {
    color: 'var(--text-muted)'
  },
  customValVal: {
    color: 'var(--text-secondary)',
    fontWeight: '500'
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  errorAlert: {
    padding: '0.6rem 0.8rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    border: '1px solid rgba(239, 68, 68, 0.2)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  formRow: {
    display: 'flex',
    gap: '1rem'
  },
  calculatorOutput: {
    fontSize: '0.75rem',
    padding: '0.5rem',
    textAlign: 'center',
    borderRadius: '6px',
    display: 'block'
  },
  inputHint: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    marginTop: '0.1rem'
  },
  customFieldsSection: {
    marginTop: '0.5rem'
  },
  customFieldsDivider: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '0.75rem',
    color: 'var(--text-muted)'
  },
  dividerText: {
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.02em'
  },
  customFieldsFormGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem'
  },
  fieldDescTip: {
    cursor: 'help',
    color: 'var(--primary)',
    fontWeight: 'bold'
  },
  formActions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1rem'
  }
};
