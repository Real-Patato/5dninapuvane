// Default Users
export const DEFAULT_USERS = [
  {
    id: "user-1",
    email: "admin@aetherwms.com",
    password: "password123",
    name: "Alex Chief"
  }
];

// Default Custom Field Templates
export const DEFAULT_CUSTOM_FIELDS = [
  {
    id: "field-batch",
    label: "Batch Number",
    type: "text",
    description: "Production batch code"
  },
  {
    id: "field-temp",
    label: "Temperature Requirement (°C)",
    type: "number",
    description: "Optimal storage temperature in Celsius"
  },
  {
    id: "field-supplier",
    label: "Supplier Code",
    type: "text",
    description: "Unique identifier for the product supplier"
  }
];

// Helper to calculate total pallets
export const calculatePallets = (stock, itemsPerPallet) => {
  if (!itemsPerPallet || itemsPerPallet <= 0) return 0;
  return parseFloat((stock / itemsPerPallet).toFixed(2));
};

// Default pre-populated warehouses
export const DEFAULT_WAREHOUSES = [
  {
    id: "wh-1",
    userId: "user-1",
    name: "Main Logistics Hub",
    rows: 5, // A to E
    columns: 6, // 1 to 6
    cells: {}
  },
  {
    id: "wh-2",
    userId: "user-1",
    name: "Cold Storage Annex",
    rows: 3, // A to C
    columns: 4, // 1 to 4
    cells: {}
  }
];
