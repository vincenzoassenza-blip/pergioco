# Bug noti (la suite li segnala, non li nasconde)

## BUG-FOTO-BARRA — foto profilo che non carica, in barra

**Cosa succede.** Se l'URL della foto è accettato ma l'immagine non si carica, in barra non tornano né l'avatar già scelto né le iniziali: il cerchio resta vuoto.

**Perché.** Da v41.13.1 la foto in barra sta dentro `.havin` (`header.js`). Il listener globale in `sicurezza.js` (immagini `.avimg` rotte) legge `data-ini` e `data-av` dal `parentElement` dell'`img`, che ora è `.havin` e non ha quegli attributi (stanno su `#avbtn`).

**Test.** `tests/v41.12.1-foto.test.js` (due casi contrassegnati `xfail` / XFAIL). Se un giorno passano, il test fallisce con XPASS: togliere l'`xfail` e lasciare l'asserzione vera.

**Non corretto in questo intervento** (solo test e procedura di rilascio).
