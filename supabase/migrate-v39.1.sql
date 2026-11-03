-- v39.1 — Lista desideri: proposta + 👍 del proponente in un'unica transazione (atomica).
-- Riusa i controlli esistenti di des_proponi (socio collegato, validazione dati, una proposta attiva, duplicati)
-- e di des_vota (solo soci, proposta votabile, periodo aperto, PK anti-doppio voto). Se il voto fallisce, la proposta viene annullata.
create or replace function public.des_proponi_voto(p jsonb)
 returns uuid language plpgsql security definer set search_path to 'public' as $$
declare me text:=public.cp_me(); i uuid; begin
 if me is null then raise exception 'Per proporre un gioco il tuo account deve essere collegato a un socio'; end if;
 if p is null or jsonb_typeof(p)<>'object' or octet_length(p::text)>3000 then raise exception 'Dati non validi'; end if;
 i:=public.des_proponi(p);
 if i is null then raise exception 'Proposta non registrata'; end if;
 perform public.des_vota(i,true);
 return i; end $$;
revoke all on function public.des_proponi_voto(jsonb) from public;
revoke all on function public.des_proponi_voto(jsonb) from anon;
grant execute on function public.des_proponi_voto(jsonb) to authenticated;
