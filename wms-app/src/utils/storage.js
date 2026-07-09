import { DEFAULT_USERS, DEFAULT_CUSTOM_FIELDS, DEFAULT_WAREHOUSES } from './mockData';

const KEYS = {
  USERS: 'wms_users',
  WAREHOUSES: 'wms_warehouses',
  CUSTOM_FIELDS: 'wms_custom_fields',
  CURRENT_USER: 'wms_current_user'
};

export const initializeStorage = () => {
<<<<<<< HEAD
  const FORCE_RESET_KEY = 'wms_force_reset_v3';
  if (!localStorage.getItem(FORCE_RESET_KEY)) {
    localStorage.removeItem(KEYS.USERS);
    localStorage.removeItem(KEYS.WAREHOUSES);
    localStorage.removeItem(KEYS.CUSTOM_FIELDS);
    localStorage.removeItem(KEYS.CURRENT_USER);
    localStorage.setItem(FORCE_RESET_KEY, 'true');
  }

=======
>>>>>>> b262db34b4a3c03a6a46433cc684b67437667bb0
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

<<<<<<< HEAD
export const updateCellProducts = (warehouseId, coordinate, cellInfo) => {
=======
export const updateCellProducts = (warehouseId, coordinate, category, products) => {
>>>>>>> b262db34b4a3c03a6a46433cc684b67437667bb0
  const warehouses = getWarehouses();
  const updated = warehouses.map(wh => {
    if (wh.id === warehouseId) {
      const cells = { ...wh.cells };
<<<<<<< HEAD
      if (!cellInfo || (
        (!cellInfo.products || cellInfo.products.length === 0) &&
        !cellInfo.category &&
        !cellInfo.isObstacle &&
        cellInfo.maxPallets === undefined &&
        cellInfo.minThreshold === undefined
      )) {
        // Clear cell if no products and no custom properties
=======
      if (products.length === 0 && !category) {
        // Clear cell if no products
>>>>>>> b262db34b4a3c03a6a46433cc684b67437667bb0
        delete cells[coordinate];
      } else {
        cells[coordinate] = {
          coordinate,
<<<<<<< HEAD
          ...cellInfo
=======
          category,
          products
>>>>>>> b262db34b4a3c03a6a46433cc684b67437667bb0
        };
      }
      return { ...wh, cells };
    }
    return wh;
  });
  saveWarehouses(updated);
  return updated;
};
