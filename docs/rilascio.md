# Procedura di rilascio

Ogni modifica all'app o al database si prova prima sull'ambiente di TEST e va in produzione solo dopo il via.

## Ambienti

- **Produzione** (app ufficiale): https://app.pergioco.org — repo `vincenzoassenza-blip/pergioco`, progetto Supabase di produzione. Non si pubblica qui prima del via.
- **Test** (copia di prova): https://vincenzoassenza-blip.github.io/pergioco-test/ — repo `vincenzoassenza-blip/pergioco-test`, progetto Supabase `pergioco-test`. Ha un banner arancione «AMBIENTE DI TEST», il nome «PerGioco TEST» e un database separato. Non ha un dominio personalizzato.

## Pubblicare sul test

1. Sviluppo su un worktree locale del repo di produzione, come sempre.
2. Suite completa verde: `scripts/test-all.sh`.
3. Se serve una migrazione, applicarla **solo** al database di test e verificarla lì.
4. Pubblicare sul test: `scripts/publish-test.sh` (dallo stesso worktree; lo script copia i file nel repo `pergioco-test`, applica banner e configurazione di test, e fa il push). Non tocca l'app ufficiale.
5. Provare su https://vincenzoassenza-blip.github.io/pergioco-test/ (se vedi ancora la versione precedente, chiudi e riapri l'app o svuota la cache).
6. Solo dopo il via, si pubblica in produzione con i passi seguenti.

## Pubblicare in produzione

Ogni pubblicazione in produzione segue questi passi, in questo ordine.


1. **Backup** del `origin/main` corrente: tag annotato `backup-pre-vX`, bundle git e copia di `app_settings` (solo chiavi e lunghezze in output; mai token né valori).
2. **Suite completa verde**, obbligatoria: `scripts/test-all.sh` (oppure `npm test`). Esegue tutte le unit e tutti i Playwright. Se un test fallisce, non si pubblica.
   - I test si aggiornano insieme alle funzioni (niente pin di versione fissi: si legge `APP_VERSION` da `brand.js` e si controlla che la cache SW sia allineata; le asserzioni CSS e UI restano aderenti alle schermate attuali).
   - Un fallimento che rivela un bug dell'app si corregge nell'app (o si blocca il rilascio), non si allenta il test per farlo passare.
3. **Migrazione** del database, solo se serve.
4. **Merge** `--no-ff` sul ramo di pubblicazione e `git push` verso `main`.
5. **Controllo live** dopo il deploy di Pages: `APP_VERSION`, nome della cache del service worker e query `?v=` degli asset.
6. **Invarianti** sui dati (conteggi attesi di giochi, partite, tavoli, XP, Wrapped, ecc.).

Il lavoro si fa da worktree locali, senza disturbare altri worktree già in uso.
