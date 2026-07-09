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
<<<<<<< HEAD
    cells: {}
=======
    cells: {
      "A-1": {
        coordinate: "A-1",
        category: "Milk",
        products: [
          {
            id: "p-1",
            name: "Whole Milk Organic 1L",
            price: 1.89,
            itemsPerPallet: 200,
            stock: 450,
            expirationDate: "2026-08-15",
            customFields: {
              "field-batch": "M-WH-908",
              "field-temp": 4,
              "field-supplier": "DAIRY-LTD"
            }
          },
          {
            id: "p-2",
            name: "Almond Milk Unsweetened 1L",
            price: 2.49,
            itemsPerPallet: 150,
            stock: 300,
            expirationDate: "2026-09-10",
            customFields: {
              "field-batch": "A-AL-412",
              "field-temp": 6,
              "field-supplier": "NUTRA-FOODS"
            }
          }
        ]
      },
      "A-3": {
        coordinate: "A-3",
        category: "Electronics",
        products: [
          {
            id: "p-3",
            name: "LED Monitors 24\"",
            price: 149.99,
            itemsPerPallet: 40,
            stock: 35,
            expirationDate: "2029-12-31",
            customFields: {
              "field-batch": "E-MON-001",
              "field-temp": 20,
              "field-supplier": "TEK-SYS"
            }
          }
        ]
      },
      "B-2": {
        coordinate: "B-2",
        category: "Produce",
        products: [
          {
            id: "p-4",
            name: "Organic Bananas Box",
            price: 18.50,
            itemsPerPallet: 50,
            stock: 120,
            expirationDate: "2026-07-20",
            customFields: {
              "field-batch": "P-BAN-77",
              "field-temp": 12,
              "field-supplier": "GLOBAL-GROW"
            }
          }
        ]
      },
      "C-5": {
        coordinate: "C-5",
        category: "Beverages",
        products: [
          {
            id: "p-5",
            name: "Sparkling Water 24-Pack",
            price: 8.99,
            itemsPerPallet: 80,
            stock: 240,
            expirationDate: "2027-03-01",
            customFields: {
              "field-batch": "B-SPK-900",
              "field-temp": 15,
              "field-supplier": "AQUA-PURE"
            }
          }
        ]
      },
      "E-6": {
        coordinate: "E-6",
        category: "Pharmaceuticals",
        products: [
          {
            id: "p-6",
            name: "Aspirin 500mg Bottles",
            price: 4.25,
            itemsPerPallet: 500,
            stock: 1200,
            expirationDate: "2028-06-30",
            customFields: {
              "field-batch": "PH-ASP-102",
              "field-temp": 22,
              "field-supplier": "PHARMA-CORP"
            }
          }
        ]
      }
    }
>>>>>>> b262db34b4a3c03a6a46433cc684b67437667bb0
  },
  {
    id: "wh-2",
    userId: "user-1",
    name: "Cold Storage Annex",
    rows: 3, // A to C
    columns: 4, // 1 to 4
<<<<<<< HEAD
    cells: {}
=======
    cells: {
      "A-1": {
        coordinate: "A-1",
        category: "Frozen Foods",
        products: [
          {
            id: "p-7",
            name: "Frozen Pizza Deluxe",
            price: 5.99,
            itemsPerPallet: 100,
            stock: 350,
            expirationDate: "2027-01-15",
            customFields: {
              "field-batch": "FZ-PIZ-09",
              "field-temp": -18,
              "field-supplier": "ITALY-OVEN"
            }
          }
        ]
      },
      "B-3": {
        coordinate: "B-3",
        category: "Dairy",
        products: [
          {
            id: "p-8",
            name: "Greek Yogurt 500g",
            price: 2.19,
            itemsPerPallet: 300,
            stock: 900,
            expirationDate: "2026-08-01",
            customFields: {
              "field-batch": "D-YOG-88",
              "field-temp": 3,
              "field-supplier": "DAIRY-LTD"
            }
          }
        ]
      }
    }
>>>>>>> b262db34b4a3c03a6a46433cc684b67437667bb0
  }
];
