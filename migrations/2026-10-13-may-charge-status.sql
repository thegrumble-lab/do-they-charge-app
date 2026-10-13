-- New "may-charge" status, and "unclear" becomes internal only.
--
-- "may-charge": the restaurant's own wording mentions a service charge but
-- stops short of confirming it goes on every bill ("may be levied", a
-- Christmas-menu-only note, a site that contradicts itself on scope).
-- "unclear" stays valid in the database so research isn't repeated, but the
-- app no longer shows it anywhere public (see src/lib/types.ts).
--
-- RUN THIS BEFORE DEPLOYING the commit that adds it, so diner submissions
-- and the GBK chain policy can write "may-charge" from the first request.
-- Safe to re-run: every step checks before changing anything.

begin;

-- 1. Check constraints on reports and report_flags: add 'may-charge'
--    wherever 'unclear' is allowed.
do $$
declare c record; def text;
begin
  for c in
    select con.conname, con.conrelid::regclass as tbl, pg_get_constraintdef(con.oid) as def
    from pg_constraint con
    where con.contype = 'c'
      and con.conrelid in ('public.reports'::regclass, 'public.report_flags'::regclass)
      and pg_get_constraintdef(con.oid) like '%''unclear''%'
      and pg_get_constraintdef(con.oid) not like '%''may-charge''%'
  loop
    def := replace(c.def, '''unclear''::text', '''may-charge''::text, ''unclear''::text');
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
    execute format('alter table %s add constraint %I %s', c.tbl, c.conname, def);
    raise notice 'constraint % on %: %', c.conname, c.tbl, def;
  end loop;
end $$;

-- 2. RLS policies on reports whose check lists the statuses.
do $$
declare p record; chk text;
begin
  for p in
    select policyname, with_check from pg_policies
    where schemaname = 'public' and tablename = 'reports'
      and with_check like '%''unclear''%' and with_check not like '%''may-charge''%'
  loop
    chk := replace(p.with_check, '''unclear''::text', '''may-charge''::text, ''unclear''::text');
    execute format('alter policy %I on public.reports with check (%s)', p.policyname, chk);
    raise notice 'policy %: %', p.policyname, chk;
  end loop;
end $$;

-- 3. The two write RPCs: allow 'may-charge' in their status lists. Rewrites
--    the live definition rather than a copy, so nothing else in them changes.
--    create or replace keeps the existing grants.
do $$
declare f record; def text;
begin
  for f in
    select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('insert_researched_report', 'submit_diner_report')
  loop
    def := pg_get_functiondef(f.oid);
    if def like '%''may-charge''%' then continue; end if;
    def := regexp_replace(def, '''unclear''\s*\)', '''may-charge'',''unclear'')');
    if def not like '%''may-charge''%' then
      raise exception 'could not find the status list in %', f.proname;
    end if;
    execute def;
    raise notice 'function % updated', f.proname;
  end loop;
end $$;

-- 4. Reclassify existing "unclear" reports that do cite a policy.
--    GBK: own menu says a 12.5% charge "may be levied".
update reports set status = 'may-charge', pct = 12.5
where status = 'unclear' and id in (
  'b408cd06-9e8a-41fd-926e-d1c6cdc63cf2', 'd38114a1-6e7a-4e89-8bb7-003883aa1a6d',
  '63f4d5a9-2eec-4f8a-b396-ce2bcea5a2aa', '1a7c9f81-714d-49e9-b85f-bcdd514756bc',
  '78c13aba-b1f5-4fc2-ae43-2c40ecb7b9db', 'ece1ba58-4f88-45ed-a188-fa533fd06571',
  'f218e2fa-0077-4693-8b9d-c343d64b5a56', '160eb6cc-e697-4e9d-8ea5-b03f41734f49',
  '5ee8c1ea-bb06-437f-9ce5-0a1c3ac1b249', '8dc257ac-437d-47bd-ba19-a8e6c1a2885f',
  'd526824a-4c99-485c-86e8-8b6108fc3fe9', '15c8421f-89ff-42b4-b907-95ceec00d958',
  '23b998fa-e355-4bc1-95ff-ca388bebf599');

--    Dorindos (site says 10% on every bill and, elsewhere, only over 5 people)
--    and Piccolino Henley (charge stated on the Christmas menu only).
update reports set status = 'may-charge'
where status = 'unclear' and id in (
  '07892e5f-ced0-4e23-994b-11318717dbd7', '67cb1681-cdb7-43d1-97ba-1000c82932c1');

--    Le Petit Doigt: both own menus say a charge is added; only the rate
--    differs (10% vs 12.5%), so it is a charge with no single percentage.
update reports set status = 'charges'
where status = 'unclear' and id = '0ddfd800-a7b5-4cf7-b753-fdcf914d1b8f';

-- Everything else left as 'unclear' is hidden by the app.

commit;

select status, count(*) from reports group by status order by status;
