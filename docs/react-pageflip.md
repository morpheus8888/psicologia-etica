<!-- eslint-disable -->

# React PageFlip — Linee guida operative (aggiornate)

Queste istruzioni servono per lavorare sul diario a flip nativo, restando allineati alla documentazione ufficiale di StPageFlip e del wrapper React.

## Principi chiave
- Considera **StPageFlip** come sorgente autorevole dell’API; il wrapper React espone gli stessi concetti.
- **Evita ricostruzioni HTML durante la digitazione** usando la prop del wrapper **`renderOnlyPageLengthChange`**: quando attiva, il flip-book si aggiorna *solo* se cambia il **numero** di pagine.
- Per tutti i cambi di layout che **non** modificano la quantità di pagine (resize, orientamento, tema, font, zoom, pannelli che si aprono/chiudono), **non ricostruire**: esegui un **re-layout** con il metodo dell’istanza **`update()`**.

## Setup & sizing
- Imposta **`width`** e **`height`** del libro.
- Se usi **`size="stretch"`**, definisci sempre **`minWidth`**, **`maxWidth`**, **`minHeight`**, **`maxHeight`** per evitare layout instabili all’avvio e ai resize.
- Mantieni le altre prop in linea con le necessità del progetto (es. `usePortrait`, `flippingTime`, `showCover`, `mobileScrollSupport`, `clickEventForward`).

## Focus & aggiornamenti
- Scopo di `renderOnlyPageLengthChange`: evitare che un re-render di React causi `updateFromHtml` e ti ricrei il `contenteditable` (perdita di focus/caret).
- Con `renderOnlyPageLengthChange` attiva, **non ci sono re-layout automatici**: dopo il mount e a ogni variazione del contenitore **devi chiamare `update()`** sull’istanza per ricomporre il layout.
- **Ricostruzione HTML (`updateFromHtml`) solo se cambia la lunghezza dell’array pagine**. Per tutto il resto è sufficiente `update()`.

## Eventi
- Gli handler del wrapper ricevono un **oggetto evento**: leggi i valori da **`e.data`** (es. indice pagina, modalità `portrait|landscape`, stato `user_fold|fold_corner|flipping|read`).
- Usa **`onFlip`** per sincronizzare l’indice corrente dopo un’animazione.
- Usa **`onChangeState`** per sapere quando lo stato torna a **`read`**: **non** chiamare `flip()` o `turnToPage()` mentre è **`flipping`**.

## Navigazione (convenzioni del diario)
- Normalizza l’indice alla **pagina sinistra** (indice pari) prima dei flip programmatici.
- **Animazione**: `flipPrev` / `flipNext` / `flip`.
- **Salto senza animazione**: `turnToPage` / `turnToNextPage` / `turnToPrevPage`.
- Frecce: `flipPrev('bottom')` e `flipNext('top')`.  
  Calendario: `flip(targetIndex, corner?)`.  
  Pulsanti rapidi: `turnToPage(targetIndex)`.

## Ciclo di vita suggerito
1. **Mount / onInit** → esegui **`update()`** per comporre correttamente la pagina iniziale.
2. **Resize, orientamento, tema/font, pannelli UI** → esegui **`update()`** (eventualmente con throttle/debounce).
3. **Cambio numero di pagine** (aggiunte/rimozioni) → esegui **`updateFromHtml(...)`** una volta aggiornato il markup delle pagine; `onUpdate` rifletterà il nuovo stato.

## Editor & anteprime
- **Un solo editor (Lexical) sulla pagina attiva**. Le pagine non attive usano la preview.
- **Aggiorna le preview** attraverso il tuo stato/sessione **prima** di invocare `update()` o di effettuare un flip, per evitare disallineamenti visivi.

## Ref & metodi dell’istanza
- Recupera l’istanza del flip-book tramite la ref del componente e usa direttamente i metodi dell’API (es. `update`, `updateFromHtml`, `flip*`, `turnTo*`, `getCurrentPageIndex`, `getPageCount`).
- Ricorda: gli indici pagina sono **0-based**.

## Casi tipici e rimedi
- **Libro “scomposto” dopo il mount**: significa che il layout è cambiato dopo l’inizializzazione; esegui **`update()`** (e fallo anche ai successivi resize/orientamenti).
- **Perdita focus durante la digitazione**: attiva **`renderOnlyPageLengthChange`** e assicurati che non stai chiamando `updateFromHtml` inutilmente.
- **Flip che non anima**: non invocare `flip/turn` mentre lo stato è `flipping`; coordina le chiamate aspettando `read` e sincronizza tramite `onFlip`.

## Nomenclatura & case-sensitive
- I nomi dei metodi sono **case-sensitive**: verifica sempre la forma esatta (esempio ricorrente: `loadFromHTML` vs `updateFromHtml`).
- Mantieni le note del progetto allineate alla doc upstream quando aggiorni la libreria.

## Quando serve un wrapper personalizzato
- Il wrapper custom può essere ridotto a un **“thin layer” o un hook** per:
  - normalizzare l’indice (pagina sinistra),
  - bloccare chiamate mentre lo stato è `flipping`,
  - fare throttle/debounce di `update()`,
  - incapsulare le regole di navigazione dell’app.
- Evita logica che ricostruisca automaticamente l’HTML: delega a `renderOnlyPageLengthChange` + chiamate esplicite a `update()` / `updateFromHtml()`.

## Checklist operativa
- `renderOnlyPageLengthChange` attiva per non perdere focus durante l’input.
- `update()`:
  - dopo il mount,
  - su resize/orientamento,
  - su cambi che impattano le misure (tema, font, pannelli).
- `updateFromHtml(...)` solo quando cambia il **numero** di pagine.
- Non chiamare `flip/turn` mentre lo stato è `flipping`; aspetta `read`.
- Sincronizza l’indice con `onFlip` e leggi i payload da `e.data`.
- Con `size="stretch"`, imposta sempre i limiti min/max.
- Editor soltanto sulla pagina attiva; le preview vanno aggiornate prima di `update()`/flip.
- Evita hack di “focus restore”: se perdi focus, c’è un aggiornamento o un click intercettato da correggere alla radice.
