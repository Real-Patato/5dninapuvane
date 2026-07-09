import React, { useState, useEffect } from 'react';
import { calculatePallets } from '../utils/mockData';

// Dynamic Excel-style row labeling (A, B... Z, AA, AB...)
const getRowLabel = (index) => {
  let label = '';
  let temp = index;
  while (temp >= 0) {
    label = String.fromCharCode((temp % 26) + 65) + label;
    temp = Math.floor(temp / 26) - 1;
  }
  return label;
};

const getRowIndex = (label) => {
  let index = 0;
  for (let i = 0; i < label.length; i++) {
    index = index * 26 + (label.charCodeAt(i) - 64);
  }
  return index - 1;
};

const getCoordinate = (r, c) => `${getRowLabel(r)}-${c + 1}`;

export default function WarehouseGrid({ warehouse, onCellClick, onEditLayoutClick, onUpdateWarehouse }) {
  const [selectedCoords, setSelectedCoords] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCoord, setDragStartCoord] = useState(null);
  const [lastClickedCoord, setLastClickedCoord] = useState(null);

  // Global mouseup handler to terminate dragging safely
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  if (!warehouse) {
    return (
      <div style={styles.emptyState}>
        <p>No warehouse selected. Please select or create one in the sidebar.</p>
      </div>
    );
  }

  const { rows, columns, name, cells = {} } = warehouse;

  // Generate labels
  const rowLabels = Array.from({ length: rows }, (_, i) => getRowLabel(i));
  const colLabels = Array.from({ length: columns }, (_, i) => i + 1);

  // Helper to find the primary cell that covers a coordinate (if merged)
  const getCoveringCell = (cellsMap, coord) => {
    for (const [key, cell] of Object.entries(cellsMap || {})) {
      if (cell.rowSpan > 1 || cell.colSpan > 1) {
        const [rowLabel, colStr] = key.split('-');
        const rStart = getRowIndex(rowLabel);
        const cStart = parseInt(colStr, 10) - 1;

        const [cRowLabel, cColStr] = coord.split('-');
        const cr = getRowIndex(cRowLabel);
        const cc = parseInt(cColStr, 10) - 1;

        if (cr >= rStart && cr < rStart + (cell.rowSpan || 1) &&
            cc >= cStart && cc < cStart + (cell.colSpan || 1)) {
          return { primaryCoord: key, cell };
        }
      }
    }
    return null;
  };

  // Expand selection to include full merged cells
  const expandSelection = (coords) => {
    const expanded = new Set();
    coords.forEach(coord => {
      const covering = getCoveringCell(cells, coord);
      if (covering) {
        const [rowLabel, colStr] = covering.primaryCoord.split('-');
        const rStart = getRowIndex(rowLabel);
        const cStart = parseInt(colStr, 10) - 1;
        const rowSpan = covering.cell.rowSpan || 1;
        const colSpan = covering.cell.colSpan || 1;
        for (let dr = 0; dr < rowSpan; dr++) {
          for (let dc = 0; dc < colSpan; dc++) {
            expanded.add(getCoordinate(rStart + dr, cStart + dc));
          }
        }
      } else {
        expanded.add(coord);
      }
    });
    return Array.from(expanded);
  };

  // Stabilize selection to ensure it's a perfect rectangle
  const stabilizeSelection = (coords) => {
    let current = new Set(coords);
    let size = 0;
    while (current.size !== size) {
      size = current.size;
      const expanded = expandSelection(Array.from(current));

      let minR = Infinity, maxR = -Infinity;
      let minC = Infinity, maxC = -Infinity;
      expanded.forEach(coord => {
        const [rowLabel, colStr] = coord.split('-');
        const r = getRowIndex(rowLabel);
        const c = parseInt(colStr, 10) - 1;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      });

      if (minR !== Infinity) {
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            current.add(getCoordinate(r, c));
          }
        }
      }
    }
    return Array.from(current);
  };

  // Drag selection handlers
  const handleCellMouseDown = (coordinate, e) => {
    if (e.button !== 0) return; // Left click only

    const covering = getCoveringCell(cells, coordinate);
    const targetCoord = covering ? covering.primaryCoord : coordinate;

    if (e.ctrlKey) {
      const isSelected = selectedCoords.includes(targetCoord);
      let nextCoords;
      if (isSelected) {
        nextCoords = selectedCoords.filter(c => c !== targetCoord);
      } else {
        nextCoords = [...selectedCoords, targetCoord];
      }
      setSelectedCoords(stabilizeSelection(nextCoords));
      setLastClickedCoord(targetCoord);
    } else if (e.shiftKey && lastClickedCoord) {
      const [startRowLabel, startColStr] = lastClickedCoord.split('-');
      const rStart = getRowIndex(startRowLabel);
      const cStart = parseInt(startColStr, 10) - 1;

      const [endRowLabel, endColStr] = targetCoord.split('-');
      const rEnd = getRowIndex(endRowLabel);
      const cEnd = parseInt(endColStr, 10) - 1;

      const minR = Math.min(rStart, rEnd);
      const maxR = Math.max(rStart, rEnd);
      const minC = Math.min(cStart, cEnd);
      const maxC = Math.max(cStart, cEnd);

      const range = [];
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          range.push(getCoordinate(r, c));
        }
      }
      setSelectedCoords(stabilizeSelection(range));
    } else {
      setIsDragging(true);
      setDragStartCoord(targetCoord);
      setSelectedCoords(stabilizeSelection([targetCoord]));
      setLastClickedCoord(targetCoord);
    }
  };

  const handleCellMouseEnter = (coordinate) => {
    if (!isDragging || !dragStartCoord) return;

    const covering = getCoveringCell(cells, coordinate);
    const targetCoord = covering ? covering.primaryCoord : coordinate;

    const [startRowLabel, startColStr] = dragStartCoord.split('-');
    const rStart = getRowIndex(startRowLabel);
    const cStart = parseInt(startColStr, 10) - 1;

    const [endRowLabel, endColStr] = targetCoord.split('-');
    const rEnd = getRowIndex(endRowLabel);
    const cEnd = parseInt(endColStr, 10) - 1;

    const minR = Math.min(rStart, rEnd);
    const maxR = Math.max(rStart, rEnd);
    const minC = Math.min(cStart, cEnd);
    const maxC = Math.max(cStart, cEnd);

    const range = [];
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        range.push(getCoordinate(r, c));
      }
    }
    setSelectedCoords(stabilizeSelection(range));
  };

  const handleCellClick = (coordinate) => {
    const covering = getCoveringCell(cells, coordinate);
    const targetCoord = covering ? covering.primaryCoord : coordinate;

    if (selectedCoords.length === 1 && selectedCoords[0] === targetCoord) {
      onCellClick(targetCoord, cells[targetCoord] || { coordinate: targetCoord });
    }
  };

  const handleClearSelection = () => {
    setSelectedCoords([]);
    setLastClickedCoord(null);
  };

  const handleMergeSelectedCells = () => {
    if (selectedCoords.length <= 1) return;

    let minR = Infinity, maxR = -Infinity;
    let minC = Infinity, maxC = -Infinity;
    selectedCoords.forEach(coord => {
      const [rowLabel, colStr] = coord.split('-');
      const r = getRowIndex(rowLabel);
      const c = parseInt(colStr, 10) - 1;
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
    });

    const primaryCoord = getCoordinate(minR, minC);
    const rowSpan = maxR - minR + 1;
    const colSpan = maxC - minC + 1;

    const mergedProducts = [];
    let totalMaxPallets = 0;
    let targetCategory = '';

    const updatedCells = { ...cells };

    selectedCoords.forEach(coord => {
      const cell = updatedCells[coord];
      if (cell) {
        if (cell.products && cell.products.length > 0) {
          cell.products.forEach(p => {
            if (!mergedProducts.some(mp => mp.id === p.id)) {
              mergedProducts.push(p);
            }
          });
        }
        totalMaxPallets += cell.maxPallets !== undefined ? cell.maxPallets : 8;
        if (!targetCategory && cell.category) {
          targetCategory = cell.category;
        }
        if (coord !== primaryCoord) {
          delete updatedCells[coord];
        }
      } else {
        totalMaxPallets += 8;
      }
    });

    updatedCells[primaryCoord] = {
      coordinate: primaryCoord,
      category: targetCategory || '',
      products: mergedProducts,
      maxPallets: totalMaxPallets,
      rowSpan,
      colSpan
    };

    onUpdateWarehouse({
      ...warehouse,
      cells: updatedCells
    });

    setSelectedCoords([]);
  };

  const handleSplitSelectedCell = () => {
    if (selectedCoords.length === 0) return;

    let primaryCoord = null;
    for (const coord of selectedCoords) {
      if (cells[coord] && (cells[coord].rowSpan > 1 || cells[coord].colSpan > 1)) {
        primaryCoord = coord;
        break;
      }
    }

    if (!primaryCoord) return;

    const updatedCells = { ...cells };
    const cell = updatedCells[primaryCoord];

    delete cell.rowSpan;
    delete cell.colSpan;
    cell.maxPallets = 8; // reset to standard single cell capacity

    onUpdateWarehouse({
      ...warehouse,
      cells: updatedCells
    });

    setSelectedCoords([]);
  };

  // Helper to get total pallets and properties in cell
  const getCellStats = (coordinate) => {
    const cell = cells[coordinate];
    const defaultMaxPallets = 8;
    const maxPal = (cell && cell.maxPallets !== undefined) ? cell.maxPallets : defaultMaxPallets;
    const isObstacle = cell ? !!cell.isObstacle : false;
    const isPath = cell ? !!cell.isPath : false;
    const obstacleType = cell ? cell.obstacleType : null;
    const minThreshold = (cell && cell.minThreshold !== undefined) ? cell.minThreshold : null;

    if (isPath) {
      return {
        category: 'Path',
        pallets: 0,
        count: 0,
        maxPallets: 0,
        isObstacle: false,
        isPath: true,
        obstacleType: null,
        minThreshold: null
      };
    }

    if (!cell || !cell.products || cell.products.length === 0) {
      return { 
        category: isObstacle ? 'Obstacle' : 'Empty', 
        pallets: 0, 
        count: 0, 
        maxPallets: maxPal, 
        isObstacle, 
        isPath: false,
        obstacleType, 
        minThreshold 
      };
    }
    const pallets = cell.products.reduce((acc, prod) => {
      return acc + calculatePallets(prod.stock, prod.itemsPerPallet);
    }, 0);
    return {
      category: cell.category || 'Unassigned',
      pallets: pallets,
      count: cell.products.length,
      maxPallets: maxPal,
      isObstacle,
      isPath: false,
      obstacleType,
      minThreshold
    };
  };

  // Summary Metrics
  let totalPallets = 0;
  let occupiedCellsCount = 0;
  let totalProductsCount = 0;
  let obstacleCellsCount = 0;

  rowLabels.forEach((row) => {
    colLabels.forEach((col) => {
      const coord = `${row}-${col}`;
      
      const covering = getCoveringCell(cells, coord);
      if (covering && covering.primaryCoord !== coord) {
        return; // Skip metrics calculation for sub-cells
      }

      const stats = getCellStats(coord);
      if (stats.isObstacle || stats.isPath) {
        obstacleCellsCount++;
      } else {
        totalPallets += stats.pallets;
        if (stats.count > 0) {
          occupiedCellsCount++;
          totalProductsCount += stats.count;
        }
      }
    });
  });

  const totalCellsCount = rows * columns;
  const storageCellsCount = totalCellsCount - obstacleCellsCount;
  const cellOccupancyRate = Math.round((occupiedCellsCount / (storageCellsCount || 1)) * 100) || 0;

  // Helper to determine status color and intensity based on pallet load
  const getCapacityStyles = (pallets, maxPallets, isObstacle, obstacleType, minThreshold, isPath) => {
    if (isObstacle) {
      return {
        bg: 'repeating-linear-gradient(45deg, rgba(31, 41, 55, 0.45), rgba(31, 41, 55, 0.45) 8px, rgba(75, 85, 99, 0.25) 8px, rgba(75, 85, 99, 0.25) 16px)',
        border: 'rgba(156, 163, 175, 0.3)',
        color: '#9ca3af',
        glow: 'transparent',
        badgeClass: 'badge-neutral',
        isObstacle: true
      };
    }

    if (isPath) {
      return {
        bg: '#18181b', // Roadway asphalt color
        border: '1px solid #3f3f46',
        color: '#eab308',
        glow: 'transparent',
        badgeClass: 'badge-neutral',
        isPath: true
      };
    }

    if (pallets > 0 && minThreshold !== null && minThreshold !== undefined && minThreshold !== '' && pallets <= minThreshold) {
      return {
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'var(--danger)',
        color: 'var(--danger)',
        glow: 'var(--danger-glow)',
        badgeClass: 'badge-danger',
        isAlert: true
      };
    }

    if (pallets === 0) {
      return {
        bg: 'rgba(255, 255, 255, 0.02)',
        border: 'var(--border-color)',
        color: 'var(--text-muted)',
        glow: 'transparent',
        badgeClass: 'badge-neutral'
      };
    }

    const utilization = pallets / maxPallets;

    if (utilization <= 0.25) {
      return {
        bg: 'rgba(96, 165, 250, 0.08)',
        border: 'rgba(96, 165, 250, 0.3)',
        color: '#60a5fa',
        glow: 'rgba(96, 165, 250, 0.15)',
        badgeClass: 'badge-primary'
      };
    }
    if (utilization <= 0.56) {
      return {
        bg: 'rgba(16, 185, 129, 0.08)',
        border: 'rgba(16, 185, 129, 0.3)',
        color: 'var(--success)',
        glow: 'rgba(16, 185, 129, 0.15)',
        badgeClass: 'badge-success'
      };
    }
    if (utilization <= 1.0) {
      return {
        bg: 'rgba(245, 158, 11, 0.1)',
        border: 'rgba(245, 158, 11, 0.4)',
        color: 'var(--warning)',
        glow: 'rgba(245, 158, 11, 0.2)',
        badgeClass: 'badge-warning'
      };
    }
    return {
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.5)',
      color: 'var(--danger)',
      glow: 'rgba(239, 68, 68, 0.25)',
      badgeClass: 'badge-danger'
    };
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Top Header Panel */}
      <div style={styles.gridHeader}>
        <div style={styles.headerInfo}>
          <div style={styles.headerTitleRow}>
            <h2 style={styles.gridName}>{name} Layout View</h2>
            <button
              onClick={onEditLayoutClick}
              className="btn btn-secondary"
              style={styles.editLayoutBtn}
              title="Resize grid and configure warehouse name"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Edit Layout
            </button>
          </div>
          <p style={styles.gridSubtext}>
            Interactive floor plan mapping. Click any storage cell coordinate below to edit its products. Drag select or use Shift/Ctrl + Click to select multiple cells for merging.
          </p>
        </div>

        {/* Legend */}
        <div style={styles.legend} className="card glass">
          <span style={styles.legendTitle}>Capacity & Indicators:</span>
          <div style={styles.legendItems}>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-color)' }}></span>
              <span>Empty (0)</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: 'rgba(96, 165, 250, 0.2)', border: '1px solid #60a5fa' }}></span>
              <span>Low (&le;25%)</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid var(--success)' }}></span>
              <span>Med (&le;56%)</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: 'rgba(245, 158, 11, 0.2)', border: '1px solid var(--warning)' }}></span>
              <span>High (&le;100%)</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger)' }}></span>
              <span>Full (&gt;100%)</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{ 
                ...styles.legendDot, 
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(31, 41, 55, 0.45), rgba(31, 41, 55, 0.45) 3px, rgba(75, 85, 99, 0.25) 3px, rgba(75, 85, 99, 0.25) 6px)',
                border: '1px dashed rgba(156, 163, 175, 0.5)' 
              }}></span>
              <span>Obstacle</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: '#18181b', border: '1.5px dashed #eab308' }}></span>
              <span>Roadway</span>
            </div>
            <div style={styles.legendItem}>
              <span className="low-stock-legend-dot" style={{ ...styles.legendDot, backgroundColor: 'rgba(239, 68, 68, 0.35)', border: '1.5px solid var(--danger)' }}></span>
              <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>🚨 Low Stock Alert</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selection Toolbar */}
      {selectedCoords.length > 0 && (
        <div style={styles.selectionToolbar} className="card glass animate-fade-in">
          <div style={styles.toolbarLeft}>
            <span style={styles.selectedCountLabel}>
              Selected: <strong>{selectedCoords.length}</strong> cell{selectedCoords.length > 1 ? 's' : ''}
            </span>
            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={handleClearSelection}>
              Clear Selection
            </button>
          </div>
          <div style={styles.toolbarRight}>
            {selectedCoords.length === 1 && (
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => {
                  const coord = selectedCoords[0];
                  onCellClick(coord, cells[coord] || { coordinate: coord });
                }}
              >
                ✏️ Edit Cell
              </button>
            )}
            {selectedCoords.length > 1 && (
              <button
                className="btn btn-primary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                onClick={handleMergeSelectedCells}
              >
                🔗 Merge Cells
              </button>
            )}
            {selectedCoords.length === 1 && cells[selectedCoords[0]] && (cells[selectedCoords[0]].rowSpan > 1 || cells[selectedCoords[0]].colSpan > 1) && (
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                onClick={handleSplitSelectedCell}
              >
                🔓 Split Cells
              </button>
            )}
          </div>
        </div>
      )}

      {/* Metrics Stats Dashboard */}
      <div style={styles.metricsRow}>
        <div className="card glass" style={styles.metricCard}>
          <span style={styles.metricLabel}>Active Occupancy</span>
          <div style={styles.metricValue}>{cellOccupancyRate}%</div>
          <span style={styles.metricSub}>{occupiedCellsCount} / {storageCellsCount} Storage Slots (Excl. Obstacles/Paths)</span>
        </div>

        <div className="card glass" style={styles.metricCard}>
          <span style={styles.metricLabel}>Total Stored Volume</span>
          <div style={styles.metricValue}>{totalPallets} <span style={styles.metricUnit}>Pallets</span></div>
          <span style={styles.metricSub}>Calculated across all variants</span>
        </div>

        <div className="card glass" style={styles.metricCard}>
          <span style={styles.metricLabel}>Stock SKU Variants</span>
          <div style={styles.metricValue}>{totalProductsCount} <span style={styles.metricUnit}>SKUs</span></div>
          <span style={styles.metricSub}>Diverse product items stocked</span>
        </div>
      </div>

      {/* Floor Plan Visual Grid */}
      <div style={styles.floorPlanCard} className="card glass">
        <div style={styles.scrollWrapper}>
          <div style={{
            ...styles.gridContainer,
            gridTemplateColumns: `40px repeat(${columns}, minmax(140px, 1fr))`
          }}>
            {/* Top-Left Corner Placeholder */}
            <div style={styles.topLeftCorner}></div>

            {/* Column Headers (1, 2, 3...) */}
            {colLabels.map(col => (
              <div
                key={`col-h-${col}`}
                style={{
                  ...styles.colHeader,
                  gridRow: 1,
                  gridColumn: col + 1
                }}
              >
                {col}
              </div>
            ))}

            {/* Grid Rows */}
            {rowLabels.map((row, r) => (
              <React.Fragment key={`row-group-${row}`}>
                {/* Row Header (A, B, C...) */}
                <div
                  style={{
                    ...styles.rowHeader,
                    gridRow: r + 2,
                    gridColumn: 1
                  }}
                >
                  {row}
                </div>

                {/* Grid Cells */}
                {colLabels.map((col, c) => {
                  const coordinate = `${row}-${col}`;
                  const cell = cells[coordinate] || { coordinate, category: '', products: [] };
                  
                  const covering = getCoveringCell(cells, coordinate);
                  if (covering && covering.primaryCoord !== coordinate) {
                    return null; // Skip rendering covered coordinates
                  }

                  const stats = getCellStats(coordinate);
                  const isSelected = selectedCoords.includes(coordinate);
                  const capStyle = getCapacityStyles(stats.pallets, stats.maxPallets, stats.isObstacle, stats.obstacleType, stats.minThreshold, stats.isPath);

                  const cellRowSpan = cell.rowSpan || 1;
                  const cellColSpan = cell.colSpan || 1;

                  // Render cell if it is configured as an Obstacle
                  if (stats.isObstacle) {
                    const obstacleIcon = 
                      stats.obstacleType === 'pillar' ? '🏛️' :
                      stats.obstacleType === 'wall' ? '🧱' :
                      stats.obstacleType === 'fire_extinguisher' ? '🧯' :
                      stats.obstacleType === 'emergency_exit' ? '🚨' :
                      stats.obstacleType === 'walkway' ? '🚶' : '🚧';
                    const obstacleName = 
                      stats.obstacleType === 'pillar' ? 'Pillar' :
                      stats.obstacleType === 'wall' ? 'Wall' :
                      stats.obstacleType === 'fire_extinguisher' ? 'Fire Ext.' :
                      stats.obstacleType === 'emergency_exit' ? 'Exit' :
                      stats.obstacleType === 'walkway' ? 'Walkway' : 'Obstacle';

                    return (
                      <div
                        key={coordinate}
                        onMouseDown={(e) => handleCellMouseDown(coordinate, e)}
                        onMouseEnter={() => handleCellMouseEnter(coordinate)}
                        onDoubleClick={() => onCellClick(coordinate, cell)}
                        onClick={() => handleCellClick(coordinate)}
                        style={{
                          ...styles.gridCell,
                          background: capStyle.bg,
                          borderColor: isSelected ? 'var(--primary)' : capStyle.border,
                          boxShadow: isSelected ? '0 0 0 3px var(--primary)' : 'none',
                          gridRowStart: r + 2,
                          gridRowEnd: r + 2 + cellRowSpan,
                          gridColumnStart: c + 2,
                          gridColumnEnd: c + 2 + cellColSpan
                        }}
                        className={`grid-cell-card obstacle-cell ${isSelected ? 'selected' : ''}`}
                      >
                        <div style={styles.cellTop}>
                          <span style={styles.cellCoordinate}>{row}{col}</span>
                          <span style={styles.obstacleCellBadge}>OBSTACLE</span>
                        </div>
                        <div style={styles.obstacleBody}>
                          <span style={styles.obstacleIcon}>{obstacleIcon}</span>
                          <span style={styles.obstacleText}>{obstacleName}</span>
                        </div>
                      </div>
                    );
                  }

                  // Render Pathway Corridor
                  if (stats.isPath) {
                    return (
                      <div
                        key={coordinate}
                        onMouseDown={(e) => handleCellMouseDown(coordinate, e)}
                        onMouseEnter={() => handleCellMouseEnter(coordinate)}
                        onDoubleClick={() => onCellClick(coordinate, cell)}
                        onClick={() => handleCellClick(coordinate)}
                        style={{
                          ...styles.gridCell,
                          background: capStyle.bg,
                          borderColor: isSelected ? 'var(--primary)' : capStyle.border,
                          boxShadow: isSelected ? '0 0 0 3px var(--primary)' : 'none',
                          gridRowStart: r + 2,
                          gridRowEnd: r + 2 + cellRowSpan,
                          gridColumnStart: c + 2,
                          gridColumnEnd: c + 2 + cellColSpan
                        }}
                        className={`grid-cell-card path-cell ${isSelected ? 'selected' : ''}`}
                      >
                        <div style={styles.cellTop}>
                          <span style={styles.cellCoordinate}>{row}{col}</span>
                          <span style={styles.pathCellBadge}>🛣️ PATH</span>
                        </div>
                        <div style={styles.pathBody}>
                          <span style={styles.pathIcon}>🚚</span>
                          <span style={styles.pathText}>ROADWAY</span>
                        </div>
                      </div>
                    );
                  }

                  // Render Normal Storage Cell
                  return (
                    <div
                      key={coordinate}
                      onMouseDown={(e) => handleCellMouseDown(coordinate, e)}
                      onMouseEnter={() => handleCellMouseEnter(coordinate)}
                      onDoubleClick={() => onCellClick(coordinate, cell)}
                      onClick={() => handleCellClick(coordinate)}
                      style={{
                        ...styles.gridCell,
                        backgroundColor: capStyle.bg,
                        borderColor: isSelected ? 'var(--primary)' : capStyle.border,
                        boxShadow: isSelected 
                          ? '0 0 0 3px var(--primary)' 
                          : (stats.pallets > 0 && !capStyle.isAlert ? `inset 0 0 12px ${capStyle.glow}` : 'none'),
                        gridRowStart: r + 2,
                        gridRowEnd: r + 2 + cellRowSpan,
                        gridColumnStart: c + 2,
                        gridColumnEnd: c + 2 + cellColSpan
                      }}
                      className={`grid-cell-card ${capStyle.isAlert ? 'low-stock-alert' : ''} ${isSelected ? 'selected' : ''}`}
                    >
                      <div style={styles.cellTop}>
                        <span style={styles.cellCoordinate}>{row}{col}</span>
                        {stats.pallets > 0 && (
                          <span style={styles.variantCountBadge}>
                            {stats.count} SKU{stats.count > 1 ? 's' : ''}
                          </span>
                        )}
                        {capStyle.isAlert && (
                          <span style={styles.alarmBadge} title="Low stock alert!">🚨</span>
                        )}
                      </div>

                      <div style={styles.cellBody}>
                        {stats.pallets > 0 ? (
                          <>
                            <span style={{ ...styles.cellCategory, color: capStyle.color }}>
                              {stats.category}
                            </span>
                            <div style={styles.palletInfo}>
                              <span style={styles.palletVal}>{stats.pallets}</span>
                              <span style={styles.palletUnit}> / {stats.maxPallets} Pallets</span>
                            </div>
                            {/* Simple visual bar */}
                            <div style={styles.progressBarBg}>
                              <div style={{
                                ...styles.progressBarFill,
                                backgroundColor: capStyle.color,
                                width: `${Math.min((stats.pallets / stats.maxPallets) * 100, 100)}%`
                              }}></div>
                            </div>
                          </>
                        ) : (
                          <span style={styles.emptyCellText}>
                            {cellRowSpan > 1 || cellColSpan > 1 ? '[ Merged Empty ]' : '[ Empty ]'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Embedded CSS for Cell hover and pulse alert animations */}
      <style>{`
        .grid-cell-card {
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s, border-color 0.2s;
          user-select: none;
        }
        .grid-cell-card:hover {
          transform: translateY(-2px) scale(1.01);
          border-color: var(--text-secondary) !important;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4) !important;
          background-color: rgba(255, 255, 255, 0.05) !important;
          z-index: 4;
        }
        .obstacle-cell {
          opacity: 0.85;
        }
        .obstacle-cell:hover {
          background-color: rgba(31, 41, 55, 0.5) !important;
        }
        .path-cell {
          position: relative;
          overflow: hidden;
        }
        .path-cell::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 2px;
          border-left: 2.5px dashed rgba(234, 179, 8, 0.45);
          transform: translateX(-50%);
          pointer-events: none;
        }
        .selected {
          border-width: 2px !important;
          z-index: 5 !important;
          transform: scale(1.01) !important;
        }
        @keyframes pulseDangerBorder {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.35); border-color: rgba(239, 68, 68, 0.7) !important; }
          50% { box-shadow: 0 0 10px 1px rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4) !important; }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.35); border-color: rgba(239, 68, 68, 0.7) !important; }
        }
        .low-stock-alert {
          animation: pulseDangerBorder 2s infinite ease-in-out;
          border-width: 1.5px !important;
        }
        .low-stock-legend-dot {
          animation: pulseDangerBorder 2s infinite ease-in-out;
        }
      `}</style>
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
  emptyState: {
    padding: '4rem',
    textAlign: 'center',
    color: 'var(--text-muted)'
  },
  gridHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '2rem',
    flexWrap: 'wrap'
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    flex: 1
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem'
  },
  editLayoutBtn: {
    padding: '0.4rem 0.85rem',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    marginTop: '0.25rem'
  },
  gridName: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  gridSubtext: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    maxWidth: '700px'
  },
  legend: {
    padding: '0.75rem 1.25rem',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    fontSize: '0.8rem',
    flexWrap: 'wrap'
  },
  legendTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: '600',
    color: 'var(--text-secondary)'
  },
  legendItems: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    color: 'var(--text-secondary)'
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
    display: 'inline-block'
  },
  selectionToolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1.25rem',
    borderRadius: '12px',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    background: 'rgba(30, 41, 59, 0.7)',
    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.1)',
    flexWrap: 'wrap',
    gap: '1rem',
    marginTop: '-1rem'
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  selectedCountLabel: {
    fontSize: '0.9rem',
    color: 'var(--text-primary)'
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  metricsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.5rem'
  },
  metricCard: {
    padding: '1.25rem 1.5rem',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden'
  },
  metricLabel: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  metricValue: {
    fontSize: '2rem',
    fontWeight: '700',
    fontFamily: 'var(--font-display)',
    color: 'var(--text-primary)',
    margin: '0.25rem 0'
  },
  metricUnit: {
    fontSize: '1rem',
    fontWeight: '500',
    color: 'var(--text-secondary)'
  },
  metricSub: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)'
  },
  floorPlanCard: {
    padding: '1.5rem',
    borderRadius: '16px',
    overflow: 'hidden'
  },
  scrollWrapper: {
    width: '100%',
    maxHeight: '75vh',
    overflow: 'auto',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    position: 'relative'
  },
  gridContainer: {
    display: 'grid',
    gap: '0.75rem',
    minWidth: 'max-content',
    alignItems: 'stretch',
    padding: '0.5rem'
  },
  colHeader: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: 'var(--bg-card)',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    paddingBottom: '0.5rem',
    fontFamily: 'monospace',
    borderBottom: '2px solid var(--border-color)'
  },
  rowHeader: {
    position: 'sticky',
    left: 0,
    zIndex: 9,
    backgroundColor: 'var(--bg-card)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    fontFamily: 'monospace',
    borderRight: '2px solid var(--border-color)'
  },
  topLeftCorner: {
    position: 'sticky',
    top: 0,
    left: 0,
    zIndex: 11,
    backgroundColor: 'var(--bg-card)',
    borderBottom: '2px solid var(--border-color)',
    borderRight: '2px solid var(--border-color)'
  },
  gridCell: {
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '115px',
    position: 'relative',
    outline: 'none'
  },
  cellTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  cellCoordinate: {
    fontFamily: 'monospace',
    fontWeight: '700',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)'
  },
  variantCountBadge: {
    fontSize: '0.65rem',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    padding: '0.15rem 0.35rem',
    borderRadius: '4px',
    color: 'var(--text-muted)',
    fontWeight: '500'
  },
  alarmBadge: {
    fontSize: '0.8rem',
    marginLeft: 'auto'
  },
  cellBody: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    flexGrow: 1,
    gap: '0.15rem'
  },
  cellCategory: {
    fontSize: '0.75rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  palletInfo: {
    fontSize: '0.8rem',
    color: 'var(--text-primary)',
    fontWeight: '500'
  },
  palletVal: {
    fontSize: '0.9rem',
    fontWeight: '700',
    fontFamily: 'monospace'
  },
  palletUnit: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  },
  progressBarBg: {
    height: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '1.5px',
    marginTop: '0.25rem',
    width: '100%',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '1.5px'
  },
  emptyCellText: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    textAlign: 'center',
    margin: 'auto 0'
  },
  obstacleCellBadge: {
    fontSize: '0.6rem',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: '0.15rem 0.35rem',
    borderRadius: '4px',
    color: 'rgba(245, 158, 11, 0.85)',
    fontWeight: '700',
    letterSpacing: '0.02em'
  },
  obstacleBody: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    gap: '0.25rem',
    paddingBottom: '0.5rem'
  },
  obstacleIcon: {
    fontSize: '1.65rem',
    lineHeight: 1
  },
  obstacleText: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  pathCellBadge: {
    fontSize: '0.6rem',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    padding: '0.15rem 0.35rem',
    borderRadius: '4px',
    color: 'rgba(234, 179, 8, 0.85)',
    fontWeight: '700',
    letterSpacing: '0.02em'
  },
  pathBody: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    gap: '0.25rem',
    paddingBottom: '0.5rem'
  },
  pathIcon: {
    fontSize: '1.65rem',
    lineHeight: 1
  },
  pathText: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  }
};
