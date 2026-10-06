-- Name-change tracking, used as a "this listing may be out of date" signal.
--
-- RUN THIS BEFORE DEPLOYING the commit that adds it. Every restaurant
-- query selects these columns, so a deploy that lands first will 500 on
-- every restaurant, area and search page until the columns exist.
--
-- When the weekly FHRS sync sees an existing FHRS ID arrive under a
-- meaningfully different business name (a rebrand, often new owners), it
-- records the old name and the date. A restaurant page then flags any
-- service-charge report dated before that change as possibly out of date.
-- Both columns stay null until a change is detected.

alter table restaurants
  add column if not exists previous_name text,
  add column if not exists name_changed_at date;
