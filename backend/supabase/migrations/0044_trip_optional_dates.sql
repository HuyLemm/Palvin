-- Trips can now be created with only a rough day count when exact dates
-- aren't known yet, so start/end date are no longer required. `spent` is
-- dropped — cost is now derived from each itinerary place's price range
-- instead of a manually-tracked running total.
alter table trips alter column start_date drop not null;
alter table trips alter column end_date drop not null;
alter table trips drop column spent;
