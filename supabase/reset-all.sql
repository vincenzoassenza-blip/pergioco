-- AZZERAMENTO TOTALE prima della messa in produzione. IRREVERSIBILE: fare prima un backup.
-- Resta SOLO l'account admin vincenzo.assenza@pergioco.org (utente di accesso + riga in admins).
-- Tutto il resto viene cancellato: soci, partite, giochi, tavoli, eventi, prenotazioni, libri, quote,
-- volontari, codici, moderatori, registri (audit), impostazioni e tutti gli altri account.
-- Nota: anche la scheda socio di Vincenzo viene cancellata; dopo il reset va ricreata e collegata dal pannello admin.
begin;
do $$ begin
 if not exists(select 1 from auth.users where lower(email)='vincenzo.assenza@pergioco.org') then
  raise exception 'Account admin da conservare non trovato: azzeramento annullato'; end if; end $$;
set local session_replication_role=replica; -- niente trigger di audit/promozione durante la pulizia
delete from public.evento_audit; delete from public.evento_pren; delete from public.eventi;
delete from public.libro_import_report; delete from public.libro_audit; delete from public.libro_quote;
delete from public.libro_volontari; delete from public.libro_soci;
delete from public.tables; delete from public.plays; delete from public.member_codes; delete from public.members; delete from public.games;
delete from public.moderators; delete from public.app_settings;
delete from public.admins where lower(email)<>'vincenzo.assenza@pergioco.org';
set local session_replication_role=origin;
delete from auth.users where lower(email) is distinct from 'vincenzo.assenza@pergioco.org'; -- sessioni e identità collegate se ne vanno a cascata
commit;
