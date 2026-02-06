-- =============================================================================
-- SIMS Database Functions (RPC)
-- Run this after schema.sql to add helper functions
-- =============================================================================

-- =============================================================================
-- INCREMENT VIEW COUNT
-- =============================================================================
CREATE OR REPLACE FUNCTION increment_view_count(item_id VARCHAR)
RETURNS void AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE inventory
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- INCREMENT CHECKOUT COUNT
-- =============================================================================
CREATE OR REPLACE FUNCTION increment_checkout_count(item_id VARCHAR)
RETURNS void AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE inventory
  SET checkout_count = COALESCE(checkout_count, 0) + 1
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GET ITEM WITH DETAILS
-- Returns item with all related data (notes, reminders, reservations, maintenance)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_item_with_details(p_item_id VARCHAR)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'item', (SELECT row_to_json(i) FROM inventory i WHERE i.id = p_item_id),
    'notes', COALESCE((
      SELECT json_agg(row_to_json(n) ORDER BY n.created_at DESC)
      FROM item_notes n
      WHERE n.item_id = p_item_id AND n.deleted = false
    ), '[]'::json),
    'reminders', COALESCE((
      SELECT json_agg(row_to_json(r) ORDER BY r.due_date)
      FROM item_reminders r
      WHERE r.item_id = p_item_id
    ), '[]'::json),
    'reservations', COALESCE((
      SELECT json_agg(row_to_json(res) ORDER BY res.start_date)
      FROM reservations res
      WHERE res.item_id = p_item_id
    ), '[]'::json),
    'maintenance', COALESCE((
      SELECT json_agg(row_to_json(m) ORDER BY m.scheduled_date DESC)
      FROM maintenance_records m
      WHERE m.item_id = p_item_id
    ), '[]'::json),
    'checkout_history', COALESCE((
      SELECT json_agg(row_to_json(ch) ORDER BY ch.timestamp DESC)
      FROM checkout_history ch
      WHERE ch.item_id = p_item_id
      LIMIT 50
    ), '[]'::json)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SEARCH INVENTORY
-- Full-text search across inventory items
-- =============================================================================
CREATE OR REPLACE FUNCTION search_inventory(search_query TEXT, max_results INTEGER DEFAULT 50)
RETURNS SETOF inventory AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM inventory
  WHERE 
    name ILIKE '%' || search_query || '%'
    OR brand ILIKE '%' || search_query || '%'
    OR id ILIKE '%' || search_query || '%'
    OR serial_number ILIKE '%' || search_query || '%'
    OR category_name ILIKE '%' || search_query || '%'
  ORDER BY
    CASE WHEN id ILIKE search_query || '%' THEN 0
         WHEN name ILIKE search_query || '%' THEN 1
         ELSE 2
    END,
    name
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GET DASHBOARD STATISTICS
-- Returns comprehensive stats for dashboard
-- =============================================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_items', (SELECT COUNT(*) FROM inventory),
    'available', (SELECT COUNT(*) FROM inventory WHERE status = 'available'),
    'checked_out', (SELECT COUNT(*) FROM inventory WHERE status = 'checked-out'),
    'reserved', (SELECT COUNT(*) FROM inventory WHERE status = 'reserved'),
    'needs_attention', (SELECT COUNT(*) FROM inventory WHERE status = 'needs-attention'),
    'overdue', (SELECT COUNT(*) FROM inventory WHERE status = 'checked-out' AND due_back < CURRENT_DATE),
    'total_value', (SELECT COALESCE(SUM(current_value), 0) FROM inventory),
    'upcoming_reservations', (
      SELECT COUNT(*) FROM reservations 
      WHERE start_date <= CURRENT_DATE + 7 
      AND end_date >= CURRENT_DATE 
      AND status = 'confirmed'
    ),
    'due_reminders', (
      SELECT COUNT(*) FROM item_reminders 
      WHERE due_date <= CURRENT_DATE AND NOT completed
    ),
    'pending_maintenance', (
      SELECT COUNT(*) FROM maintenance_records 
      WHERE status IN ('scheduled', 'in-progress')
    ),
    'items_by_category', (
      SELECT json_object_agg(category_name, cnt)
      FROM (
        SELECT category_name, COUNT(*) as cnt
        FROM inventory
        GROUP BY category_name
      ) cats
    ),
    'items_by_status', (
      SELECT json_object_agg(status, cnt)
      FROM (
        SELECT status, COUNT(*) as cnt
        FROM inventory
        GROUP BY status
      ) stats
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GET CLIENT RENTAL SUMMARY
-- Returns rental history summary for a client
-- =============================================================================
CREATE OR REPLACE FUNCTION get_client_rental_summary(p_client_id VARCHAR)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_reservations', (
      SELECT COUNT(*) FROM reservations WHERE client_id = p_client_id
    ),
    'active_reservations', (
      SELECT COUNT(*) FROM reservations 
      WHERE client_id = p_client_id 
      AND end_date >= CURRENT_DATE 
      AND status = 'confirmed'
    ),
    'completed_reservations', (
      SELECT COUNT(*) FROM reservations 
      WHERE client_id = p_client_id 
      AND end_date < CURRENT_DATE
    ),
    'total_checkouts', (
      SELECT COUNT(*) FROM checkout_history WHERE client_id = p_client_id
    ),
    'last_rental_date', (
      SELECT MAX(end_date) FROM reservations WHERE client_id = p_client_id
    ),
    'most_rented_categories', (
      SELECT json_agg(json_build_object('category', category_name, 'count', cnt))
      FROM (
        SELECT i.category_name, COUNT(*) as cnt
        FROM reservations r
        JOIN inventory i ON r.item_id = i.id
        WHERE r.client_id = p_client_id
        GROUP BY i.category_name
        ORDER BY cnt DESC
        LIMIT 5
      ) cats
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- CHECK ITEM AVAILABILITY
-- Checks if an item is available for a given date range
-- =============================================================================
CREATE OR REPLACE FUNCTION check_item_availability(
  p_item_id VARCHAR,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_reservation_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  item_status VARCHAR;
  conflicting_count INTEGER;
BEGIN
  -- Get current item status
  SELECT status INTO item_status FROM inventory WHERE id = p_item_id;
  
  -- If item is needs-attention or missing, it's not available
  IF item_status IN ('needs-attention', 'missing') THEN
    RETURN FALSE;
  END IF;
  
  -- Check for conflicting reservations
  SELECT COUNT(*) INTO conflicting_count
  FROM reservations
  WHERE item_id = p_item_id
    AND status = 'confirmed'
    AND start_date <= p_end_date
    AND end_date >= p_start_date
    AND (p_exclude_reservation_id IS NULL OR id != p_exclude_reservation_id);
  
  RETURN conflicting_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GET AVAILABLE ITEMS FOR DATE RANGE
-- Returns items available for a given date range, optionally filtered by category
-- =============================================================================
CREATE OR REPLACE FUNCTION get_available_items(
  p_start_date DATE,
  p_end_date DATE,
  p_category VARCHAR DEFAULT NULL
)
RETURNS SETOF inventory AS $$
BEGIN
  RETURN QUERY
  SELECT i.*
  FROM inventory i
  WHERE i.status NOT IN ('needs-attention', 'missing')
    AND (p_category IS NULL OR i.category_name = p_category)
    AND NOT EXISTS (
      SELECT 1 FROM reservations r
      WHERE r.item_id = i.id
        AND r.status = 'confirmed'
        AND r.start_date <= p_end_date
        AND r.end_date >= p_start_date
    )
  ORDER BY i.category_name, i.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GRANT EXECUTE PERMISSIONS
-- =============================================================================
GRANT EXECUTE ON FUNCTION increment_view_count(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_checkout_count(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_item_with_details(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION search_inventory(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_rental_summary(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION check_item_availability(VARCHAR, DATE, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_items(DATE, DATE, VARCHAR) TO authenticated;
