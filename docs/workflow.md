# Guida alla Preview del Progetto

Questa guida spiega come visualizzare le modifiche apportate al progetto prima di caricarle su GitHub.

## 1. Preview di Sviluppo (Real-time)
Questa è la modalità più comoda per lavorare. Ogni modifica salvata verrà aggiornata istantaneamente nel browser.

1.  Apri il terminale nella cartella del progetto.
2.  Esegui il comando:
    ```bash
    npm run dev
    ```
3.  Apri l'indirizzo mostrato nel terminale (solitamente [http://localhost:5173](http://localhost:5173)).

## 2. Preview di Produzione (Locale)
Usa questa modalità per vedere come apparirà esattamente il sito una volta pubblicato.

1.  Genera i file di produzione:
    ```bash
    npm run build
    ```
2.  Avvia il server di preview:
    ```bash
    npm run preview
    ```
3.  Apri l'indirizzo mostrato (solitamente [http://localhost:4173](http://localhost:4173)).

## 3. Preview Online (Opzionale)
Se desideri una preview online automatica per ogni modifica prima di fare il "merge" nel ramo principale, ti consigliamo di collegare il repository GitHub a:
- [Vercel](https://vercel.com)
- [Netlify](https://www.netlify.com)

Entrambi offrono un piano gratuito che crea automaticamente un link di preview per ogni caricamento.
