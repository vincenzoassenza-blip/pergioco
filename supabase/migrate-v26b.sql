-- v26b: emoji delle meccaniche = solo emoji (niente lettere/cifre/ASCII), eliminazione meccaniche (staff).
-- Idempotente. Le righe esistenti vanno verificate PRIMA (vedi query in fondo al file, commentata).
do $$ begin
 if exists (select 1 from public.antero_meccaniche where emoji is not null and not (
   char_length(emoji) between 1 and 16 and emoji !~ '[\u0001-\u1fff\u2100-\u214f]'
   and emoji !~ '[[:alpha:][:digit:][:space:][:cntrl:]]'
   and emoji ~ '^[\u2190-\u2bff\u3030\u303d\u3297\u3299\U0001F000-\U0001FAFF]')) then
  raise exception 'v26b: ci sono emoji esistenti che non rispettano il nuovo vincolo';
 end if; end $$;
alter table public.antero_meccaniche drop constraint if exists antero_meccaniche_emoji_check;
alter table public.antero_meccaniche drop constraint if exists antero_mecc_emoji_solo_emoji;
alter table public.antero_meccaniche add constraint antero_mecc_emoji_solo_emoji check (emoji is null or (
  char_length(emoji) between 1 and 16
  and emoji !~ '[\u0001-\u1fff\u2100-\u214f]'              -- niente ASCII/latino/lettere-simbolo (™ ℹ …)
  and emoji !~ '[[:alpha:][:digit:][:space:][:cntrl:]]'    -- niente lettere/cifre di nessun alfabeto
  and emoji ~ '^[\u2190-\u2bff\u3030\u303d\u3297\u3299\U0001F000-\U0001FAFF]'));  -- deve iniziare con un pittogramma/bandiera
-- l'albo copia l'emoji dalla meccanica: stesso limite di lunghezza/ASCII (le righe storiche restano valide)
alter table public.antero_albo drop constraint if exists antero_albo_emoji_check;
alter table public.antero_albo drop constraint if exists antero_albo_emoji_ok;
alter table public.antero_albo add constraint antero_albo_emoji_ok check (emoji is null or (char_length(emoji) between 1 and 16 and emoji !~ '[\u0001-\u007f]'));
-- eliminazione: policy esplicita solo staff (la policy "for all" la copre già; questa la rende evidente)
drop policy if exists antero_mecc_delete on public.antero_meccaniche;
create policy antero_mecc_delete on public.antero_meccaniche for delete to authenticated using (public.is_staff());
-- l'albo resta integro: meccanica_id ... on delete set null, nome/emoji copiati
