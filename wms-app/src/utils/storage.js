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

// Dynamic Excel-style row labeling (A, B... Z, AA, AB...) and inverse
export const getRowLabel = (indexOrLabel) => {
  if (typeof indexOrLabel === 'string' && isNaN(Number(indexOrLabel))) {
    return indexOrLabel;
  }
  let temp = Number(indexOrLabel) || 0;
  let label = '';
  while (temp >= 0) {
    label = String.fromCharCode((temp % 26) + 65) + label;
    temp = Math.floor(temp / 26) - 1;
  }
  return label || 'A';
};

export const getRowIndex = (labelOrIndex) => {
  if (typeof labelOrIndex === 'number' || (!isNaN(Number(labelOrIndex)) && labelOrIndex !== '')) {
    return Number(labelOrIndex);
  }
  const label = String(labelOrIndex || 'A').toUpperCase();
  let index = 0;
  for (let i = 0; i < label.length; i++) {
    index = index * 26 + (label.charCodeAt(i) - 64);
  }
  return index - 1;
};

export async function getWarehouses() {
  // Check if there is an active Supabase user session
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  const localList = JSON.parse(localStorage.getItem('wms_warehouses') || '[]');
  const localDetails = JSON.parse(localStorage.getItem('wms_cells_details') || '{}');

  // Fallback to localStorage if not authenticated or offline
  if (authError || !user) {
    return localList;
  }

  // Fetch from modular Supabase tables: warehouses -> layouts -> cells
  const { data: warehousesData, error } = await supabase
    .from('warehouses')
    .select(`
      id, name, location, user_id,
      layouts (
        id, name, total_rows, total_columns,
        cells (
          id, row_index, column_index, shelf_level, status, max_weight_capacity,
          category, products, row_span, col_span, merged_coords, covered_by, parent_cell_id, is_merged,
          is_irregular, is_obstacle, is_path, is_refrigerated, obstacle_type,
          max_pallets, min_threshold, custom_fields_values
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
        const rowLabel = getRowLabel(cell.row_index);
        const coord = `${rowLabel}-${cell.column_index}`;
        const cached = localDetails[`${wh.id}_${coord}`] || {};
        cellsObj[coord] = {
          id: cell.id,
          coordinate: coord,
          status: cell.status || 'empty',
          max_weight_capacity: cell.max_weight_capacity,
          category: cell.category || cached.category || '',
          products: cell.products || cached.products || [],
          rowSpan: cell.row_span || 1,
          colSpan: cell.col_span || 1,
          mergedCoords: cell.merged_coords || null,
          coveredBy: cell.covered_by || cell.parent_cell_id || null,
          parentCellId: cell.parent_cell_id || cell.covered_by || null,
          isMerged: cell.is_merged || (cell.row_span > 1 || cell.col_span > 1 || (cell.merged_coords && cell.merged_coords.length > 1) || !!cell.covered_by || !!cell.parent_cell_id),
          isIrregular: !!cell.is_irregular,
          isObstacle: !!cell.is_obstacle,
          isPath: !!cell.is_path,
          isRefrigerated: !!cell.is_refrigerated,
          obstacleType: cell.obstacle_type || 'pillar',
          maxPallets: cell.max_pallets !== null && cell.max_pallets !== undefined ? cell.max_pallets : 8,
          minThreshold: cell.min_threshold !== null && cell.min_threshold !== undefined ? cell.min_threshold : '',
          customFieldsValues: cell.custom_fields_values || cached.customFieldsValues || {},
          ...cached
        };
      });
    }

    // Include local detail cache items for this warehouse if not already added
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

    // Guarantee merged cells consistency across all loaded coordinates
    Object.values(cellsObj).forEach(c => {
      const rSpan = c.rowSpan || 1;
      const cSpan = c.colSpan || 1;
      let mCoords = Array.isArray(c.mergedCoords) && c.mergedCoords.length > 0 ? c.mergedCoords : null;

      if ((rSpan > 1 || cSpan > 1) && !mCoords) {
        const [rStr, cStr] = (c.coordinate || '').split('-');
        const rIndex = getRowIndex(rStr);
        const cIndex = parseInt(cStr, 10) || 1;
        mCoords = [];
        for (let dr = 0; dr < rSpan; dr++) {
          for (let dc = 0; dc < cSpan; dc++) {
            mCoords.push(`${getRowLabel(rIndex + dr)}-${cIndex + dc}`);
          }
        }
        c.mergedCoords = mCoords;
      }

      if (Array.isArray(mCoords) && mCoords.length > 1) {
        c.isMerged = true;
        mCoords.forEach(subCoord => {
          if (subCoord !== c.coordinate) {
            if (!cellsObj[subCoord]) {
              cellsObj[subCoord] = {
                coordinate: subCoord,
                status: 'empty',
                max_weight_capacity: 4000
              };
            }
            cellsObj[subCoord].coveredBy = c.coordinate;
            cellsObj[subCoord].parentCellId = c.coordinate;
            cellsObj[subCoord].isMerged = true;
          }
        });
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

  // 3. Save initial cells if present
  if (wh.layoutId && wh.cells && typeof wh.cells === 'object') {
    const cellsArray = Object.values(wh.cells).map(cell => {
      const [rStr, cStr] = (cell.coordinate || '').split('-');
      const rowIndex = getRowIndex(rStr);
      const colIndex = parseInt(cStr, 10) || 1;
      const status = cell.isRemoved ? 'reserved' : ((cell.products && cell.products.length > 0) ? 'occupied' : 'empty');
      const maxCap = cell.maxWeight || (cell.maxPallets !== undefined ? cell.maxPallets * 500 : 4000);

      return {
        layout_id: wh.layoutId,
        row_index: rowIndex,
        column_index: colIndex,
        shelf_level: 0,
        status: status,
        max_weight_capacity: maxCap,
        category: cell.category || '',
        products: cell.products || [],
        row_span: cell.rowSpan || 1,
        col_span: cell.colSpan || 1,
        merged_coords: cell.mergedCoords || null,
        covered_by: cell.coveredBy || cell.parentCellId || null,
        parent_cell_id: cell.parentCellId || cell.coveredBy || null,
        is_merged: !!(cell.isMerged || (cell.rowSpan > 1 || cell.colSpan > 1 || (cell.mergedCoords && cell.mergedCoords.length > 1) || cell.coveredBy || cell.parentCellId)),
        is_irregular: !!cell.isIrregular,
        is_obstacle: !!cell.isObstacle,
        is_path: !!cell.isPath,
        is_refrigerated: !!cell.isRefrigerated,
        obstacle_type: cell.obstacleType || 'pillar',
        max_pallets: cell.maxPallets !== undefined ? cell.maxPallets : 8,
        min_threshold: cell.minThreshold !== undefined && cell.minThreshold !== '' ? cell.minThreshold : null,
        custom_fields_values: cell.customFieldsValues || {}
      };
    }).filter(c => c.layout_id && !isNaN(c.row_index) && !isNaN(c.column_index));

    if (cellsArray.length > 0) {
      await supabase.from('cells').upsert(cellsArray, { onConflict: 'layout_id,row_index,column_index,shelf_level' });
    }
  }

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
        .update({ name: wh.name, location: wh.location || 'Main Warehouse Facility' })
        .eq('id', wh.id)
        .eq('user_id', user.id);

      let layoutId = wh.layoutId;
      if (!layoutId) {
        const { data: lData } = await supabase
          .from('layouts')
          .select('id')
          .eq('warehouse_id', wh.id)
          .limit(1)
          .maybeSingle();
        layoutId = lData?.id;
        wh.layoutId = layoutId;
      }

      if (layoutId) {
        await supabase
          .from('layouts')
          .update({
            total_rows: Number(wh.rows) || 6,
            total_columns: Number(wh.columns) || 8
          })
          .eq('id', layoutId);

        if (wh.cells && typeof wh.cells === 'object') {
          const cellsArray = Object.values(wh.cells).map(cell => {
            const [rStr, cStr] = (cell.coordinate || '').split('-');
            const rowIndex = getRowIndex(rStr);
            const colIndex = parseInt(cStr, 10) || 1;
            const status = cell.isRemoved ? 'reserved' : ((cell.products && cell.products.length > 0) ? 'occupied' : 'empty');
            const maxCap = cell.maxWeight || (cell.maxPallets !== undefined ? cell.maxPallets * 500 : 4000);

            return {
              layout_id: layoutId,
              row_index: rowIndex,
              column_index: colIndex,
              shelf_level: 0,
              status: status,
              max_weight_capacity: maxCap,
              category: cell.category || '',
              products: cell.products || [],
              row_span: cell.rowSpan || 1,
              col_span: cell.colSpan || 1,
              merged_coords: cell.mergedCoords || null,
              covered_by: cell.coveredBy || cell.parentCellId || null,
              parent_cell_id: cell.parentCellId || cell.coveredBy || null,
              is_merged: !!(cell.isMerged || (cell.rowSpan > 1 || cell.colSpan > 1 || (cell.mergedCoords && cell.mergedCoords.length > 1) || cell.coveredBy || cell.parentCellId)),
              is_irregular: !!cell.isIrregular,
              is_obstacle: !!cell.isObstacle,
              is_path: !!cell.isPath,
              is_refrigerated: !!cell.isRefrigerated,
              obstacle_type: cell.obstacleType || 'pillar',
              max_pallets: cell.maxPallets !== undefined ? cell.maxPallets : 8,
              min_threshold: cell.minThreshold !== undefined && cell.minThreshold !== '' ? cell.minThreshold : null,
              custom_fields_values: cell.customFieldsValues || {}
            };
          }).filter(c => c.layout_id && !isNaN(c.row_index) && !isNaN(c.column_index));

          if (cellsArray.length > 0) {
            const { error: cellsErr } = await supabase
              .from('cells')
              .upsert(cellsArray, { onConflict: 'layout_id,row_index,column_index,shelf_level' });
            if (cellsErr) {
              console.error("Supabase bulk cells upsert error:", cellsErr);
            }
          }
        }
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
    if (!layoutId && whIdx !== -1) {
      layoutId = localList[whIdx].layoutId;
    }
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
      const rowIndex = getRowIndex(rStr);
      const colIndex = parseInt(cStr, 10) || 1;
      const status = cellInfo.isRemoved ? 'reserved' : ((cellInfo.products && cellInfo.products.length > 0) ? 'occupied' : 'empty');
      const maxCap = cellInfo.maxWeight || (cellInfo.maxPallets ? cellInfo.maxPallets * 500 : 4000);

      const { error: cellError } = await supabase
        .from('cells')
        .upsert({
          layout_id: layoutId,
          row_index: rowIndex,
          column_index: colIndex,
          shelf_level: 0,
          status: status,
          max_weight_capacity: maxCap,
          category: cellInfo.category || '',
          products: cellInfo.products || [],
          row_span: cellInfo.rowSpan || 1,
          col_span: cellInfo.colSpan || 1,
          merged_coords: cellInfo.mergedCoords || null,
          covered_by: cellInfo.coveredBy || cellInfo.parentCellId || null,
          parent_cell_id: cellInfo.parentCellId || cellInfo.coveredBy || null,
          is_merged: !!(cellInfo.isMerged || (cellInfo.rowSpan > 1 || cellInfo.colSpan > 1 || (cellInfo.mergedCoords && cellInfo.mergedCoords.length > 1) || cellInfo.coveredBy || cellInfo.parentCellId)),
          is_irregular: !!cellInfo.isIrregular,
          is_obstacle: !!cellInfo.isObstacle,
          is_path: !!cellInfo.isPath,
          is_refrigerated: !!cellInfo.isRefrigerated,
          obstacle_type: cellInfo.obstacleType || 'pillar',
          max_pallets: cellInfo.maxPallets !== undefined ? cellInfo.maxPallets : 8,
          min_threshold: cellInfo.minThreshold !== undefined && cellInfo.minThreshold !== '' ? cellInfo.minThreshold : null,
          custom_fields_values: cellInfo.customFieldsValues || {}
        }, { onConflict: 'layout_id,row_index,column_index,shelf_level' });

      if (cellError) {
        console.error("Supabase cell upsert error:", cellError);
      }
    }
  }
}