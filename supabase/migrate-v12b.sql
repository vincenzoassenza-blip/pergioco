-- v12b: i moderatori possono LEGGERE i libri sociali (soci, quote, volontari). Scritture solo admin.
-- Registro operazioni (libro_audit) e report di import restano solo admin.
do $$ declare t text; begin
 foreach t in array array['libro_soci','libro_quote','libro_volontari'] loop
  execute format('drop policy if exists %I on public.%I',t||'_admin',t);
  execute format('drop policy if exists %I on public.%I',t||'_read',t);
  execute format('drop policy if exists %I on public.%I',t||'_ins',t);
  execute format('drop policy if exists %I on public.%I',t||'_upd',t);
  execute format('drop policy if exists %I on public.%I',t||'_del',t);
  execute format('create policy %I on public.%I for select to authenticated using (public.is_staff())',t||'_read',t);
  execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin())',t||'_ins',t);
  execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())',t||'_upd',t);
  execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())',t||'_del',t);
 end loop; end $$;
