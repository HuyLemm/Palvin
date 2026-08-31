-- Whose dream a goal is — null means shared ('both'), matching the same
-- nullable-recipient pattern used by capsules.to_profile_id.
alter table goals add column owner_profile_id uuid references profiles(id) on delete set null;
