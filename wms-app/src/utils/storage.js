import { supabase } from './supabaseClient';

// 1. Fetch User Warehouses + Nest Cells & Products
export async function getWarehouses() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('warehouses')
    .select(`
      id, name, rows, columns, user_id,
      cells (
        coordinate, category,
        products ( id, name, quantity )
      )
    `)
    .eq('user_id', user.id);

  if (error) {
    console.error("Error loading warehouses:", error);
    return [];
  }

  // Transform Postgres relations back to the specific React state format
  return data.map(wh => {
    const cellsObj = {};
    wh.cells.forEach(cell => {
      cellsObj[cell.coordinate] = {
        coordinate: cell.coordinate,
        category: cell.category,
        products: cell.products || []
      };
    });
    return {
      id: wh.id,
      userId: wh.user_id,
      name: wh.name,
      rows: wh.rows,
      columns: wh.columns,
      cells: cellsObj
    };
  });
}

// 2. Add Warehouse
export async function addWarehouse(wh) {
  const { error } = await supabase
    .from('warehouses')
    .insert([{ id: wh.id, user_id: wh.userId, name: wh.name, rows: wh.rows, columns: wh.columns }]);
  if (error) throw error;
}

// 3. Delete Warehouse
export async function deleteWarehouse(id) {
  const { error } = await supabase.from('warehouses').delete().eq('id', id);
  if (error) throw error;
}

// 4. Save and Update Cells + Products Inside
export async function updateCellProducts(warehouseId, coordinate, cellInfo) {
  // Upsert the cell row configuration
  const { data: cellData, error: cellError } = await supabase
    .from('cells')
    .upsert({ warehouse_id: warehouseId, coordinate, category: cellInfo.category }, { onConflict: 'warehouse_id,coordinate' })
    .select()
    .single();

  if (cellError) throw cellError;

  // Clear previous items in this specific grid location
  await supabase.from('products').delete().eq('cell_id', cellData.id);

  // Bulk insert new product snapshots if any exist
  if (cellInfo.products && cellInfo.products.length > 0) {
    const productsToInsert = cellInfo.products.map(p => ({
      id: p.id || `prod-${Date.now()}-${Math.random()}`,
      cell_id: cellData.id,
      name: p.name,
      quantity: p.quantity || 1
    }));
    await supabase.from('products').insert(productsToInsert);
  }
}

// Fallback stubs for components referencing them (Can be wired up later to Supabase)
export function initializeStorage() { }
export function getCurrentUser() { return JSON.parse(localStorage.getItem('wms_user')); }
export function setCurrentUser(user) { localStorage.setItem('wms_user', JSON.stringify(user)); }
export function getCustomFields() { return []; }
export function saveCustomFields() { }