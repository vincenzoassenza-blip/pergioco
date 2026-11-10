# Procedura di rilascio

Ogni pubblicazione segue questi passi, in questo ordine.

1. **Backup** del `origin/main` corrente: tag annotato `backup-pre-vX`, bundle git e copia di `app_settings` (solo chiavi e lunghezze in output; mai token né valori).
2. **Suite completa verde**, obbligatoria: `scripts/test-all.sh` (oppure `npm test`). Esegue tutte le unit e tutti i Playwright. Se un test fallisce, non si pubblica.
   - I test si aggiornano insieme alle funzioni (niente pin di versione fissi: si legge `APP_VERSION` da `brand.js` e si controlla che la cache SW sia allineata; le asserzioni CSS e UI restano aderenti alle schermate attuali).
   - Un fallimento che rivela un bug dell'app si corregge nell'app (o si blocca il rilascio), non si allenta il test per farlo passare.
3. **Migrazione** del database, solo se serve.
4. **Merge** `--no-ff` sul ramo di pubblicazione e `git push` verso `main`.
5. **Controllo live** dopo il deploy di Pages: `APP_VERSION`, nome della cache del service worker e query `?v=` degli asset.
6. **Invarianti** sui dati (conteggi attesi di giochi, partite, tavoli, XP, Wrapped, ecc.).

Il lavoro si fa da worktree locali, senza disturbare altri worktree già in uso.
