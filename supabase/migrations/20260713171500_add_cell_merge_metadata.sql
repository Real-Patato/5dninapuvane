-- Migration: add_cell_merge_metadata
-- Description: Adds `parent_cell_id` and `is_merged` layout metadata columns to `public.cells`
--              to ensure complete synchronization across all merge/unmerge queries.

ALTER TABLE public.cells
  ADD COLUMN IF NOT EXISTS parent_cell_id text,
  ADD COLUMN IF NOT EXISTS is_merged boolean DEFAULT false;

COMMENT ON COLUMN public.cells.parent_cell_id IS 'Coordinate or ID of the primary/anchor cell covering this sub-cell in a merge shape.';
COMMENT ON COLUMN public.cells.is_merged IS 'Flag indicating whether this cell is either a primary anchor of a merge or a covered sub-cell.';
