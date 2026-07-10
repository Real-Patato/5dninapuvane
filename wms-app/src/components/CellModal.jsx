import React, { useState, useEffect, useCallback } from 'react';


export default function CellModal({
  coordinate,
  cellData,
  customFields,
  onClose,
  onSaveCellData
}) {
  const isCellEmpty = !cellData?.products || cellData.products.length === 0;

  // Tabs / Cell Type state
  const [isObstacle, setIsObstacle] = useState(cellData.isObstacle || false);
  const [isPath, setIsPath] = useState(cellData.isPath || false);
  const [isRefrigerated, setIsRefrigerated] = useState(cellData.isRefrigerated || false);
  const [obstacleType, setObstacleType] = useState(cellData.obstacleType || 'pillar');

  // Custom capacity & alerts states
  const [maxPallets, setMaxPallets] = useState(cellData.maxPallets !== undefined ? cellData.maxPallets : 8);
  const [minThreshold, setMinThreshold] = useState(cellData.minThreshold !== undefined ? cellData.minThreshold : '');

  // Form states (Products)
  const [category, setCategory] = useState(cellData.category || '');
  const [editingProductId, setEditingProductId] = useState(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [palletCount, setPalletCount] = useState(''); // independent mandatory field
  const [itemsPerPallet, setItemsPerPallet] = useState('');
  const [stock, setStock] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [temperature, setTemperature] = useState(''); // per-product mandatory field for refrigerated cells
  
  // Custom fields inputs state
  const [customFieldsValues, setCustomFieldsValues] = useState({});
  const [error, setError] = useState('');

  const resetForm = useCallback(() => {
    setEditingProductId(null);
    setName('');
    setPrice('');
    setPalletCount('');
    setItemsPerPallet('');
    setStock('');
    setExpirationDate('');
    setTemperature('');
    
    // Reset custom fields values
    const initialVals = {};
    customFields.forEach(field => {
      initialVals[field.id] = '';
    });
    setCustomFieldsValues(initialVals);
    setError('');
  }, [customFields]);

  // Sync state when the COORDINATE changes (i.e. a different cell is opened).
  // Using `coordinate` as dependency instead of `cellData` to avoid firing
  // on every parent re-render (the fallback object in App.jsx creates a new ref each render).
  useEffect(() => {
    setCategory(cellData?.category || '');
    setIsObstacle(cellData?.isObstacle || false);
    setIsPath(cellData?.isPath || false);
    setIsRefrigerated(cellData?.isRefrigerated || false);
    setObstacleType(cellData?.obstacleType || 'pillar');
    setMaxPallets(cellData?.maxPallets !== undefined ? cellData.maxPallets : 8);
    setMinThreshold(cellData?.minThreshold !== undefined ? cellData.minThreshold : '');
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinate, resetForm]);

  // Helper function to call save handler with updated state
  const triggerSave = (updatedProducts, updatedCategory, extraProps = {}) => {
    onSaveCellData(coordinate, {
      category: updatedCategory !== undefined ? updatedCategory : category,
      products: updatedProducts !== undefined ? updatedProducts : cellData.products || [],
      isObstacle: extraProps.isObstacle !== undefined ? extraProps.isObstacle : isObstacle,
      isPath: extraProps.isPath !== undefined ? extraProps.isPath : isPath,
      isRefrigerated: extraProps.isRefrigerated !== undefined ? extraProps.isRefrigerated : isRefrigerated,
      rowSpan: cellData.rowSpan,
      colSpan: cellData.colSpan,
      mergedCoords: cellData.mergedCoords,
      obstacleType: extraProps.obstacleType !== undefined ? extraProps.obstacleType : obstacleType,
      maxPallets: extraProps.maxPallets !== undefined ? extraProps.maxPallets : maxPallets,
      minThreshold: extraProps.minThreshold !== undefined ? extraProps.minThreshold : minThreshold
    });
  };

  const handleEditClick = (product) => {
    setEditingProductId(product.id);
    setName(product.name);
    setPrice(product.price);
    setPalletCount(product.palletCount !== undefined ? String(product.palletCount) : '');
    setItemsPerPallet(product.itemsPerPallet !== undefined ? String(product.itemsPerPallet) : '');
    setStock(product.stock !== undefined ? String(product.stock) : '');
    setExpirationDate(product.expirationDate || '');
    setTemperature(product.temperature !== undefined ? String(product.temperature) : '');

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

    // Mandatory field validations
    if (!name.trim()) {
      setError('Product Name is required.');
      return;
    }

    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum < 0) {
      setError('Price per unit must be a positive number.');
      return;
    }

    // Number of Pallets — mandatory, integer only, independent value
    const palletCountNum = parseInt(palletCount, 10);
    if (palletCount === '' || isNaN(palletCountNum) || palletCountNum < 0) {
      setError('Number of Pallets is required and must be a non-negative whole number.');
      return;
    }
    if (String(palletCount).includes('.')) {
      setError('Number of Pallets must be a whole number (no decimals).');
      return;
    }

    // Optional fields — use safe defaults when blank
    const itemsPerPalNum = itemsPerPallet !== '' ? parseInt(itemsPerPallet, 10) : 0;
    if (itemsPerPallet !== '' && (isNaN(itemsPerPalNum) || itemsPerPalNum < 0)) {
      setError('Units per Pallet must be a non-negative number.');
      return;
    }

    const stockNum = stock !== '' ? parseInt(stock, 10) : 0;
    if (stock !== '' && (isNaN(stockNum) || stockNum < 0)) {
      setError('Total Stock must be a non-negative number.');
      return;
    }

    // Temperature — mandatory for Refrigerator/Freezer cells
    if (isRefrigerated) {
      const tempNum = parseFloat(temperature);
      if (temperature === '' || isNaN(tempNum)) {
        setError('Storage Temperature is required for Refrigerator/Freezer cells.');
        return;
      }
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
      palletCount: palletCountNum,
      itemsPerPallet: itemsPerPalNum,
      stock: stockNum,
      expirationDate: expirationDate || '',
      ...(isRefrigerated ? { temperature: parseFloat(temperature) } : {}),
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
    triggerSave(productsList, finalCategory);
    resetForm();
  };

  const handleDeleteProduct = (productId) => {
    const productsList = (cellData.products || []).filter(p => p.id !== productId);
    
    // If we have deleted all products, we clear the category too
    const finalCategory = productsList.length === 0 ? '' : cellData.category;
    triggerSave(productsList, finalCategory);
    resetForm();
  };

  const handleObstacleSubmit = (e) => {
    e.preventDefault();
    // Save as obstacle: clearing products and category
    triggerSave([], '', {
      isObstacle: true,
      isPath: false,
      isRefrigerated: false,
      obstacleType: obstacleType
    });
  };

  const handleRemoveObstacle = () => {
    setIsObstacle(false);
    triggerSave([], '', {
      isObstacle: false,
      isPath: false,
      isRefrigerated: false,
      obstacleType: 'pillar'
    });
  };

  const handlePathSubmit = (e) => {
    e.preventDefault();
    // Save as path: clearing products and category
    triggerSave([], '', {
      isPath: true,
      isObstacle: false,
      isRefrigerated: false
    });
  };

  const handleRemovePath = () => {
    setIsPath(false);
    triggerSave([], '', {
      isPath: false,
      isObstacle: false,
      isRefrigerated: false
    });
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    setError('');

    const maxPal = parseInt(maxPallets, 10);
    if (isNaN(maxPal) || maxPal <= 0) {
      setError('Max pallets capacity must be a positive integer.');
      return;
    }

    const minThresh = minThreshold === '' ? undefined : parseInt(minThreshold, 10);
    if (minThresh !== undefined && (isNaN(minThresh) || minThresh < 0)) {
      setError('Minimum stock threshold must be a non-negative integer.');
      return;
    }

    triggerSave(undefined, undefined, {
      maxPallets: maxPal,
      minThreshold: minThresh
    });
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
              {cellData.isRefrigerated
                ? `❄️ Refrigerator/Freezer — ${isCellEmpty ? 'Empty Cold Storage' : cellData.category}`
                : cellData.isObstacle 
                  ? `Obstacle Cell: ${obstacleType.toUpperCase()}`
                  : cellData.isPath
                    ? 'Path / Roadway'
                    : isCellEmpty 
                      ? 'Unassigned Storage Cell' 
                      : `Storage Category: ${cellData.category}`}
            </h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Tab Selection */}
        <div style={styles.tabContainer}>
          <button
            type="button"
            style={{
              ...styles.tabButton,
              ...(!isObstacle && !isPath && !isRefrigerated ? styles.activeTabButton : {})
            }}
            onClick={() => { setIsObstacle(false); setIsPath(false); setIsRefrigerated(false); }}
          >
            📦 Storage Cell
          </button>
          <button
            type="button"
            style={{
              ...styles.tabButton,
              ...(isRefrigerated ? { ...styles.activeTabButton, color: '#38bdf8', borderBottomColor: '#38bdf8', background: 'rgba(56,189,248,0.05)' } : {})
            }}
            onClick={() => { setIsObstacle(false); setIsPath(false); setIsRefrigerated(true); }}
          >
            ❄️ Refrigerator
          </button>
          <button
            type="button"
            style={{
              ...styles.tabButton,
              ...(isPath ? styles.activeTabButton : {})
            }}
            onClick={() => { setIsObstacle(false); setIsPath(true); setIsRefrigerated(false); }}
          >
            🛣️ Path / Roadway
          </button>
          <button
            type="button"
            style={{
              ...styles.tabButton,
              ...(isObstacle ? styles.activeTabButton : {})
            }}
            onClick={() => { setIsObstacle(true); setIsPath(false); setIsRefrigerated(false); }}
          >
            🚧 Obstacle Status
          </button>
        </div>

        {isObstacle ? (
          /* Obstacle Configuration View */
          <div style={styles.obstacleBody} className="animate-fade-in">
            <div style={styles.obstacleCard} className="card glass">
              <div style={styles.obstacleIconWrapper}>
                <span style={styles.obstacleIconLarge}>🚧</span>
              </div>
              <h4 style={styles.obstacleHeading}>Configure Cell Obstacle</h4>
              <p style={styles.obstacleDescription}>
                Marking this slot as an obstacle removes it from the inventory grid options. It represents physical structural blockages (e.g. pillars, safety exits, walls) and prevents product placement.
              </p>

              {!isCellEmpty && (
                <div className="badge-danger" style={styles.obstacleWarning}>
                  ⚠️ <strong>Warning:</strong> Cell currently stores products. Saving it as an obstacle will <strong>clear all inventory variants</strong> stored here.
                </div>
              )}

              <form onSubmit={handleObstacleSubmit} style={styles.obstacleForm}>
                <div className="input-group">
                  <label className="input-label">Physical Obstacle Type</label>
                  <select
                    className="input-select"
                    value={obstacleType}
                    onChange={(e) => setObstacleType(e.target.value)}
                    style={styles.obstacleSelect}
                  >
                    <option value="pillar">🏛️ Pillar (Носеща колона)</option>
                    <option value="wall">🧱 Wall (Стена)</option>
                    <option value="fire_extinguisher">🧯 Fire Extinguisher (Пожарогасител)</option>
                    <option value="emergency_exit">🚨 Emergency Exit (Авариен изход)</option>
                    <option value="walkway">🚶 Walkway (Транспортна пътека)</option>
                  </select>
                </div>

                <div style={styles.formActions}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    Save Obstacle Configuration
                  </button>
                  {cellData.isObstacle && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleRemoveObstacle}
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    >
                      Convert to Storage Cell
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        ) : isPath ? (
          /* Path Configuration View */
          <div style={styles.obstacleBody} className="animate-fade-in">
            <div style={styles.obstacleCard} className="card glass">
              <div style={styles.obstacleIconWrapper}>
                <span style={styles.obstacleIconLarge}>🛣️</span>
              </div>
              <h4 style={styles.obstacleHeading}>Configure Cell as Path / Roadway</h4>
              <p style={styles.obstacleDescription}>
                Marking this slot as a path designates it as a transit corridor for forklifts and personnel. Placing products on pathways is strictly prohibited.
              </p>

              {!isCellEmpty && (
                <div className="badge-danger" style={styles.obstacleWarning}>
                  ⚠️ <strong>Warning:</strong> Cell currently stores products. Saving it as a path will <strong>clear all inventory variants</strong> stored here.
                </div>
              )}

              <form onSubmit={handlePathSubmit} style={styles.obstacleForm}>
                <div style={styles.formActions}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    Save Path Configuration
                  </button>
                  {cellData.isPath && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleRemovePath}
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    >
                      Convert to Storage Cell
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Normal Cell & Products View */
          <div className="modal-body" style={styles.body}>
            {/* Left Side: Stored Variants & Custom Threshold Configurations */}
            <div style={styles.variantsSection}>
              <h4 style={styles.sectionHeading}>Stored Product Variants</h4>
              {isCellEmpty ? (
                <div style={styles.emptyState}>
                  <p>No products stored in cell {cleanCoord}.</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Complete the form to stock this cell.
                  </p>
                </div>
              ) : (
                <div style={styles.variantsList}>
                  {(cellData?.products || []).map((prod) => {
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
                            <span style={styles.prodPrice}>${(prod.price ?? 0).toFixed(2)} / unit</span>
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

                        {/* Product stats display */}
                        <div style={styles.metricsGrid}>
                          <div style={styles.metricItem}>
                            <span style={styles.metricLabel}>Pallets</span>
                            <span style={{ ...styles.metricVal, color: 'var(--primary)', fontWeight: 'bold' }}>
                              {prod.palletCount !== undefined ? prod.palletCount : '—'}
                            </span>
                          </div>
                          <div style={styles.metricItem}>
                            <span style={styles.metricLabel}>Stock Qty</span>
                            <span style={styles.metricVal}>{prod.stock || '—'} units</span>
                          </div>
                          <div style={styles.metricItem}>
                            <span style={styles.metricLabel}>u/Pallet</span>
                            <span style={styles.metricVal}>{prod.itemsPerPallet || '—'}</span>
                          </div>
                          <div style={styles.metricItem}>
                            <span style={styles.metricLabel}>Expiration</span>
                            <span style={styles.metricVal}>{prod.expirationDate || '—'}</span>
                          </div>
                          {prod.temperature !== undefined && (
                            <div style={styles.metricItem}>
                              <span style={{ ...styles.metricLabel, color: '#38bdf8' }}>❄️ Temp.</span>
                              <span style={{ ...styles.metricVal, color: '#38bdf8' }}>{prod.temperature}°C</span>
                            </div>
                          )}
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

              {/* Cell Capacity and Alert Threshold Config */}
              <div style={styles.configContainer}>
                <h4 style={styles.sectionHeading}>Cell Capacity & Alerts</h4>
                <form onSubmit={handleSaveConfig} style={styles.configForm}>
                  <div style={styles.configRow}>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label className="input-label">Max Pallets Capacity</label>
                      <input
                        type="number"
                        step="1"
                        className="input-field"
                        value={maxPallets}
                        onChange={(e) => setMaxPallets(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Low Stock Alarm Threshold (Pallets)</label>
                    <input
                      type="number"
                      step="1"
                      className="input-field"
                      placeholder="e.g. 2 (Leaves cell border red if stock falls below this)"
                      value={minThreshold}
                      onChange={(e) => setMinThreshold(e.target.value)}
                    />
                    <span style={styles.inputHint}>
                      Triggers a critical red visual highlight if total stock drops &le; this threshold. Leave blank to disable.
                    </span>
                  </div>

                  <button type="submit" className="btn btn-secondary" style={styles.configBtn}>
                    Save Cell Parameters
                  </button>
                </form>
              </div>
            </div>

            {/* Right Side: Add / Edit Product Form */}
            <div style={styles.formSection}>
              <h4 style={styles.sectionHeading}>
                {editingProductId ? 'Edit Product Variant' : 'Add Product Variant'}
              </h4>
              
              {error && <div className="badge-danger" style={styles.errorAlert}>{error}</div>}

              <form onSubmit={handleFormSubmit} style={styles.form}>
                {/* Category selector (Only editable on first product) */}
                <div className="input-group">
                  <label className="input-label">
                    Cell Category
                    <span style={styles.requiredAsterisk}> *</span>
                  </label>
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
                  <label className="input-label">
                    Product Name / Variant
                    <span style={styles.requiredAsterisk}> *</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Almond Milk Unsweetened 1L"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {/* Price & Number of Pallets (mandatory) */}
                <div style={styles.formRow}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">
                      Price per Unit ($)
                      <span style={styles.requiredAsterisk}> *</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-field"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">
                      Number of Pallets
                      <span style={styles.requiredAsterisk}> *</span>
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      className="input-field"
                      placeholder="e.g. 4"
                      value={palletCount}
                      onChange={(e) => setPalletCount(e.target.value)}
                    />
                  </div>
                </div>

                {/* Units per Pallet & Total Stock (optional) */}
                <div style={styles.formRow}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">
                      Units per Pallet
                      <span style={styles.optionalBadge}> (Optional)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      placeholder="e.g. 50"
                      value={itemsPerPallet}
                      onChange={(e) => setItemsPerPallet(e.target.value)}
                    />
                  </div>

                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">
                      Total Stock Quantity
                      <span style={styles.optionalBadge}> (Optional)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      placeholder="e.g. 150"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                    />
                  </div>
                </div>

                {/* Expiration Date — optional, full width */}
                <div className="input-group">
                  <label className="input-label">
                    Expiration Date
                    <span style={styles.optionalBadge}> (Optional)</span>
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                  />
                </div>

                {/* Storage Temperature — mandatory for Refrigerator/Freezer cells only */}
                {isRefrigerated && (
                  <div className="input-group">
                    <label className="input-label" style={{ color: '#38bdf8' }}>
                      ❄️ Storage Temperature (°C)
                      <span style={styles.requiredAsterisk}> *</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="input-field"
                      placeholder="e.g. −18 (frozen) or 4 (chilled)"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      required
                      style={{ borderColor: 'rgba(56,189,248,0.4)', color: '#38bdf8' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'rgba(56,189,248,0.7)', marginTop: '0.25rem' }}>
                      Standard: Chilled (+1°C to +8°C) • Frozen (−18°C or below)
                    </span>
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
        )}
      </div>
    </div>
  );
}

const styles = {
  modal: {
    maxWidth: '850px',
    display: 'grid',
    gridTemplateRows: 'auto auto 1fr'
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
  tabContainer: {
    display: 'flex',
    borderBottom: '1px solid var(--border-color)',
    background: 'rgba(0, 0, 0, 0.15)',
    padding: '0 1.5rem',
    gap: '1rem'
  },
  tabButton: {
    padding: '0.85rem 1.25rem',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-display)',
    transition: 'all var(--transition-fast)'
  },
  activeTabButton: {
    color: 'var(--primary)',
    borderBottom: '2px solid var(--primary)',
    background: 'rgba(59, 130, 246, 0.05)'
  },
  body: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '2rem',
    padding: '1.5rem',
    maxHeight: '70vh',
    overflowY: 'auto'
  },
  variantsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
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
    padding: '2.5rem 1rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.9rem'
  },
  variantsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    overflowY: 'auto',
    maxHeight: '35vh',
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
  requiredAsterisk: {
    color: 'var(--danger)',
    fontWeight: '700',
    marginLeft: '1px'
  },
  optionalBadge: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: '400',
    fontStyle: 'italic'
  },
  formActions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1rem'
  },
  configContainer: {
    marginTop: '1.25rem',
    paddingTop: '1rem',
    borderTop: '1px dashed var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  configForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  configRow: {
    display: 'flex',
    gap: '1rem'
  },
  configBtn: {
    width: '100%',
    padding: '0.5rem'
  },
  obstacleBody: {
    padding: '2rem 1.5rem',
    maxHeight: '70vh',
    overflowY: 'auto',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  obstacleCard: {
    maxWidth: '550px',
    padding: '2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    alignItems: 'center'
  },
  obstacleIconWrapper: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(245, 158, 11, 0.3)'
  },
  obstacleIconLarge: {
    fontSize: '2.25rem'
  },
  obstacleHeading: {
    fontSize: '1.25rem',
    color: 'var(--text-primary)',
    fontWeight: '600'
  },
  obstacleDescription: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5'
  },
  obstacleWarning: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    textAlign: 'left',
    width: '100%'
  },
  obstacleForm: {
    width: '100%',
    textAlign: 'left',
    marginTop: '0.5rem'
  },
  obstacleSelect: {
    width: '100%'
  }
};
