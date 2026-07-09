import React from 'react';
import { calculatePallets } from '../utils/mockData';

export default function WarehouseGrid({ warehouse, onCellClick }) {
  if (!warehouse) {
    return (
      <div style={styles.emptyState}>
        <p>No warehouse selected. Please select or create one in the sidebar.</p>
      </div>
    );
  }

  const { rows, columns, name, cells = {} } = warehouse;

  // Generate rows (A, B, C...) based on rows count
  const rowLabels = Array.from({ length: rows }, (_, i) => String.fromCharCode(65 + i));
  // Generate columns (1, 2, 3...) based on columns count
  const colLabels = Array.from({ length: columns }, (_, i) => i + 1);

  // Helper to get total pallets in cell
  const getCellStats = (coordinate) => {
    const cell = cells[coordinate];
    if (!cell || !cell.products || cell.products.length === 0) {
      return { category: 'Empty', pallets: 0, count: 0 };
    }
    const pallets = cell.products.reduce((acc, prod) => {
      return acc + calculatePallets(prod.stock, prod.itemsPerPallet);
    }, 0);
    return {
      category: cell.category || 'Unassigned',
      pallets: parseFloat(pallets.toFixed(2)),
      count: cell.products.length
    };
  };

  // Summary Metrics
  let totalPallets = 0;
  let occupiedCellsCount = 0;
  let totalProductsCount = 0;
  const totalCellsCount = rows * columns;

  rowLabels.forEach(row => {
    colLabels.forEach(col => {
      const coord = `${row}-${col}`;
      const stats = getCellStats(coord);
      totalPallets += stats.pallets;
      if (stats.count > 0) {
        occupiedCellsCount++;
        totalProductsCount += stats.count;
      }
    });
  });

  const cellOccupancyRate = Math.round((occupiedCellsCount / totalCellsCount) * 100) || 0;

  // Helper to determine status color and intensity based on pallet load
  const getCapacityStyles = (pallets) => {
    if (pallets === 0) {
      return {
        bg: 'rgba(255, 255, 255, 0.02)',
        border: 'var(--border-color)',
        color: 'var(--text-muted)',
        glow: 'transparent',
        badgeClass: 'badge-neutral'
      };
    }
    if (pallets <= 2.0) {
      return {
        bg: 'rgba(96, 165, 250, 0.08)',
        border: 'rgba(96, 165, 250, 0.3)',
        color: '#60a5fa',
        glow: 'rgba(96, 165, 250, 0.15)',
        badgeClass: 'badge-primary'
      };
    }
    if (pallets <= 4.5) {
      return {
        bg: 'rgba(16, 185, 129, 0.08)',
        border: 'rgba(16, 185, 129, 0.3)',
        color: 'var(--success)',
        glow: 'rgba(16, 185, 129, 0.15)',
        badgeClass: 'badge-success'
      };
    }
    if (pallets <= 8.0) {
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
          <h2 style={styles.gridName}>{name} Layout View</h2>
          <p style={styles.gridSubtext}>
            Interactive floor plan mapping. Click any storage cell coordinate below to edit its product variants and custom parameters.
          </p>
        </div>

        {/* Legend */}
        <div style={styles.legend} className="card glass">
          <span style={styles.legendTitle}>Cell Capacity:</span>
          <div style={styles.legendItems}>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-color)' }}></span>
              <span>Empty (0)</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: 'rgba(96, 165, 250, 0.2)', border: '1px solid #60a5fa' }}></span>
              <span>Low (≤2)</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid var(--success)' }}></span>
              <span>Med (≤4.5)</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: 'rgba(245, 158, 11, 0.2)', border: '1px solid var(--warning)' }}></span>
              <span>High (≤8)</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger)' }}></span>
              <span>Full (&gt;8)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Stats Dashboard */}
      <div style={styles.metricsRow}>
        <div className="card glass" style={styles.metricCard}>
          <span style={styles.metricLabel}>Active Occupancy</span>
          <div style={styles.metricValue}>{cellOccupancyRate}%</div>
          <span style={styles.metricSub}>{occupiedCellsCount} / {totalCellsCount} Cells in use</span>
        </div>

        <div className="card glass" style={styles.metricCard}>
          <span style={styles.metricLabel}>Total Stored Volume</span>
          <div style={styles.metricValue}>{totalPallets.toFixed(1)} <span style={styles.metricUnit}>Pallets</span></div>
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
            gridTemplateColumns: `40px repeat(${columns}, 1fr)`
          }}>
            {/* Top-Left Corner Placeholder */}
            <div></div>

            {/* Column Headers (1, 2, 3...) */}
            {colLabels.map(col => (
              <div key={`col-h-${col}`} style={styles.colHeader}>
                {col}
              </div>
            ))}

            {/* Grid Rows */}
            {rowLabels.map(row => (
              <React.Fragment key={`row-group-${row}`}>
                {/* Row Header (A, B, C...) */}
                <div style={styles.rowHeader}>
                  {row}
                </div>

                {/* Grid Cells */}
                {colLabels.map(col => {
                  const coordinate = `${row}-${col}`;
                  const cell = cells[coordinate] || { coordinate, category: '', products: [] };
                  const stats = getCellStats(coordinate);
                  const capStyle = getCapacityStyles(stats.pallets);

                  return (
                    <div
                      key={coordinate}
                      onClick={() => onCellClick(coordinate, cell)}
                      style={{
                        ...styles.gridCell,
                        backgroundColor: capStyle.bg,
                        borderColor: capStyle.border,
                        boxShadow: stats.pallets > 0 ? `inset 0 0 12px ${capStyle.glow}` : 'none'
                      }}
                      className="grid-cell-card"
                    >
                      <div style={styles.cellTop}>
                        <span style={styles.cellCoordinate}>{row}{col}</span>
                        {stats.pallets > 0 && (
                          <span style={styles.variantCountBadge}>
                            {stats.count} SKU{stats.count > 1 ? 's' : ''}
                          </span>
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
                              <span style={styles.palletUnit}> Pallets</span>
                            </div>
                            {/* Simple visual bar */}
                            <div style={styles.progressBarBg}>
                              <div style={{
                                ...styles.progressBarFill,
                                backgroundColor: capStyle.color,
                                width: `${Math.min((stats.pallets / 8) * 100, 100)}%`
                              }}></div>
                            </div>
                          </>
                        ) : (
                          <span style={styles.emptyCellText}>[ Empty ]</span>
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

      {/* Embedded CSS for Cell hover effect animations */}
      <style>{`
        .grid-cell-card {
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .grid-cell-card:hover {
          transform: translateY(-2px) scale(1.02);
          border-color: var(--text-secondary) !important;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4) !important;
          background-color: rgba(255, 255, 255, 0.05) !important;
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
    alignItems: 'center'
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
    overflowX: 'auto'
  },
  gridContainer: {
    display: 'grid',
    gap: '0.75rem',
    minWidth: '780px',
    alignItems: 'stretch'
  },
  colHeader: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    paddingBottom: '0.5rem',
    fontFamily: 'monospace'
  },
  rowHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    fontFamily: 'monospace'
  },
  gridCell: {
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '110px',
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
  }
};
