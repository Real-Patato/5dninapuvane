-- ==============================================================================
-- WAREHOUSE MANAGEMENT SYSTEM - MODULAR BACKEND SCHEMA MIGRATION
-- ==============================================================================
-- Migration: init_warehouse_schema
-- Description: Creates profiles, warehouses, layouts, and cells tables with
--              Foreign Keys, Indexes, Triggers, and Row Level Security (RLS).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. UTILITY FUNCTIONS & CONFIGURATION
-- ------------------------------------------------------------------------------

-- Function to automatically update `updated_at` timestamps on row updates
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. TABLE CREATION
-- ------------------------------------------------------------------------------

-- A. Profiles Table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'User profile information tied to Supabase auth.users.';

-- B. Warehouses Table
CREATE TABLE IF NOT EXISTS public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.warehouses IS 'Warehouses owned by users.';

-- C. Layouts Table
CREATE TABLE IF NOT EXISTS public.layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  name text NOT NULL,
  total_rows integer NOT NULL CHECK (total_rows > 0),
  total_columns integer NOT NULL CHECK (total_columns > 0),
  created_at timestamptz NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.layouts IS 'Layout definitions and grid dimensions for specific warehouses.';

-- D. Cells Table (Storage Locations)
CREATE TABLE IF NOT EXISTS public.cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id uuid NOT NULL REFERENCES public.layouts(id) ON DELETE CASCADE,
  row_index integer NOT NULL CHECK (row_index >= 0),
  column_index integer NOT NULL CHECK (column_index >= 0),
  shelf_level integer NOT NULL CHECK (shelf_level >= 0),
  status text NOT NULL DEFAULT 'empty' CHECK (status IN ('empty', 'occupied', 'reserved', 'maintenance')),
  max_weight_capacity numeric CHECK (max_weight_capacity >= 0),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_cell_location UNIQUE (layout_id, row_index, column_index, shelf_level)
);

COMMENT ON TABLE public.cells IS 'Individual storage cells within a warehouse layout grid.';

-- ------------------------------------------------------------------------------
-- 3. PERFORMANCE OPTIMIZATION: FOREIGN KEY INDEXING
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS warehouses_user_id_idx ON public.warehouses(user_id);
CREATE INDEX IF NOT EXISTS layouts_warehouse_id_idx ON public.layouts(warehouse_id);
CREATE INDEX IF NOT EXISTS cells_layout_id_idx ON public.cells(layout_id);

-- ------------------------------------------------------------------------------
-- 4. TRIGGERS & AUTOMATION
-- ------------------------------------------------------------------------------

-- Trigger to automatically update updated_at on profiles
DROP TRIGGER IF EXISTS on_profiles_updated_at ON public.profiles;
CREATE TRIGGER on_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Security Definer Function: Automatically create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- Critical security hardening against search_path injection
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, updated_at)
  VALUES (NEW.id, 'user', NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger on auth.users for profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- A. Profiles Policies
-- ==========================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ==========================================
-- B. Warehouses Policies
-- ==========================================
DROP POLICY IF EXISTS "Users can view own warehouses" ON public.warehouses;
CREATE POLICY "Users can view own warehouses"
  ON public.warehouses
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own warehouses" ON public.warehouses;
CREATE POLICY "Users can insert own warehouses"
  ON public.warehouses
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own warehouses" ON public.warehouses;
CREATE POLICY "Users can update own warehouses"
  ON public.warehouses
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own warehouses" ON public.warehouses;
CREATE POLICY "Users can delete own warehouses"
  ON public.warehouses
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ==========================================
-- C. Layouts Policies (1-Hop Cascade Check)
-- ==========================================
DROP POLICY IF EXISTS "Users can view layouts of own warehouses" ON public.layouts;
CREATE POLICY "Users can view layouts of own warehouses"
  ON public.layouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.warehouses w
      WHERE w.id = layouts.warehouse_id
        AND w.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert layouts to own warehouses" ON public.layouts;
CREATE POLICY "Users can insert layouts to own warehouses"
  ON public.layouts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.warehouses w
      WHERE w.id = layouts.warehouse_id
        AND w.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update layouts of own warehouses" ON public.layouts;
CREATE POLICY "Users can update layouts of own warehouses"
  ON public.layouts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.warehouses w
      WHERE w.id = layouts.warehouse_id
        AND w.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.warehouses w
      WHERE w.id = layouts.warehouse_id
        AND w.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete layouts of own warehouses" ON public.layouts;
CREATE POLICY "Users can delete layouts of own warehouses"
  ON public.layouts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.warehouses w
      WHERE w.id = layouts.warehouse_id
        AND w.user_id = (SELECT auth.uid())
    )
  );

-- ==========================================
-- D. Cells Policies (2-Hop Cascade Check)
-- ==========================================
DROP POLICY IF EXISTS "Users can view cells of own warehouses" ON public.cells;
CREATE POLICY "Users can view cells of own warehouses"
  ON public.cells
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.layouts l
      JOIN public.warehouses w ON w.id = l.warehouse_id
      WHERE l.id = cells.layout_id
        AND w.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert cells to own warehouses" ON public.cells;
CREATE POLICY "Users can insert cells to own warehouses"
  ON public.cells
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.layouts l
      JOIN public.warehouses w ON w.id = l.warehouse_id
      WHERE l.id = cells.layout_id
        AND w.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update cells of own warehouses" ON public.cells;
CREATE POLICY "Users can update cells of own warehouses"
  ON public.cells
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.layouts l
      JOIN public.warehouses w ON w.id = l.warehouse_id
      WHERE l.id = cells.layout_id
        AND w.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.layouts l
      JOIN public.warehouses w ON w.id = l.warehouse_id
      WHERE l.id = cells.layout_id
        AND w.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete cells of own warehouses" ON public.cells;
CREATE POLICY "Users can delete cells of own warehouses"
  ON public.cells
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.layouts l
      JOIN public.warehouses w ON w.id = l.warehouse_id
      WHERE l.id = cells.layout_id
        AND w.user_id = (SELECT auth.uid())
    )
  );
