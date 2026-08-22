-- ============================================================================
-- Reconcile 'reserved' ↔ 'available' against today's reservations.
--
-- An item is flipped to 'reserved' when a reservation starts, but nothing
-- fired when the reservation ENDED, so the stored status outlived it (prod
-- 2026-08-21: 7 items 'reserved' with no reservation covering today). The
-- app now reconciles whenever it merges reservations; this function is the
-- server-side safety net the daily job runs so the database is right even
-- when no one opens the app. Only moves between the two statuses — items
-- that are checked out / missing / needing attention own their transitions.
-- A 'reserved' item is by definition not checked out, so stale borrower
-- fields are cleared when it returns to 'available'.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reconcile_reservation_statuses()
RETURNS TABLE(item_id varchar, from_status varchar, to_status varchar)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH active AS (
    SELECT DISTINCT r.item_id
    FROM public.reservations r
    WHERE r.status NOT IN ('cancelled', 'completed')
      AND r.start_date <= CURRENT_DATE
      AND r.end_date >= CURRENT_DATE
  ),
  to_available AS (
    UPDATE public.inventory i
    SET status = 'available',
        checked_out_to_user_id = NULL,
        checked_out_to_name = NULL,
        checkout_client_id = NULL,
        checked_out_date = NULL,
        due_back = NULL,
        checkout_project = NULL,
        updated_at = NOW()
    WHERE i.status = 'reserved'
      AND NOT EXISTS (SELECT 1 FROM active a WHERE a.item_id = i.id)
    RETURNING i.id, 'reserved'::varchar AS from_status, 'available'::varchar AS to_status
  ),
  to_reserved AS (
    UPDATE public.inventory i
    SET status = 'reserved', updated_at = NOW()
    WHERE i.status = 'available'
      AND EXISTS (SELECT 1 FROM active a WHERE a.item_id = i.id)
    RETURNING i.id, 'available'::varchar AS from_status, 'reserved'::varchar AS to_status
  )
  SELECT * FROM to_available
  UNION ALL
  SELECT * FROM to_reserved;
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_reservation_statuses() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_reservation_statuses() TO service_role;

-- One-off: bring the current data in line immediately
SELECT * FROM public.reconcile_reservation_statuses();
