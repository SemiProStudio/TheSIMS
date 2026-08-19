-- Link a pack list to the reservation it was created from (W2: reservation →
-- pack list conversion). Holds the reservation group_id when the group has
-- one, else the reservation row id. No FK: groups are not rows, and a
-- cancelled/deleted reservation must not break its pack list.
ALTER TABLE public.pack_lists
  ADD COLUMN IF NOT EXISTS reservation_group_id uuid;
