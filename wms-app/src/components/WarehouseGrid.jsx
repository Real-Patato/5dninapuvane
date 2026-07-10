import React, { useState, useEffect } from 'react';


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

  // Dialog / overlay states
  const [mergeConflict, setMergeConflict] = useState(null);
  const [mergeContentConflict, setMergeContentConflict] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  // Edit Mode: reveals "+" restore buttons on blank/removed cells
  const [editMode, setEditMode] = useState(false);

  // Feature: Adjacency validation toast
  const [adjacencyError, setAdjacencyError] = useState(null);
  // Feature: Cell type conflict resolution (Freezer / Normal / Obstacle)
  const [typeConflict, setTypeConflict] = useState(null);
  // Feature: Unmerge inventory distribution modal
  const [unmergeDistribution, setUnmergeDistribution] = useState(null);

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
    // O(1) fast-path: direct coveredBy pointer (works for all shapes — rect and irregular)
    const directCell = cellsMap[coord];
    if (directCell?.coveredBy) {
      const primaryCoord = directCell.coveredBy;
      const primaryCell = cellsMap[primaryCoord];
      if (primaryCell) return { primaryCoord, cell: primaryCell };
    }

    // Legacy bounding-box fallback — ONLY for old rectangular merged cells that
    // pre-date the explicit mergedCoords/coveredBy system (i.e. no mergedCoords stored).
    // Cells with mergedCoords use the coveredBy pointer path above, so this path
    // will NEVER incorrectly claim coverage of out-of-shape coords (e.g. the
    // "missing corner" of an L-shape).
    for (const [key, cell] of Object.entries(cellsMap || {})) {
      if ((cell.rowSpan > 1 || cell.colSpan > 1) && !cell.mergedCoords && key !== coord) {
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

  // Expand selection to include all coords of any merged cell touched by the selection.
  // Uses mergedCoords (precise) when available; falls back to bounding-box for legacy data.
  const expandSelection = (coords) => {
    const expanded = new Set();
    coords.forEach(coord => {
      const covering = getCoveringCell(cells, coord);
      if (covering) {
        const mc = covering.cell.mergedCoords;
        if (mc && mc.length > 0) {
          // Precise expansion: include exactly the cells in the merged shape
          mc.forEach(c => expanded.add(c));
        } else {
          // Legacy bounding-box expansion for old-format data
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
        }
      } else {
        expanded.add(coord);
      }
    });
    return Array.from(expanded);
  };

  // stabilizeSelection: fills the bounding rectangle — used for drag + Shift+click
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

  // normalizeSelection: only expands to include full merged cells, NO bounding-box fill.
  // Enables non-rectangular (L/T/custom shape) Ctrl+click selections.
  const normalizeSelection = (coords) => expandSelection(coords);

  // BFS adjacency check — returns true only if all coords form a single connected region
  // (each cell reachable from any other via horizontal/vertical neighbours).
  const isConnectedSelection = (coords) => {
    if (coords.length <= 1) return true;
    const coordSet = new Set(coords);
    const visited = new Set();
    const queue = [coords[0]];
    visited.add(coords[0]);
    while (queue.length > 0) {
      const curr = queue.shift();
      const [rowLabel, colStr] = curr.split('-');
      const r = getRowIndex(rowLabel);
      const c = parseInt(colStr, 10) - 1;
      const neighbours = [
        getCoordinate(r - 1, c),
        getCoordinate(r + 1, c),
        getCoordinate(r, c - 1),
        getCoordinate(r, c + 1)
      ];
      neighbours.forEach(n => {
        if (coordSet.has(n) && !visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      });
    }
    return visited.size === coords.length;
  };

  // ── Shape geometry utilities ─────────────────────────────────────────────

  // Returns true when coords exactly fill their bounding rectangle (no gaps).
  // Rectangular merges use CSS rowSpan/colSpan; irregular ones use extension cells.
  const isRectangularShape = (coords) => {
    if (!coords || coords.length <= 1) return true;
    const rowSet = new Set();
    const colSet = new Set();
    coords.forEach(coord => {
      const [rowLabel, colStr] = coord.split('-');
      rowSet.add(getRowIndex(rowLabel));
      colSet.add(parseInt(colStr, 10) - 1);
    });
    return coords.length === rowSet.size * colSet.size;
  };

  // For an extension cell, returns which of its four sides touch another cell
  // that belongs to the same merged shape. Used to selectively suppress borders
  // so connected extension cells look visually fused.
  const getShapeConnectorSides = (coord, coordSet) => {
    const [rowLabel, colStr] = coord.split('-');
    const r = getRowIndex(rowLabel);
    const c = parseInt(colStr, 10) - 1;
    return {
      top:    coordSet.has(getCoordinate(r - 1, c)),
      bottom: coordSet.has(getCoordinate(r + 1, c)),
      left:   coordSet.has(getCoordinate(r, c - 1)),
      right:  coordSet.has(getCoordinate(r, c + 1))
    };
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
      // normalizeSelection allows non-rectangular free-form shapes via Ctrl+click
      setSelectedCoords(normalizeSelection(nextCoords));
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

  const handleMergeSelectedCells = (resolvedCategory = null, resolvedProducts = null, resolvedType = null) => {
    if (selectedCoords.length <= 1) return;

    // ── Feature 1: Adjacency Validation ──────────────────────────────────────
    // Block merge if selected cells do not form a single connected region.
    if (!isConnectedSelection(selectedCoords)) {
      setAdjacencyError('Cannot merge: selected cells are not adjacent. Only horizontally or vertically connected cells can be merged.');
      setTimeout(() => setAdjacencyError(null), 3500);
      return;
    }

    // Compute bounding box for CSS grid placement
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

    // Gather data from all source cells
    const categoriesFound = new Set();
    const typesFound = new Set();          // 'Normal' | 'Freezer' | 'Obstacle'
    const cellsWithProducts = [];          // { coord, products, category }
    let totalMaxPallets = 0;
    const updatedCells = { ...cells };

    selectedCoords.forEach(coord => {
      const cell = updatedCells[coord];
      if (cell) {
        if (cell.products && cell.products.length > 0) {
          cellsWithProducts.push({ coord, products: cell.products, category: cell.category });
        }
        totalMaxPallets += cell.maxPallets !== undefined ? cell.maxPallets : 8;
        if (cell.category) categoriesFound.add(cell.category);
        // Detect semantic cell type for conflict resolution
        if (cell.isObstacle) typesFound.add('Obstacle');
        else if (cell.isRefrigerated) typesFound.add('Freezer');
        else typesFound.add('Normal');
      } else {
        totalMaxPallets += 8;
        typesFound.add('Normal');
      }
    });

    // ── Feature 2: Step 0 — Type Conflict (Freezer / Normal / Obstacle) ──────
    if (typesFound.size > 1 && resolvedType === null) {
      setTypeConflict({
        types: Array.from(typesFound),
        onResolve: (chosenType) => {
          setTypeConflict(null);
          handleMergeSelectedCells(resolvedCategory, resolvedProducts, chosenType);
        },
        onCancel: () => setTypeConflict(null)
      });
      return;
    }

    // Step 1: Category conflict — show dialog if categories differ
    if (categoriesFound.size > 1 && resolvedCategory === null) {
      setMergeConflict({
        categories: Array.from(categoriesFound),
        onResolve: (chosenCategory) => {
          setMergeConflict(null);
          handleMergeSelectedCells(chosenCategory, resolvedProducts, resolvedType);
        },
        onCancel: () => setMergeConflict(null)
      });
      return;
    }

    // Step 2: Content conflict — show dialog when multiple cells have products
    if (cellsWithProducts.length > 1 && resolvedProducts === null) {
      setMergeContentConflict({
        sourceCells: cellsWithProducts,
        onKeep: (chosenCoord) => {
          const src = cellsWithProducts.find(s => s.coord === chosenCoord);
          setMergeContentConflict(null);
          handleMergeSelectedCells(resolvedCategory, src?.products || [], resolvedType);
        },
        onCombine: () => {
          const combined = [];
          cellsWithProducts.forEach(src => {
            src.products.forEach(p => {
              if (!combined.some(mp => mp.id === p.id)) combined.push(p);
            });
          });
          setMergeContentConflict(null);
          handleMergeSelectedCells(resolvedCategory, combined, resolvedType);
        },
        onCancel: () => setMergeContentConflict(null)
      });
      return;
    }

    // Determine final category
    let targetCategory = resolvedCategory;
    if (targetCategory === null) {
      targetCategory = categoriesFound.size === 1 ? Array.from(categoriesFound)[0] : '';
    }

    // Determine final products
    let finalProducts = resolvedProducts;
    if (finalProducts === null) {
      finalProducts = cellsWithProducts.length === 1 ? cellsWithProducts[0].products : [];
    }

    // Resolve type flags from the chosen (or inferred) cell type
    const finalType = resolvedType || (typesFound.size === 1 ? Array.from(typesFound)[0] : 'Normal');
    const finalIsRefrigerated = finalType === 'Freezer';
    const finalIsObstacle = finalType === 'Obstacle';

    // Apply merge: each non-primary coord gets a coveredBy pointer
    selectedCoords.forEach(coord => {
      if (coord !== primaryCoord) {
        updatedCells[coord] = { coordinate: coord, coveredBy: primaryCoord };
      }
    });

    // Detect if the selected shape is a perfect rectangle.
    // - Rectangular → use CSS rowSpan/colSpan so the primary element spans the area
    //   and covered secondaries are hidden (return null in render).
    // - Irregular (L/T/custom) → primary renders at 1×1; each secondary renders
    //   as a styled "extension cell" so the gap-less bounding-box does NOT
    //   accidentally swallow unselected neighbour cells.
    const isIrregular = !isRectangularShape(selectedCoords);
    const finalRowSpan = isIrregular ? 1 : rowSpan;
    const finalColSpan = isIrregular ? 1 : colSpan;

    // Primary cell stores precise mergedCoords list + shape metadata
    updatedCells[primaryCoord] = {
      coordinate: primaryCoord,
      category: targetCategory,
      products: finalProducts,
      maxPallets: totalMaxPallets,
      rowSpan: finalRowSpan,
      colSpan: finalColSpan,
      mergedCoords: [...selectedCoords],
      isIrregular,
      ...(finalIsRefrigerated ? { isRefrigerated: true } : {}),
      ...(finalIsObstacle ? { isObstacle: true } : {})
    };

    onUpdateWarehouse({ ...warehouse, cells: updatedCells });
    setSelectedCoords([]);
  };

  // ── Feature 3: Core unmerge execution ─────────────────────────────────────
  // Splits a merged primary cell back into individual cells and applies the
  // resolved product assignments (null = no products on any cell).
  const performUnmerge = (primaryCoord, cell, mergedCoords, manualAssignments, pendingToAdd) => {
    const updatedCells = { ...cells };
    mergedCoords.forEach(coord => {
      const assignedProducts = manualAssignments ? (manualAssignments[coord] || []) : [];
      updatedCells[coord] = {
        coordinate: coord,
        category: assignedProducts.length > 0
          ? (cell.category || '')
          : (coord === primaryCoord ? cell.category || '' : ''),
        products: assignedProducts,
        maxPallets: 8,
        ...(coord === primaryCoord && cell.isObstacle ? { isObstacle: true } : {}),
        ...(coord === primaryCoord && cell.isPath ? { isPath: true } : {}),
        ...(coord === primaryCoord && cell.isRefrigerated ? { isRefrigerated: true } : {})
      };
    });
    const currentPending = warehouse.pendingProducts || [];
    onUpdateWarehouse({
      ...warehouse,
      cells: updatedCells,
      pendingProducts: [...currentPending, ...(pendingToAdd || [])]
    });
    setSelectedCoords([]);
    setUnmergeDistribution(null);
  };

  // Confirm distribution choice from the distribution modal
  const handleConfirmDistribution = (mode, manualAssignments = null, pendingProducts = null) => {
    if (!unmergeDistribution) return;
    const { primaryCoord, cell, mergedCoords, products } = unmergeDistribution;
    if (mode === 'clear') {
      // All products move to the warehouse-level pending pool; restore cells empty
      performUnmerge(primaryCoord, cell, mergedCoords, null, products);
    } else {
      // Manual distribution — each cell gets its assigned product subset
      performUnmerge(primaryCoord, cell, mergedCoords, manualAssignments, pendingProducts || []);
    }
  };

  // Unmerge: restore merged cell back into individual cells
  const handleUnmergeSelectedCell = () => {
    if (selectedCoords.length === 0) return;

    let primaryCoord = null;
    for (const coord of selectedCoords) {
      const c = cells[coord];
      if (c && (c.rowSpan > 1 || c.colSpan > 1 || c.mergedCoords?.length > 0)) {
        primaryCoord = coord;
        break;
      }
    }
    if (!primaryCoord) return;

    const cell = cells[primaryCoord];
    const mergedCoords = cell.mergedCoords || [primaryCoord];
    const hasProducts = cell.products && cell.products.length > 0;

    if (hasProducts) {
      // Open the inventory distribution modal before making any state changes
      setUnmergeDistribution({
        primaryCoord,
        cell,
        mergedCoords,
        products: cell.products,
        mode: 'select',   // 'select' | 'manual'
        productCellMap: {}
      });
    } else {
      // No inventory — instant unmerge with no modal
      performUnmerge(primaryCoord, cell, mergedCoords, null, null);
    }
  };

  // Remove cells: mark selected cells as removed (leaves blank space in grid)
  const handleRemoveSelectedCells = () => {
    if (selectedCoords.length === 0) return;
    const coordsToRemove = [...selectedCoords];

    // Safety guardrail: check if any selected cell has active inventory
    const occupiedCells = coordsToRemove
      .filter(coord => {
        const cell = cells[coord];
        return cell && !cell.isRemoved && cell.products && cell.products.length > 0;
      })
      .map(coord => ({ coord, count: cells[coord].products.length }));

    if (occupiedCells.length > 0) {
      // Store data in state so the confirm dialog can perform the removal with
      // fresh cells/warehouse references at click time
      setDeleteConfirm({ coordsToRemove, occupiedCells });
      return;
    }

    const updatedCells = { ...cells };
    coordsToRemove.forEach(coord => {
      updatedCells[coord] = { coordinate: coord, isRemoved: true };
    });
    onUpdateWarehouse({ ...warehouse, cells: updatedCells });
    setSelectedCoords([]);
  };

  // Restore removed cells via toolbar (multi-select)
  const handleRestoreSelectedCells = () => {
    if (selectedCoords.length === 0) return;
    const updatedCells = { ...cells };
    selectedCoords.forEach(coord => {
      if (updatedCells[coord]?.isRemoved) {
        delete updatedCells[coord];
      }
    });
    onUpdateWarehouse({ ...warehouse, cells: updatedCells });
    setSelectedCoords([]);
  };

  // Single-click restore from Edit Mode "+" button (no selection needed)
  const handleRestoreCell = (coord) => {
    const updatedCells = { ...cells };
    delete updatedCells[coord];
    onUpdateWarehouse({ ...warehouse, cells: updatedCells });
  };


  // Helper to get total pallets and properties in cell
  const getCellStats = (coordinate) => {
    const cell = cells[coordinate];
    const defaultMaxPallets = 8;
    const maxPal = (cell && cell.maxPallets !== undefined) ? cell.maxPallets : defaultMaxPallets;
    const isObstacle = cell ? !!cell.isObstacle : false;
    const isPath = cell ? !!cell.isPath : false;
    const isRefrigerated = cell ? !!cell.isRefrigerated : false;
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
        isRefrigerated: false,
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
        isRefrigerated,
        obstacleType,
        minThreshold
      };
    }
    // Sum the user-entered palletCount per product variant (independent field, not derived)
    const pallets = cell.products.reduce((acc, prod) => {
      return acc + (prod.palletCount !== undefined ? Number(prod.palletCount) : 0);
    }, 0);
    return {
      category: cell.category || 'Unassigned',
      pallets,
      count: cell.products.length,
      maxPallets: maxPal,
      isObstacle,
      isPath: false,
      isRefrigerated,
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
  // Count removed cells
  const removedCellsCount = Object.values(cells).filter(c => c.isRemoved).length;
  const storageCellsCount = totalCellsCount - obstacleCellsCount - removedCellsCount;
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
            <button
              onClick={() => setEditMode(prev => !prev)}
              className="btn btn-secondary"
              style={{
                ...styles.editLayoutBtn,
                color: editMode ? 'var(--success)' : 'var(--text-secondary)',
                borderColor: editMode ? 'rgba(16,185,129,0.5)' : undefined,
                backgroundColor: editMode ? 'rgba(16,185,129,0.08)' : undefined
              }}
              title="Toggle Edit Mode: shows + buttons on removed cells for quick restore"
            >
              {editMode ? '✅' : '🔧'} Edit Mode{editMode ? ' (ON)' : ''}
            </button>
          </div>
          <p style={styles.gridSubtext}>
            Click a cell to view/edit inventory. <strong>Ctrl+Click</strong> multiple cells to build custom shapes (L/T). <strong>Drag</strong> or <strong>Shift+Click</strong> for rectangle selections. Toggle <strong>Edit Mode</strong> to reveal empty-slot restore buttons.
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
              <span style={{ ...styles.legendDot, background: 'linear-gradient(135deg, #0c2a4a 0%, #0e3d6e 100%)', border: '1.5px solid #38bdf8' }}></span>
              <span style={{ color: '#38bdf8', fontWeight: '600' }}>❄️ Cold Storage</span>
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
            {/* Edit single cell */}
            {selectedCoords.length === 1 && !cells[selectedCoords[0]]?.isRemoved && (
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

            {/* Merge (multi-select, no removed cells) */}
            {selectedCoords.length > 1 && !selectedCoords.some(c => cells[c]?.isRemoved) && (
              <button
                className="btn btn-primary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => handleMergeSelectedCells()}
              >
                🔗 Merge Cells
              </button>
            )}

            {/* Unmerge merged cell — detects both old rowSpan and new mergedCoords */}
            {selectedCoords.length === 1 && cells[selectedCoords[0]] &&
              (cells[selectedCoords[0]].rowSpan > 1 || cells[selectedCoords[0]].colSpan > 1 || cells[selectedCoords[0]].mergedCoords?.length > 0) && (
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  onClick={handleUnmergeSelectedCell}
                >
                  🔓 Unmerge
                </button>
              )}

            {/* Remove Cells (only non-removed cells selected) */}
            {!selectedCoords.every(c => cells[c]?.isRemoved) && (
              <button
                className="btn btn-secondary"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  color: 'var(--warning)',
                  borderColor: 'rgba(245,158,11,0.3)'
                }}
                onClick={handleRemoveSelectedCells}
                title="Remove selected cells from the floor plan (leaves blank space)"
              >
                ✂️ Remove Cell{selectedCoords.length > 1 ? 's' : ''}
              </button>
            )}

            {/* Restore removed cells */}
            {selectedCoords.some(c => cells[c]?.isRemoved) && (
              <button
                className="btn btn-secondary"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  color: 'var(--success)',
                  borderColor: 'rgba(16,185,129,0.3)'
                }}
                onClick={handleRestoreSelectedCells}
              >
                ♻️ Restore Cell{selectedCoords.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Merge Conflict Dialog */}
      {mergeConflict && (
        <div style={styles.conflictOverlay} className="animate-fade-in">
          <div style={styles.conflictDialog} className="card glass">
            <div style={styles.conflictHeader}>
              <span style={styles.conflictIcon}>⚠️</span>
              <div>
                <h4 style={styles.conflictTitle}>Category Conflict Detected</h4>
                <p style={styles.conflictDesc}>The selected cells have different categories. Choose which category the merged cell should use:</p>
              </div>
            </div>
            <div style={styles.conflictCategories}>
              {mergeConflict.categories.map(cat => (
                <button
                  key={cat}
                  className="btn btn-secondary"
                  style={styles.conflictCatBtn}
                  onClick={() => mergeConflict.onResolve(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div style={styles.conflictActions}>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                onClick={mergeConflict.onCancel}
              >
                Cancel Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Occupied Cell — Safety Confirmation */}
      {deleteConfirm && (
        <div style={styles.conflictOverlay} className="animate-fade-in">
          <div style={{ ...styles.conflictDialog, border: '1px solid rgba(239,68,68,0.4)', boxShadow: '0 0 40px rgba(239,68,68,0.12)' }} className="card glass">
            <div style={styles.conflictHeader}>
              <span style={styles.conflictIcon}>⛔</span>
              <div>
                <h4 style={styles.conflictTitle}>Occupied Cell — Delete Warning</h4>
                <p style={styles.conflictDesc}>
                  The following {deleteConfirm.occupiedCells.length > 1 ? 'cells contain' : 'cell contains'} active inventory.
                  Removing {deleteConfirm.occupiedCells.length > 1 ? 'them' : 'it'} will <strong>permanently discard all stored product data</strong>.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {deleteConfirm.occupiedCells.map(({ coord, count }) => (
                <div key={coord} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: 'rgba(239,68,68,0.06)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.18)' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--danger)', fontSize: '0.9rem' }}>{coord.replace('-', '')}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{count} product variant{count > 1 ? 's' : ''} will be lost</span>
                </div>
              ))}
            </div>
            <div style={{ ...styles.conflictActions, justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn"
                style={{ fontSize: '0.8rem', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--danger)', padding: '0.4rem 1rem', borderRadius: '8px' }}
                onClick={() => {
                  const updatedCells = { ...cells };
                  deleteConfirm.coordsToRemove.forEach(coord => {
                    updatedCells[coord] = { coordinate: coord, isRemoved: true };
                  });
                  onUpdateWarehouse({ ...warehouse, cells: updatedCells });
                  setSelectedCoords([]);
                  setDeleteConfirm(null);
                }}
              >
                🗑️ Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Content Conflict — choose which cell's products to keep */}
      {mergeContentConflict && (
        <div style={styles.conflictOverlay} className="animate-fade-in">
          <div style={{ ...styles.conflictDialog, maxWidth: '560px' }} className="card glass">
            <div style={styles.conflictHeader}>
              <span style={styles.conflictIcon}>📦</span>
              <div>
                <h4 style={styles.conflictTitle}>Content Conflict: Multiple Cells Have Products</h4>
                <p style={styles.conflictDesc}>Choose which cell's inventory to keep in the merged cell, or combine all products.</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {mergeContentConflict.sourceCells.map(({ coord, products }) => (
                <button
                  key={coord}
                  className="btn btn-secondary"
                  style={{ textAlign: 'left', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start', borderColor: 'rgba(59,130,246,0.25)' }}
                  onClick={() => mergeContentConflict.onKeep(coord)}
                >
                  <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '0.9rem', color: 'var(--primary)' }}>
                    Keep Cell {coord.replace('-', '')} &nbsp;·&nbsp; {products.length} variant{products.length > 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {products.slice(0, 3).map(p => p.name).join(', ')}{products.length > 3 ? ` +${products.length - 3} more` : ''}
                  </span>
                </button>
              ))}
              <button
                className="btn btn-primary"
                style={{ padding: '0.6rem 1rem', marginTop: '0.25rem' }}
                onClick={mergeContentConflict.onCombine}
              >
                🔗 Combine All Products
              </button>
            </div>
            <div style={styles.conflictActions}>
              <button className="btn btn-secondary" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} onClick={mergeContentConflict.onCancel}>
                Cancel Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Feature 2: Type Conflict Dialog ─────────────────────────────────── */}
      {typeConflict && (
        <div style={styles.conflictOverlay} className="animate-fade-in">
          <div style={{
            ...styles.conflictDialog,
            border: '1px solid rgba(139,92,246,0.4)',
            boxShadow: '0 0 40px rgba(139,92,246,0.12)'
          }} className="card glass">
            <div style={styles.conflictHeader}>
              <span style={styles.conflictIcon}>🔀</span>
              <div>
                <h4 style={styles.conflictTitle}>Cell Type Conflict Detected</h4>
                <p style={styles.conflictDesc}>
                  The selected cells include different types: <strong>{typeConflict.types.join(', ')}</strong>.
                  Choose which type the merged cell should adopt:
                </p>
              </div>
            </div>
            <div style={styles.conflictCategories}>
              {typeConflict.types.map(type => {
                const icon = type === 'Freezer' ? '❄️' : type === 'Obstacle' ? '🚧' : '📦';
                const color = type === 'Freezer' ? '#38bdf8' : type === 'Obstacle' ? 'var(--warning)' : 'var(--success)';
                return (
                  <button
                    key={type}
                    className="btn btn-secondary"
                    style={{ ...styles.conflictCatBtn, borderColor: `${color}66`, color }}
                    onClick={() => typeConflict.onResolve(type)}
                  >
                    {icon} {type}
                  </button>
                );
              })}
            </div>
            <div style={styles.conflictActions}>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                onClick={typeConflict.onCancel}
              >
                Cancel Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Feature 3: Unmerge Inventory Distribution Modal ──────────────────── */}
      {unmergeDistribution && (
        <div style={styles.conflictOverlay} className="animate-fade-in">
          <div style={{
            ...styles.conflictDialog,
            maxWidth: '680px',
            maxHeight: '84vh',
            overflowY: 'auto',
            border: '1px solid rgba(59,130,246,0.35)',
            boxShadow: '0 0 50px rgba(59,130,246,0.12)'
          }} className="card glass">

            {/* Header */}
            <div style={styles.conflictHeader}>
              <span style={styles.conflictIcon}>🔓</span>
              <div style={{ flex: 1 }}>
                <h4 style={styles.conflictTitle}>Unmerge &amp; Distribute Inventory</h4>
                <p style={styles.conflictDesc}>
                  Merged cell{' '}
                  <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>
                    {unmergeDistribution.primaryCoord}
                  </strong>{' '}
                  contains <strong>{unmergeDistribution.products.length}</strong> product variant
                  {unmergeDistribution.products.length > 1 ? 's' : ''}. Choose how to distribute
                  across <strong>{unmergeDistribution.mergedCoords.length}</strong> restored cells.
                </p>
              </div>
            </div>

            {/* Restored cells pill preview */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {unmergeDistribution.mergedCoords.map(c => (
                <span key={c} style={{
                  fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: '700',
                  backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                  color: 'var(--primary)', padding: '0.2rem 0.55rem', borderRadius: '6px'
                }}>{c}</span>
              ))}
            </div>

            {/* ─ Mode: initial choice ─────────────────────────────────────────── */}
            {unmergeDistribution.mode === 'select' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{
                    textAlign: 'left', padding: '1.1rem 1.25rem',
                    display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start',
                    borderColor: 'rgba(59,130,246,0.3)'
                  }}
                  onClick={() => setUnmergeDistribution(prev => ({
                    ...prev,
                    mode: 'manual',
                    productCellMap: Object.fromEntries(
                      prev.products.map((_, i) => [i, '__unassign__'])
                    )
                  }))}
                >
                  <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--primary)' }}>📋 Manual Assignment</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manually choose which restored cell receives each product SKU</span>
                </button>
                <button
                  className="btn btn-secondary"
                  style={{
                    textAlign: 'left', padding: '1.1rem 1.25rem',
                    display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start',
                    color: 'var(--warning)', borderColor: 'rgba(245,158,11,0.35)'
                  }}
                  onClick={() => handleConfirmDistribution('clear')}
                >
                  <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>📤 Clear &amp; Unassign</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Restore all cells empty — move stock to the pending unassigned pool
                  </span>
                </button>
              </div>
            )}

            {/* ─ Mode: manual product-to-cell assignment ──────────────────────── */}
            {unmergeDistribution.mode === 'manual' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Assign each product variant to a restored cell, or leave it as <em>Unassigned</em> to move it to the pending pool.
                </p>

                {/* Product assignment rows */}
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '0.55rem',
                  maxHeight: '38vh', overflowY: 'auto', paddingRight: '0.25rem'
                }}>
                  {unmergeDistribution.products.map((product, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: '0.85rem',
                      padding: '0.65rem 0.9rem', borderRadius: '9px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)'
                    }}>
                      {/* Product info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: '600', fontSize: '0.86rem', color: 'var(--text-primary)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {product.name || `Product ${idx + 1}`}
                        </div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          {product.sku ? `SKU: ${product.sku}` : ''}
                          {product.sku && product.palletCount ? '  ·  ' : ''}
                          {product.palletCount ? `${product.palletCount} pallets` : ''}
                        </div>
                      </div>

                      {/* Cell selector */}
                      <select
                        value={unmergeDistribution.productCellMap[idx] ?? '__unassign__'}
                        onChange={e => setUnmergeDistribution(prev => ({
                          ...prev,
                          productCellMap: { ...prev.productCellMap, [idx]: e.target.value }
                        }))}
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          borderRadius: '7px',
                          padding: '0.35rem 0.55rem',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          flexShrink: 0,
                          minWidth: '130px'
                        }}
                      >
                        <option value="__unassign__">📤 Unassign</option>
                        {unmergeDistribution.mergedCoords.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Footer actions */}
                <div style={{
                  display: 'flex', gap: '0.75rem', justifyContent: 'flex-end',
                  borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem'
                }}>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem' }}
                    onClick={() => setUnmergeDistribution(prev => ({ ...prev, mode: 'select' }))}
                  >
                    ← Back
                  </button>
                  {/* Live assignment summary */}
                  {(() => {
                    const { products, mergedCoords, productCellMap } = unmergeDistribution;
                    const assignedCount = products.filter((_, i) =>
                      (productCellMap[i] ?? '__unassign__') !== '__unassign__'
                    ).length;
                    const pendingCount = products.length - assignedCount;
                    return (
                      <div style={{
                        fontSize: '0.78rem', color: 'var(--text-secondary)',
                        display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap'
                      }}>
                        <span>
                          <strong style={{ color: 'var(--success)' }}>{assignedCount}</strong> assigned
                        </span>
                        {pendingCount > 0 && (
                          <span>
                            <strong style={{ color: 'var(--warning)' }}>{pendingCount}</strong> → pending pool
                          </span>
                        )}
                        {assignedCount === 0 && (
                          <span style={{ color: 'var(--danger)', fontSize: '0.73rem' }}>
                            ⚠ All products will be unassigned
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: '0.85rem', padding: '0.4rem 1.1rem' }}
                    onClick={() => {
                      const { products, mergedCoords, productCellMap } = unmergeDistribution;
                      const assignments = Object.fromEntries(mergedCoords.map(c => [c, []]));
                      const pending = [];
                      products.forEach((p, idx) => {
                        const dest = productCellMap[idx] ?? '__unassign__';
                        if (dest === '__unassign__' || !assignments[dest]) {
                          pending.push(p);
                        } else {
                          assignments[dest].push(p);
                        }
                      });
                      handleConfirmDistribution('manual', assignments, pending);
                    }}
                  >
                    ✅ Confirm Distribution
                  </button>
                </div>
              </div>
            )}

            {/* Cancel */}
            <div style={styles.conflictActions}>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                onClick={() => setUnmergeDistribution(null)}
              >
                Cancel Unmerge
              </button>
            </div>
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

                  // Render removed cells — invisible placeholders normally, visible with "+" in Edit Mode
                  if (cell.isRemoved) {
                    const isSelected = selectedCoords.includes(coordinate);
                    const showSlot = isSelected || editMode;
                    return (
                      <div
                        key={coordinate}
                        onMouseDown={(e) => handleCellMouseDown(coordinate, e)}
                        onMouseEnter={() => handleCellMouseEnter(coordinate)}
                        onClick={() => {
                          if (editMode && !isSelected) {
                            handleRestoreCell(coordinate); // Edit Mode: single-click restore
                          } else {
                            handleCellClick(coordinate);
                          }
                        }}
                        style={{
                          ...styles.gridCell,
                          gridRowStart: r + 2,
                          gridRowEnd: r + 2 + 1,
                          gridColumnStart: c + 2,
                          gridColumnEnd: c + 2 + 1,
                          visibility: showSlot ? 'visible' : 'hidden',
                          border: isSelected
                            ? '2px dashed var(--warning)'
                            : editMode
                              ? '2px dashed rgba(16,185,129,0.35)'
                              : '2px dashed transparent',
                          backgroundColor: isSelected
                            ? 'rgba(245,158,11,0.05)'
                            : editMode
                              ? 'rgba(16,185,129,0.03)'
                              : 'transparent',
                          boxShadow: 'none',
                          cursor: 'pointer'
                        }}
                        className="removed-cell-slot"
                      >
                        {showSlot && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.25rem' }}>
                            {isSelected ? (
                              <>
                                <span style={{ fontSize: '1.2rem' }}>↩️</span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--warning)', fontWeight: '600', textAlign: 'center' }}>REMOVED<br />Click Restore</span>
                              </>
                            ) : (
                              <>
                                <span style={{ fontSize: '1.6rem', color: 'var(--success)', lineHeight: 1, fontWeight: '300' }}>+</span>
                                <span style={{ fontSize: '0.6rem', color: 'var(--success)', fontWeight: '700', fontFamily: 'monospace', textAlign: 'center' }}>{coordinate.replace('-', '')}</span>
                                <span style={{ fontSize: '0.55rem', color: 'rgba(16,185,129,0.6)', textAlign: 'center' }}>restore slot</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const covering = getCoveringCell(cells, coordinate);
                  if (covering && covering.primaryCoord !== coordinate) {
                    // ── Coordinate-Map Architecture ────────────────────────────
                    // For IRREGULAR (non-rectangular) merged shapes, each non-primary
                    // coordinate must still render its own DOM node (an "extension
                    // cell") so the CSS grid does not swallow unrelated cells that
                    // fall inside the bounding box but are NOT part of the shape.
                    // For RECTANGULAR merges the primary's rowSpan/colSpan covers
                    // every secondary slot, so we return null as before.
                    const primaryCellData = cells[covering.primaryCoord];
                    if (primaryCellData?.isIrregular) {
                      const shapeCoordSet = new Set(primaryCellData.mergedCoords || []);
                      const sides = getShapeConnectorSides(coordinate, shapeCoordSet);
                      const primStats = getCellStats(covering.primaryCoord);
                      const extCapStyle = getCapacityStyles(
                        primStats.pallets, primStats.maxPallets,
                        primStats.isObstacle, primStats.obstacleType,
                        primStats.minThreshold, primStats.isPath
                      );
                      const isExtSelected = selectedCoords.includes(coordinate);
                      // Derive accent colour for the extension tile
                      const extAccent = primaryCellData.isRefrigerated
                        ? '#38bdf8'
                        : primaryCellData.isObstacle
                          ? 'rgba(245,158,11,0.6)'
                          : extCapStyle.color || 'var(--primary)';
                      const extBg = primaryCellData.isRefrigerated
                        ? 'linear-gradient(145deg,rgba(8,28,52,0.85) 0%,rgba(10,45,85,0.75) 100%)'
                        : primaryCellData.isObstacle
                          ? 'repeating-linear-gradient(45deg,rgba(31,41,55,0.4),rgba(31,41,55,0.4) 8px,rgba(75,85,99,0.2) 8px,rgba(75,85,99,0.2) 16px)'
                          : (extCapStyle.bg || 'rgba(59,130,246,0.05)');
                      return (
                        <div
                          key={coordinate}
                          onMouseDown={(e) => handleCellMouseDown(coordinate, e)}
                          onMouseEnter={() => handleCellMouseEnter(coordinate)}
                          onClick={() => handleCellClick(covering.primaryCoord)}
                          title={`Extension of merged cell ${covering.primaryCoord.replace('-', '')}`}
                          style={{
                            ...styles.gridCell,
                            gridRowStart: r + 2,
                            gridRowEnd:   r + 3,
                            gridColumnStart: c + 2,
                            gridColumnEnd:   c + 3,
                            background: extBg,
                            // Suppress shared edges so adjacent extension tiles look fused
                            borderTopColor:    sides.top    ? 'transparent' : (isExtSelected ? 'var(--primary)' : extAccent + '55'),
                            borderBottomColor: sides.bottom ? 'transparent' : (isExtSelected ? 'var(--primary)' : extAccent + '55'),
                            borderLeftColor:   sides.left   ? 'transparent' : (isExtSelected ? 'var(--primary)' : extAccent + '55'),
                            borderRightColor:  sides.right  ? 'transparent' : (isExtSelected ? 'var(--primary)' : extAccent + '55'),
                            borderStyle: 'dashed',
                            borderWidth: isExtSelected ? '2px' : '1px',
                            boxShadow: isExtSelected ? `0 0 0 2px var(--primary)` : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            opacity: 0.82,
                            minHeight: '115px'
                          }}
                          className={`grid-cell-extension ${isExtSelected ? 'selected' : ''}`}
                        >
                          <span style={{
                            fontSize: '0.6rem',
                            fontFamily: 'monospace',
                            fontWeight: '700',
                            color: extAccent,
                            opacity: 0.7,
                            letterSpacing: '0.02em',
                            userSelect: 'none'
                          }}>
                            ↳ {covering.primaryCoord.replace('-', '')}
                          </span>
                        </div>
                      );
                    }
                    // Rectangular merge: primary's CSS span covers this slot
                    return null;
                  }

                  const stats = getCellStats(coordinate);
                  const isSelected = selectedCoords.includes(coordinate);
                  const capStyle = getCapacityStyles(stats.pallets, stats.maxPallets, stats.isObstacle, stats.obstacleType, stats.minThreshold, stats.isPath);

                  const cellRowSpan = cell.rowSpan || 1;
                  const cellColSpan = cell.colSpan || 1;
                  // A merged cell is custom-shaped when isIrregular === true
                  const isMergedCell = !!(cell.mergedCoords && cell.mergedCoords.length > 1);
                  const mergedCellCount = cell.mergedCoords?.length || 1;

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

                  // Render Refrigerator / Freezer Cell
                  if (stats.isRefrigerated) {
                    return (
                      <div
                        key={coordinate}
                        onMouseDown={(e) => handleCellMouseDown(coordinate, e)}
                        onMouseEnter={() => handleCellMouseEnter(coordinate)}
                        onDoubleClick={() => onCellClick(coordinate, cell)}
                        onClick={() => handleCellClick(coordinate)}
                        style={{
                          ...styles.gridCell,
                          background: isSelected
                            ? 'rgba(56,189,248,0.12)'
                            : stats.pallets > 0
                              ? 'linear-gradient(145deg, rgba(12,42,74,0.85) 0%, rgba(14,61,110,0.75) 100%)'
                              : 'linear-gradient(145deg, rgba(8,28,52,0.9) 0%, rgba(10,45,85,0.8) 100%)',
                          borderColor: isSelected ? 'var(--primary)' : '#38bdf8',
                          boxShadow: isSelected
                            ? '0 0 0 3px var(--primary)'
                            : '0 0 16px rgba(56,189,248,0.12), inset 0 1px 0 rgba(56,189,248,0.1)',
                          gridRowStart: r + 2,
                          gridRowEnd: r + 2 + cellRowSpan,
                          gridColumnStart: c + 2,
                          gridColumnEnd: c + 2 + cellColSpan
                        }}
                        className={`grid-cell-card refrigerated-cell ${isSelected ? 'selected' : ''}`}
                      >
                        <div style={styles.cellTop}>
                          <span style={{ ...styles.cellCoordinate, color: '#7dd3fc' }}>{row}{col}</span>
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            {stats.pallets > 0 && (
                              <span style={styles.variantCountBadge}>{stats.count} SKU{stats.count > 1 ? 's' : ''}</span>
                            )}
                            <span style={styles.refrigCellBadge}>❄️ COLD</span>
                          </div>
                        </div>
                        <div style={styles.cellBody}>
                          {stats.pallets > 0 ? (
                            <>
                              <span style={{ ...styles.cellCategory, color: '#38bdf8' }}>{stats.category}</span>
                              <div style={styles.palletInfo}>
                                <span style={styles.palletVal}>{stats.pallets}</span>
                                <span style={styles.palletUnit}> / {stats.maxPallets} Pallets</span>
                              </div>
                              <div style={styles.progressBarBg}>
                                <div style={{ ...styles.progressBarFill, backgroundColor: '#38bdf8', width: `${Math.min((stats.pallets / stats.maxPallets) * 100, 100)}%` }}></div>
                              </div>
                            </>
                          ) : (
                            <span style={{ ...styles.emptyCellText, color: '#38bdf8' }}>❄️ Cold Storage Ready</span>
                          )}
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
                        {isMergedCell && (
                          <span style={{
                            fontSize: '0.58rem',
                            backgroundColor: cell.isIrregular ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.1)',
                            border: `1px solid ${cell.isIrregular ? 'rgba(139,92,246,0.4)' : 'rgba(59,130,246,0.3)'}`,
                            color: cell.isIrregular ? '#a78bfa' : 'var(--primary)',
                            padding: '0.1rem 0.3rem',
                            borderRadius: '4px',
                            fontWeight: '700',
                            letterSpacing: '0.02em',
                            flexShrink: 0
                          }}>
                            {cell.isIrregular ? '⬡' : '⬜'} ×{mergedCellCount}
                          </span>
                        )}
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

      {/* ── Feature 1: Adjacency Error Toast ────────────────────────────────── */}
      {adjacencyError && (
        <div
          className="toast-slide-in"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 9999,
            backgroundColor: 'rgba(20,10,10,0.96)',
            border: '1px solid rgba(239,68,68,0.55)',
            borderRadius: '13px',
            padding: '1rem 1.1rem',
            maxWidth: '390px',
            boxShadow: '0 10px 40px rgba(239,68,68,0.22)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.85rem',
            backdropFilter: 'blur(10px)'
          }}
        >
          <span style={{ fontSize: '1.5rem', flexShrink: 0, lineHeight: 1 }}>⛔</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
              Merge Blocked — Non-Adjacent Selection
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {adjacencyError}
            </div>
          </div>
          <button
            onClick={() => setAdjacencyError(null)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: '1.1rem', flexShrink: 0, padding: 0, lineHeight: 1
            }}
            title="Dismiss"
          >×</button>
        </div>
      )}

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
        @keyframes iceGlow {
          0%   { box-shadow: 0 0 8px rgba(56,189,248,0.1), inset 0 1px 0 rgba(56,189,248,0.08); }
          50%  { box-shadow: 0 0 18px rgba(56,189,248,0.22), inset 0 1px 0 rgba(56,189,248,0.15); }
          100% { box-shadow: 0 0 8px rgba(56,189,248,0.1), inset 0 1px 0 rgba(56,189,248,0.08); }
        }
        .refrigerated-cell {
          animation: iceGlow 3s ease-in-out infinite;
        }
        .refrigerated-cell:hover {
          border-color: #7dd3fc !important;
          background: linear-gradient(145deg, rgba(14,55,100,0.95) 0%, rgba(16,72,130,0.85) 100%) !important;
        }
        .removed-cell-slot:hover {
          visibility: visible !important;
          opacity: 0.8;
        }
        /* Extension cells: hover brightens and shows the entire shape's selection ring */
        .grid-cell-extension {
          transition: opacity 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .grid-cell-extension:hover {
          opacity: 1 !important;
          z-index: 4;
        }
        @keyframes toastSlideIn {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .toast-slide-in {
          animation: toastSlideIn 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
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
  refrigCellBadge: {
    fontSize: '0.6rem',
    backgroundColor: 'rgba(56,189,248,0.12)',
    padding: '0.15rem 0.35rem',
    borderRadius: '4px',
    color: '#38bdf8',
    fontWeight: '700',
    letterSpacing: '0.02em',
    border: '1px solid rgba(56,189,248,0.25)'
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
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  conflictOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(5, 7, 12, 0.75)',
    backdropFilter: 'blur(6px)',
    zIndex: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem'
  },
  conflictDialog: {
    maxWidth: '480px',
    width: '100%',
    padding: '1.75rem',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    boxShadow: '0 0 40px rgba(245, 158, 11, 0.1)'
  },
  conflictHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  conflictIcon: {
    fontSize: '2rem',
    lineHeight: 1,
    flexShrink: 0
  },
  conflictTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '0.35rem'
  },
  conflictDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5'
  },
  conflictCategories: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem'
  },
  conflictCatBtn: {
    padding: '0.5rem 1.25rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    color: 'var(--warning)'
  },
  conflictActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '0.75rem'
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
