import { supabase } from './supabaseClient';

// ==========================================
// 1. Storage & Session Helpers
// ==========================================

export function initializeStorage() {
  if (!localStorage.getItem('wms_warehouses')) {
    localStorage.setItem('wms_warehouses', JSON.stringify([]));
  }
  if (!localStorage.getItem('wms_users')) {
    localStorage.setItem('wms_users', JSON.stringify([]));
  }
  if (!localStorage.getItem('wms_cells_details')) {
    localStorage.setItem('wms_cells_details', JSON.stringify({}));
  }
}

export function getCurrentUser() {
  const stored = localStorage.getItem('wms_user');
  return stored ? JSON.parse(stored) : null;
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('wms_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('wms_user');
  }
}

export function getUsers() {
  return JSON.parse(localStorage.getItem('wms_users') || '[]');
}

export function saveUser(user) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id || (user.email && u.email === user.email));
  if (idx !== -1) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem('wms_users', JSON.stringify(users));
}

export function getCustomFields() {
  return JSON.parse(localStorage.getItem('wms_custom_fields') || '[]');
}

export function saveCustomFields(fields) {
  localStorage.setItem('wms_custom_fields', JSON.stringify(fields));
}

// ==========================================
// 2. Warehouses & Modular Layouts
// ==========================================

export async function getWarehouses() {
  // Check if there is an active Supabase user session
  const { data: { user } } = await supabase.auth.getUser();
  const localList = JSON.parse(localStorage.getItem('wms_warehouses') || '[]');
  const localDetails = JSON.parse(localStorage.getItem('wms_cells_details') || '{}');

  if (!user) {
    return localList;
  }

  // Fetch from live modular Supabase backend: warehouses -> layouts -> cells
  const { data: warehousesData, error } = await supabase
    .from('warehouses')
    .select(`
      id, name, location, user_id,
      layouts (
        id, name, total_rows, total_columns,
        cells (
          id, row_index, column_index, shelf_level, status, max_weight_capacity
        )
      )
    `)
    .eq('user_id', user.id);

  if (error || !warehousesData) {
    console.warn("Could not load warehouses from Supabase or table empty:", error);
    return localList;
  }

  if (warehousesData.length === 0) {
    return localList;
  }

  // Transform modular Supabase relations to React frontend state format
  return warehousesData.map(wh => {
    const layout = (wh.layouts && wh.layouts.length > 0) ? wh.layouts[0] : null;
    const rows = layout?.total_rows || 6;
    const columns = layout?.total_columns || 8;
    const layoutId = layout?.id || null;

    const cellsObj = {};
    if (layout && layout.cells) {
      layout.cells.forEach(cell => {
        const coord = `${cell.row_index}-${cell.column_index}`;
        const cached = localDetails[`${wh.id}_${coord}`] || {};
        cellsObj[coord] = {
          id: cell.id,
          coordinate: coord,
          status: cell.status || 'empty',
          max_weight_capacity: cell.max_weight_capacity,
          category: cached.category || '',
          products: cached.products || [],
          ...cached
        };
      });
    }

    // Include local detail cache items for this warehouse
    Object.keys(localDetails).forEach(key => {
      if (key.startsWith(`${wh.id}_`)) {
        const coord = key.replace(`${wh.id}_`, '');
        if (!cellsObj[coord]) {
          cellsObj[coord] = {
            coordinate: coord,
            ...localDetails[key]
          };
        }
      }
    });

    return {
      id: wh.id,
      layoutId,
      userId: wh.user_id,
      name: wh.name,
      location: wh.location || 'Main Warehouse Facility',
      rows,
      columns,
      cells: cellsObj
    };
  });
}

export async function addWarehouse(wh) {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || (wh.userId && wh.userId.includes('-') && wh.userId.length === 36 ? wh.userId : null);

  if (!userId) {
    const localList = JSON.parse(localStorage.getItem('wms_warehouses') || '[]');
    localList.push(wh);
    localStorage.setItem('wms_warehouses', JSON.stringify(localList));
    return wh;
  }

  // 1. Insert into warehouses table (let Postgres assign UUID)
  const { data: whData, error: whError } = await supabase
    .from('warehouses')
    .insert([{
      user_id: userId,
      name: wh.name,
      location: wh.location || 'Main Warehouse Facility'
    }])
    .select()
    .single();

  if (whError || !whData) {
    console.error("Supabase warehouse insert error:", whError);
    const localList = JSON.parse(localStorage.getItem('wms_warehouses') || '[]');
    localList.push(wh);
    localStorage.setItem('wms_warehouses', JSON.stringify(localList));
    return wh;
  }

  // 2. Insert into layouts table (with total_rows and total_columns)
  const { data: layoutData, error: layoutError } = await supabase
    .from('layouts')
    .insert([{
      warehouse_id: whData.id,
      name: 'Main Layout',
      total_rows: Number(wh.rows) || 6,
      total_columns: Number(wh.columns) || 8
    }])
    .select()
    .single();

  if (layoutError) {
    console.error("Supabase layout insert error:", layoutError);
  }

  wh.id = whData.id;
  wh.layoutId = layoutData?.id || null;

  const localList = JSON.parse(localStorage.getItem('wms_warehouses') || '[]');
  localList.push(wh);
  localStorage.setItem('wms_warehouses', JSON.stringify(localList));

  return wh;
}

export async function saveWarehouses(warehouses) {
  if (!Array.isArray(warehouses)) return;
  localStorage.setItem('wms_warehouses', JSON.stringify(warehouses));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  for (const wh of warehouses) {
    if (wh.id && typeof wh.id === 'string' && wh.id.length === 36 && !wh.id.startsWith('wh-')) {
      await supabase
        .from('warehouses')
        .update({ name: wh.name })
        .eq('id', wh.id)
        .eq('user_id', user.id);

      if (wh.layoutId) {
        await supabase
          .from('layouts')
          .update({
            total_rows: Number(wh.rows) || 6,
            total_columns: Number(wh.columns) || 8
          })
          .eq('id', wh.layoutId);
      }
    }
  }
}

export async function deleteWarehouse(id) {
  if (id && typeof id === 'string' && id.length === 36 && !id.startsWith('wh-')) {
    const { error } = await supabase.from('warehouses').delete().eq('id', id);
    if (error) console.error("Error deleting warehouse from Supabase:", error);
  }
  const localList = JSON.parse(localStorage.getItem('wms_warehouses') || '[]');
  const updated = localList.filter(w => w.id !== id);
  localStorage.setItem('wms_warehouses', JSON.stringify(updated));
}

// ==========================================
// 3. Cells Configuration
// ==========================================

export async function updateCellProducts(warehouseId, coordinate, cellInfo) {
  // Update local details cache first for immediate UI responsiveness and full custom properties preservation
  const localDetails = JSON.parse(localStorage.getItem('wms_cells_details') || '{}');
  localDetails[`${warehouseId}_${coordinate}`] = {
    coordinate,
    ...cellInfo
  };
  localStorage.setItem('wms_cells_details', JSON.stringify(localDetails));

  const localList = JSON.parse(localStorage.getItem('wms_warehouses') || '[]');
  const whIdx = localList.findIndex(w => w.id === warehouseId);
  if (whIdx !== -1) {
    if (!localList[whIdx].cells) localList[whIdx].cells = {};
    localList[whIdx].cells[coordinate] = { coordinate, ...cellInfo };
    localStorage.setItem('wms_warehouses', JSON.stringify(localList));
  }

  // If warehouse is stored in Supabase, sync coordinates and capacity to public.cells table
  if (warehouseId && typeof warehouseId === 'string' && warehouseId.length === 36 && !warehouseId.startsWith('wh-')) {
    let layoutId = cellInfo.layoutId;
    if (!layoutId) {
      const { data: layoutData } = await supabase
        .from('layouts')
        .select('id')
        .eq('warehouse_id', warehouseId)
        .limit(1)
        .maybeSingle();
      layoutId = layoutData?.id;
    }

    if (layoutId) {
      const [rStr, cStr] = coordinate.split('-');
      const rowIndex = parseInt(rStr, 10) || 0;
      const colIndex = parseInt(cStr, 10) || 0;
      const status = (cellInfo.products && cellInfo.products.length > 0) ? 'occupied' : 'empty';
      const maxCap = cellInfo.maxWeight || (cellInfo.maxPallets ? cellInfo.maxPallets * 500 : null);

      const { error: cellError } = await supabase
        .from('cells')
        .upsert({
          layout_id: layoutId,
          row_index: rowIndex,
          column_index: colIndex,
          shelf_level: 0,
          status: status,
          max_weight_capacity: maxCap
        }, { onConflict: 'layout_id,row_index,column_index,shelf_level' });

      if (cellError) {
        console.error("Supabase cell upsert error:", cellError);
      }
    }
  }
}