alter table trips add column itinerary jsonb not null default '[]'::jsonb;
alter table trips add column lodging jsonb not null default '[]'::jsonb;
