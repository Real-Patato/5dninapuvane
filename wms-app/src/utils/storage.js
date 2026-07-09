import { DEFAULT_USERS, DEFAULT_CUSTOM_FIELDS, DEFAULT_WAREHOUSES } from './mockData';

const KEYS = {
  USERS: 'wms_users',
  WAREHOUSES: 'wms_warehouses',
  CUSTOM_FIELDS: 'wms_custom_fields',
  CURRENT_USER: 'wms_current_user'
};

export const initializeStorage = () => {
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

export const updateCellProducts = (warehouseId, coordinate, category, products) => {
  const warehouses = getWarehouses();
  const updated = warehouses.map(wh => {
    if (wh.id === warehouseId) {
      const cells = { ...wh.cells };
      if (products.length === 0 && !category) {
        // Clear cell if no products
        delete cells[coordinate];
      } else {
        cells[coordinate] = {
          coordinate,
          category,
          products
        };
      }
      return { ...wh, cells };
    }
    return wh;
  });
  saveWarehouses(updated);
  return updated;
};
