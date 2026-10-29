-- v19: lo staff può annullare la conferma della caparra o correggerne l'importo.
-- La prenotazione torna «in_attesa_conferma» e continua a tenere il posto (nessuna promozione).
-- Chi/quando: colonne caparra_mod_da/caparra_mod_at + riga in evento_audit (ev_log).
alter table public.evento_pren add column if not exists caparra_mod_da text, add column if not exists caparra_mod_at timestamptz;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='evento_pren_caparra_mod_da_len') then
  alter table public.evento_pren add constraint evento_pren_caparra_mod_da_len check (char_length(caparra_mod_da)<=254);
 end if;
 if not exists(select 1 from pg_constraint where conname='evento_pren_caparra_importo_chk') then
  alter table public.evento_pren add constraint evento_pren_caparra_importo_chk check (caparra_importo is null or (caparra_importo>=0 and caparra_importo<=10000 and caparra_importo=round(caparra_importo,2))) not valid;
 end if; end $$;

create or replace function public.evento_staff(p_pren uuid, p_azione text, p_importo numeric default null, p_presente boolean default null)
 returns void language plpgsql security definer set search_path to 'public' as $function$
declare r public.evento_pren; chi text:=coalesce(auth.jwt()->>'email','staff');
begin
 if not public.is_staff() then raise exception 'Solo admin e moderatori' using errcode='42501'; end if;
 select * into r from public.evento_pren where id=p_pren for update; if not found then raise exception 'Prenotazione non trovata'; end if;
 if p_azione in ('conferma_caparra','correggi_importo') and (p_importo is null or p_importo<0 or p_importo>10000 or p_importo<>round(p_importo,2)) then
  raise exception 'Importo non valido (tra 0 e 10000 €, massimo 2 decimali)' using errcode='22023'; end if;
 if p_azione='conferma_caparra' then
  if r.stato<>'in_attesa_conferma' then raise exception 'La prenotazione non è in attesa di conferma'; end if;
  update public.evento_pren set stato='confermata',caparra_importo=p_importo,caparra_da=chi,caparra_at=now(),updated_at=now() where id=p_pren;
  perform public.ev_log('caparra_confermata',r.evento_id,p_pren,jsonb_build_object('importo',p_importo));
 elsif p_azione='annulla_caparra' then
  if r.stato<>'confermata' or r.caparra_at is null then raise exception 'Nessuna caparra confermata da annullare'; end if;
  -- resta un posto occupato (in_attesa_conferma): il trigger promuove solo su annullata/rifiutata
  update public.evento_pren set stato='in_attesa_conferma',presente=false,caparra_importo=null,caparra_da=null,caparra_at=null,
   caparra_mod_da=chi,caparra_mod_at=now(),updated_at=now() where id=p_pren;
  perform public.ev_log('caparra_annullata',r.evento_id,p_pren,jsonb_build_object('importo_prima',r.caparra_importo,'confermata_da',r.caparra_da,'confermata_il',r.caparra_at));
 elsif p_azione='correggi_importo' then
  if r.stato<>'confermata' or r.caparra_at is null then raise exception 'Nessuna caparra confermata da correggere'; end if;
  update public.evento_pren set caparra_importo=p_importo,caparra_mod_da=chi,caparra_mod_at=now(),updated_at=now() where id=p_pren;
  perform public.ev_log('caparra_corretta',r.evento_id,p_pren,jsonb_build_object('importo_prima',r.caparra_importo,'importo',p_importo));
 elsif p_azione='rifiuta' then
  if r.stato not in ('confermata','in_attesa_conferma','attesa') then raise exception 'Prenotazione già chiusa'; end if;
  update public.evento_pren set stato='rifiutata',updated_at=now() where id=p_pren;
  perform public.ev_log('prenotazione_annullata_staff',r.evento_id,p_pren,jsonb_build_object('stato_prima',r.stato));
 elsif p_azione='presente' then
  update public.evento_pren set presente=coalesce(p_presente,true),updated_at=now() where id=p_pren;
  perform public.ev_log(case when coalesce(p_presente,true) then 'presente' else 'assente' end,r.evento_id,p_pren,null);
 else raise exception 'Azione sconosciuta'; end if; end $function$;
revoke all on function public.evento_staff(uuid,text,numeric,boolean) from public,anon;
grant execute on function public.evento_staff(uuid,text,numeric,boolean) to authenticated;
