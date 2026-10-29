-- v10f: non-staff must include own member when inserting a play
drop policy if exists plays_insert_all on public.plays; create policy plays_insert_self on public.plays for insert to authenticated with check (public.is_admin() or public.is_moderator() or exists (select 1 from public.members m where m.user_id = auth.uid() and players @> jsonb_build_array(jsonb_build_object('memberId', m.id))));
