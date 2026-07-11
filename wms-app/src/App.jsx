import React, { useState, useEffect } from 'react';
import {
  initializeStorage,
  getCurrentUser,
  setCurrentUser,
  getWarehouses,
  saveWarehouses,
  addWarehouse,
  deleteWarehouse,
  getCustomFields,
  saveCustomFields,
  updateCellProducts
} from './utils/storage';

import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import WarehouseGrid from './components/WarehouseGrid';
import CellModal from './components/CellModal';
import CustomFieldsConfig from './components/CustomFieldsConfig';
import CreateWarehouseModal from './components/CreateWarehouseModal';
import DeleteWarehouseModal from './components/DeleteWarehouseModal';

import './App.css';

export default function App() {
  // Navigation & session states
  const [page, setPage] = useState('landing'); // 'landing', 'auth', 'dashboard'
  const [currentUser, setLocalCurrentUser] = useState(null);
  
  // Data states
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [customFields, setCustomFields] = useState([]);

  // Dashboard Sub-navigation
  const [activeTab, setActiveTab] = useState('grid'); // 'grid' or 'custom-fields'
  
  // Modals state
  const [isCreateWarehouseOpen, setIsCreateWarehouseOpen] = useState(false);
  const [warehouseToEdit, setWarehouseToEdit] = useState(null);
  const [selectedCellCoord, setSelectedCellCoord] = useState(null);
  const [isDeleteWarehouseOpen, setIsDeleteWarehouseOpen] = useState(false);

  // Theme states
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  // Initialize Storage & Active Session
  useEffect(() => {
    initializeStorage();
    const sessionUser = getCurrentUser();
    if (sessionUser) {
      setLocalCurrentUser(sessionUser);
      setPage('dashboard');
    }

    // Load data from Storage
    const allWarehouses = getWarehouses();
    setWarehouses(allWarehouses);
    if (allWarehouses.length > 0) {
      setSelectedWarehouse(allWarehouses[0]);
    }

    const allCustomFields = getCustomFields();
    setCustomFields(allCustomFields);

    // Load theme from localStorage
    const savedTheme = localStorage.getItem('wms_theme');
    if (savedTheme === 'light') {
      setIsDarkTheme(false);
    }
  }, []);

  // Theme effect toggler
  useEffect(() => {
    if (isDarkTheme) {
      document.body.classList.remove('light-theme');
      localStorage.setItem('wms_theme', 'dark');
    } else {
      document.body.classList.add('light-theme');
      localStorage.setItem('wms_theme', 'light');
    }
  }, [isDarkTheme]);

  const handleAuthSuccess = (user) => {
    setLocalCurrentUser(user);
    const allWarehouses = getWarehouses().filter(w => w.userId === user.id || w.id.startsWith('wh-')); // Include defaults too
    setWarehouses(allWarehouses);
    if (allWarehouses.length > 0) {
      setSelectedWarehouse(allWarehouses[0]);
    } else {
      setSelectedWarehouse(null);
    }
    setPage('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLocalCurrentUser(null);
    setPage('landing');
  };

  const handleCreateWarehouse = (whData) => {
    const newWh = {
      id: `wh-${Date.now()}`,
      userId: currentUser?.id || 'guest',
      name: whData.name,
      rows: whData.rows,
      columns: whData.columns,
      cells: {}
    };

    const updated = addWarehouse(newWh);
    
    // Refresh states
    setWarehouses(updated);
    setSelectedWarehouse(newWh);
    setIsCreateWarehouseOpen(false);
  };

  const handleUpdateWarehouseLayout = (whData) => {
    if (!warehouseToEdit) return;
    const updated = warehouses.map(wh => {
      if (wh.id === warehouseToEdit.id) {
        return {
          ...wh,
          name: whData.name,
          rows: whData.rows,
          columns: whData.columns
        };
      }
      return wh;
    });

    setWarehouses(updated);
    saveWarehouses(updated);

    // Update active selected warehouse state
    const currentWh = updated.find(w => w.id === warehouseToEdit.id);
    if (currentWh) {
      setSelectedWarehouse(currentWh);
    }
    setIsCreateWarehouseOpen(false);
    setWarehouseToEdit(null);
  };

  const handleUpdateWarehouse = (updatedWh) => {
    const updated = warehouses.map(wh => wh.id === updatedWh.id ? updatedWh : wh);
    setWarehouses(updated);
    saveWarehouses(updated);
    setSelectedWarehouse(updatedWh);
  };

  const handleSaveCellData = (coordinate, cellInfo) => {
    if (!selectedWarehouse) return;

    const updatedWhs = updateCellProducts(selectedWarehouse.id, coordinate, cellInfo);
    setWarehouses(updatedWhs);

    // Update active selected warehouse state
    const currentWh = updatedWhs.find(w => w.id === selectedWarehouse.id);
    if (currentWh) {
      setSelectedWarehouse(currentWh);
    }
  };

  const handleSaveCustomFields = (updatedFields) => {
    saveCustomFields(updatedFields);
    setCustomFields(updatedFields);
  };

  const handleDeleteWarehouse = () => {
    if (!selectedWarehouse) return;
    const updated = deleteWarehouse(selectedWarehouse.id);
    setWarehouses(updated);
    setSelectedWarehouse(updated.length > 0 ? updated[0] : null);
    setIsDeleteWarehouseOpen(false);
  };

  const toggleTheme = () => {
    setIsDarkTheme(prev => !prev);
  };

  const activeCellData = selectedWarehouse?.cells?.[selectedCellCoord] || {
    coordinate: selectedCellCoord,
    category: '',
    products: []
  };

  // Page routers rendering
  if (page === 'landing') {
    return <LandingPage onNavigate={setPage} currentUser={currentUser} />;
  }

  if (page === 'auth') {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        warehouses={warehouses}
        selectedWarehouse={selectedWarehouse}
        onSelectWarehouse={setSelectedWarehouse}
        onCreateWarehouseClick={() => setIsCreateWarehouseOpen(true)}
        onDeleteWarehouseClick={() => setIsDeleteWarehouseOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        isDarkTheme={isDarkTheme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Panel Viewport */}
      <main className="main-content">
        {activeTab === 'grid' ? (
          <WarehouseGrid
            warehouse={selectedWarehouse}
            onCellClick={(coord) => setSelectedCellCoord(coord)}
            onEditLayoutClick={() => {
              setWarehouseToEdit(selectedWarehouse);
              setIsCreateWarehouseOpen(true);
            }}
            onUpdateWarehouse={handleUpdateWarehouse}
          />
        ) : (
          <CustomFieldsConfig
            customFields={customFields}
            onSaveCustomFields={handleSaveCustomFields}
          />
        )}
      </main>

      {/* Modals Overlay portals */}
      {isCreateWarehouseOpen && (
        <CreateWarehouseModal
          onClose={() => {
            setIsCreateWarehouseOpen(false);
            setWarehouseToEdit(null);
          }}
          onCreate={handleCreateWarehouse}
          onEdit={handleUpdateWarehouseLayout}
          warehouseToEdit={warehouseToEdit}
        />
      )}

      {selectedCellCoord && (
        <CellModal
          coordinate={selectedCellCoord}
          cellData={activeCellData}
          customFields={customFields}
          warehouse={selectedWarehouse}
          onClose={() => setSelectedCellCoord(null)}
          onSaveCellData={handleSaveCellData}
          onUpdateWarehouse={handleUpdateWarehouse}
        />
      )}

      {isDeleteWarehouseOpen && selectedWarehouse && (
        <DeleteWarehouseModal
          warehouse={selectedWarehouse}
          onClose={() => setIsDeleteWarehouseOpen(false)}
          onConfirm={handleDeleteWarehouse}
        />
      )}
    </div>
  );
}
