-- FSA business type for each listing (1 = Restaurant/Cafe/Canteen,
-- 7843 = Pub/bar/nightclub), so figures can be split into pubs and
-- restaurants without re-querying the FSA.
--
-- Additive and nullable: nothing on the site selects it yet, so it is safe
-- to run before or after deploying. Values arrive on the next sync-fhrs run.

alter table restaurants
  add column if not exists business_type_id integer;

create index if not exists idx_restaurants_business_type on restaurants (business_type_id);
