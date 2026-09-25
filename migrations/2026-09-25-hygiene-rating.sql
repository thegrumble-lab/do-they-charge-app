-- Food hygiene rating from the FSA feed.
--
-- RUN THIS BEFORE DEPLOYING the commit that adds it. Every restaurant
-- query selects these columns, so a deploy that lands first will 500 on
-- every restaurant, area and search page until the columns exist.
--
-- hygiene_rating is text, not an integer, because the scheme is not
-- numeric everywhere: FHRS (England, Wales, NI) gives "0".."5", FHIS
-- (Scotland) gives "Pass" / "Improvement Required", and either can say
-- "AwaitingInspection" or "Exempt". src/lib/types.ts::hygieneRating()
-- decides what is renderable.
--
-- Values arrive on the next sync-fhrs run; until then every row is null
-- and pages simply show no hygiene rating.

alter table restaurants
  add column if not exists hygiene_rating text,
  add column if not exists hygiene_rating_date date,
  add column if not exists hygiene_scheme text;
