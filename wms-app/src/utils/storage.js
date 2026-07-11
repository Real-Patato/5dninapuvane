import { DEFAULT_USERS, DEFAULT_CUSTOM_FIELDS, DEFAULT_WAREHOUSES } from './mockData';

const KEYS = {
  USERS: 'wms_users',
  WAREHOUSES: 'wms_warehouses',
  CUSTOM_FIELDS: 'wms_custom_fields',
  CURRENT_USER: 'wms_current_user'
};

export const initializeStorage = () => {
  const FORCE_RESET_KEY = 'wms_force_reset_v3';
  if (!localStorage.getItem(FORCE_RESET_KEY)) {
    localStorage.removeItem(KEYS.USERS);
    localStorage.removeItem(KEYS.WAREHOUSES);
    localStorage.removeItem(KEYS.CUSTOM_FIELDS);
    localStorage.removeItem(KEYS.CURRENT_USER);
    localStorage.setItem(FORCE_RESET_KEY, 'true');
  }

  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem(KEYS.CUSTOM_FIELDS)) {
    localStorage.setItem(KEYS.CUSTOM_FIELDS, JSON.stringify(DEFAULT_CUSTOM_FIELDS));
  }
  if (!localStorage.getItem(KEYS.WAREHOUSES)) {
    localStorage.setItem(KEYS.WAREHOUSES, JSON.stringify(DEFAULT_WAREHOUSES));
  }
};

// Users
export const getUsers = () => {
  initializeStorage();
  return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
};

export const saveUser = (user) => {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
};

// Current User Session
export const getCurrentUser = () => {
  const userJson = localStorage.getItem(KEYS.CURRENT_USER);
  return userJson ? JSON.parse(userJson) : null;
};

export const setCurrentUser = (user) => {
  if (user) {
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(KEYS.CURRENT_USER);
  }
};

// Custom Fields Configuration
export const getCustomFields = () => {
  initializeStorage();
  return JSON.parse(localStorage.getItem(KEYS.CUSTOM_FIELDS) || '[]');
};

export const saveCustomFields = (fields) => {
  localStorage.setItem(KEYS.CUSTOM_FIELDS, JSON.stringify(fields));
};

// Warehouses Layout & Inventory
export const getWarehouses = () => {
  initializeStorage();
  return JSON.parse(localStorage.getItem(KEYS.WAREHOUSES) || '[]');
};

export const saveWarehouses = (warehouses) => {
  localStorage.setItem(KEYS.WAREHOUSES, JSON.stringify(warehouses));
};

// Operations
export const addWarehouse = (warehouse) => {
  const warehouses = getWarehouses();
  warehouses.push(warehouse);
  saveWarehouses(warehouses);
  return warehouses;
};

export const deleteWarehouse = (warehouseId) => {
  const warehouses = getWarehouses();
  const updated = warehouses.filter(wh => wh.id !== warehouseId);
  saveWarehouses(updated);
  return updated;
};

export const updateCellProducts = (warehouseId, coordinate, cellInfo) => {
  const warehouses = getWarehouses();
  const updated = warehouses.map(wh => {
    if (wh.id === warehouseId) {
      const cells = { ...wh.cells };
      let pendingProducts = wh.pendingProducts ? [...wh.pendingProducts] : [];

      if (cellInfo && cellInfo.pendingProductsToAdd) {
        pendingProducts = [...pendingProducts, ...cellInfo.pendingProductsToAdd];
      }

      if (!cellInfo || (
        (!cellInfo.products || cellInfo.products.length === 0) &&
        !cellInfo.category &&
        !cellInfo.isObstacle &&
        !cellInfo.isPath &&
        !cellInfo.rowSpan &&
        !cellInfo.colSpan &&
        !cellInfo.mergedCoords &&
        cellInfo.maxPallets === undefined &&
        cellInfo.minThreshold === undefined
      )) {
        // Clear cell if no products and no custom properties
        delete cells[coordinate];
      } else if (cellInfo.breakApart && cellInfo.mergedCoords && cellInfo.mergedCoords.length > 1) {
        // Auto-Dissolve & Individual Conversion (The Break-Apart Rule)
        // Convert every sub-cell into an independent, standalone cell while maintaining positions
        cellInfo.mergedCoords.forEach(coord => {
          cells[coord] = {
            coordinate: coord,
            category: cellInfo.category || '',
            products: cellInfo.manualAssignments?.[coord] || [],
            maxPallets: cellInfo.maxPallets !== undefined ? cellInfo.maxPallets : 8,
            ...(cellInfo.isObstacle ? { isObstacle: true, obstacleType: cellInfo.obstacleType || 'pillar' } : {}),
            ...(cellInfo.isPath ? { isPath: true } : {}),
            ...(cellInfo.isRefrigerated ? { isRefrigerated: true } : {})
          };
          delete cells[coord].coveredBy;
          delete cells[coord].mergedCoords;
          delete cells[coord].rowSpan;
          delete cells[coord].colSpan;
        });
      } else {
        // Unified Type Mutation or Standard Save
        // Check if this primary cell has merged sub-cells
        const existingCell = cells[coordinate];
        const mergedList = cellInfo.mergedCoords || existingCell?.mergedCoords;

        const cleanCellInfo = { ...cellInfo };
        delete cleanCellInfo.pendingProductsToAdd;
        delete cleanCellInfo.breakApart;
        delete cleanCellInfo.manualAssignments;

        cells[coordinate] = {
          coordinate,
          ...cleanCellInfo
        };

        // If merged, ensure all secondary sub-cells point to this primary cell via coveredBy
        if (mergedList && mergedList.length > 1) {
          cells[coordinate].mergedCoords = mergedList;
          mergedList.forEach(coord => {
            if (coord !== coordinate) {
              cells[coord] = { coordinate: coord, coveredBy: coordinate };
            }
          });
        }
      }

      return { ...wh, cells, pendingProducts };
    }
    return wh;
  });
  saveWarehouses(updated);
  return updated;
};
