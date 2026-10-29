-- v10.3: staff (admin o moderatore) possono aggiungere giochi; update/delete solo admin
drop policy if exists games_admin_write on public.games;
drop policy if exists games_staff_insert on public.games;
drop policy if exists games_admin_update on public.games;
drop policy if exists games_admin_delete on public.games;
create policy games_staff_insert on public.games for insert to authenticated with check (public.is_staff());
create policy games_admin_update on public.games for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy games_admin_delete on public.games for delete to authenticated using (public.is_admin());
