# README ConversAI

## 1. Descrizione

ConversAI è un'applicazione web che permette di creare progetti, conversazioni e messaggi simulando l'interazione con un assistente virtuale. L'applicazione è sviluppata con Node.js, SQLite per la persistenza dei dati e utilizza Bootstrap per il frontend.

## 2. Istruzioni operative

**Requisiti**: Node.js installato sul computer.

**1. Installazione delle dipendenze**, dalla cartella del progetto:

```
npm install
```
Questo comando installa anche Bootstrap, le icone e il font come pacchetti npm e, subito dopo (script `postinstall`), copia automaticamente i file necessari dentro `public/vendor/` così il frontend può usarli senza CDN.

**2. Dati di esempio (facoltativo)**: per popolare il database con un progetto, una conversazione e un messaggio di partenza (solo se il database è ancora vuoto):

```
npm run init-db
```

**3. Avvio del server**:
```
npm start
```
oppure, in fase di sviluppo, per farlo riavviare automaticamente a ogni modifica dei file:
```
npm run dev
```
In entrambi i casi il server resta in ascolto su `http://localhost:3000`.

**4. Uso dell'applicazione** (aprendo l'indirizzo sopra nel browser):

- Il pulsante **"+ Nuovo progetto"** in alto nella sidebar apre una finestra per creare un progetto (nome obbligatorio, descrizione facoltativa).

- Cliccando su un progetto nella lista, questo si espande mostrando le sue conversazioni e un pulsante **"+ Nuova conversazione"** per aggiungerne una (richiede un argomento).

- Cliccando su una conversazione, questa si apre nell'area principale con il suo storico messaggi.

- In basso si scrive il messaggio nella casella di testo e si invia con il pulsante o premendo **Invio** (Maiusc+Invio per andare a capo senza inviare). Il messaggio dell'utente e la risposta simulata dell'assistente compaiono subito in sequenza.

- Passando il mouse su un progetto o su una conversazione compaiono le icone matita (rinomina) e cestino (elimina); l'eliminazione chiede sempre conferma.

- Su schermi stretti (mobile) la sidebar è nascosta dietro al pulsante con le tre righe orizzontali in alto a sinistra.