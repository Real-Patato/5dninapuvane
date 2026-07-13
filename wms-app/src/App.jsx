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

  // FIX 1: Run only ONCE on mount by stripping [currentUser] from dependencies
  useEffect(() => {
    async function loadSessionAndData() {
      // Optional: Initialize storage if your utils layer requires it
      if (typeof initializeStorage === 'function') {
        await initializeStorage();
      }

      const sessionUser = getCurrentUser();
      if (sessionUser) {
        setLocalCurrentUser(sessionUser);
        setPage('dashboard');

        const allWarehouses = await getWarehouses();
        setWarehouses(allWarehouses);
        if (allWarehouses.length > 0) {
          setSelectedWarehouse(allWarehouses[0]);
        }
      }

      // Load custom fields since they were forgotten during initialization
      const fields = await getCustomFields();
      if (fields) setCustomFields(fields);
    }
    loadSessionAndData();
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

  // FIX 2: Turned this into an async function to properly handle the promise out of getWarehouses
  const handleAuthSuccess = async (user) => {
    setLocalCurrentUser(user);

    const fetchedWarehouses = await getWarehouses();
    const allWarehouses = fetchedWarehouses.filter(w => w.userId === user.id || w.id.startsWith('wh-'));

    setWarehouses(allWarehouses);
    if (allWarehouses.length > 0) {
      setSelectedWarehouse(allWarehouses[0]);
    } else {
      setSelectedWarehouse(null);
    }
    setPage('dashboard');
  };

  const handleLogout = async () => {
    const { supabase } = await import('./utils/supabaseClient');
    await supabase.auth.signOut();
    setCurrentUser(null);
    setLocalCurrentUser(null);
    setPage('landing');
  };

  const handleCreateWarehouse = async (whData) => {
    const newWh = {
      id: `wh-${Date.now()}`,
      userId: currentUser?.id || 'guest',
      name: whData.name,
      rows: whData.rows,
      columns: whData.columns,
      cells: {}
    };

    await addWarehouse(newWh);

    const updated = await getWarehouses();
    setWarehouses(updated);
    setSelectedWarehouse(updated.find(w => w.id === newWh.id) || newWh);
    setIsCreateWarehouseOpen(false);
  };

  const handleUpdateWarehouseLayout = async (whData) => {
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

  const handleSaveCellData = async (coordinate, cellInfo) => {
    if (!selectedWarehouse) return;

    await updateCellProducts(selectedWarehouse.id, coordinate, cellInfo);

    const refreshedWarehouses = await getWarehouses();
    setWarehouses(refreshedWarehouses);

    const currentWh = refreshedWarehouses.find(w => w.id === selectedWarehouse.id);
    if (currentWh) {
      setSelectedWarehouse(currentWh);
    }
  };

  const handleDeleteWarehouse = async () => {
    if (!selectedWarehouse) return;

    await deleteWarehouse(selectedWarehouse.id);

    const updated = await getWarehouses();
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
