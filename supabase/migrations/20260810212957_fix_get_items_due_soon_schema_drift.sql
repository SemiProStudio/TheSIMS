-- =============================================================================
-- Fix get_items_due_soon: schema drift
-- The function referenced inventory.checked_out_to, which no longer exists —
-- the table now has checked_out_to_user_id (uuid) and checked_out_to_name.
-- Every invocation failed with "column i.checked_out_to does not exist", so
-- due-date reminders have never actually run against the current schema.
-- Join primarily on the user id; fall back to name/email matching only for
-- rows that predate the user-id column.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_items_due_soon(days_ahead integer DEFAULT 3)
RETURNS TABLE(
  item_id character varying,
  item_name character varying,
  item_brand character varying,
  due_back date,
  days_until_due integer,
  checked_out_to character varying,
  borrower_email character varying,
  user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    i.id AS item_id,
    i.name AS item_name,
    i.brand AS item_brand,
    i.due_back,
    (i.due_back - CURRENT_DATE)::INTEGER AS days_until_due,
    i.checked_out_to_name AS checked_out_to,
    u.email AS borrower_email,
    u.id AS user_id
  FROM public.inventory i
  LEFT JOIN public.users u
    ON u.id = i.checked_out_to_user_id
    OR (
      i.checked_out_to_user_id IS NULL
      AND (
        LOWER(i.checked_out_to_name) = LOWER(u.name)
        OR LOWER(i.checked_out_to_name) = LOWER(u.email)
      )
    )
  WHERE i.status = 'checked-out'
    AND i.due_back IS NOT NULL
    AND i.due_back <= CURRENT_DATE + days_ahead
    AND i.due_back >= CURRENT_DATE - 7;
END;
$function$;
