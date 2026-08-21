-- ============================================================================
-- Low-stock reminders are a per-item opt-in (user decision 2026-08-21).
--
-- Before: every item in a quantity-tracked category counted as "low" whenever
-- its quantity fell to the CATEGORY's low_stock_threshold — which in practice
-- flagged entire categories (quantity 1 vs threshold 2). Now an item is low
-- only when its own `low_stock_alert` flag is on AND its quantity is at or
-- below its own reorder_point. The flag defaults to OFF for every item; the
-- category threshold is gone.
-- ============================================================================

ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS low_stock_alert BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.inventory.low_stock_alert IS
  'Per-item opt-in for low-stock reminders (dashboard panel, search filter, admin digest). Only meaningful in quantity-tracked categories; threshold is reorder_point.';

ALTER TABLE public.categories DROP COLUMN IF EXISTS low_stock_threshold;

-- Admin low-stock digest source (daily job): opted-in items at or below
-- their own reorder point, in categories that track quantity
CREATE OR REPLACE FUNCTION public.get_low_stock_items()
RETURNS TABLE(item_id varchar, item_name varchar, category_name varchar,
              quantity integer, threshold integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT i.id, i.name, i.category_name, i.quantity, i.reorder_point::integer
  FROM public.inventory i
  JOIN public.categories c ON c.name = i.category_name AND c.track_quantity = TRUE
  WHERE i.low_stock_alert = TRUE
    AND i.quantity IS NOT NULL
    AND COALESCE(i.reorder_point, 0) > 0
    AND i.quantity <= i.reorder_point
  ORDER BY i.category_name, i.name;
$$;
REVOKE ALL ON FUNCTION public.get_low_stock_items() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_low_stock_items() TO service_role;
