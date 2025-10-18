<!-- eslint-disable -->

## React PageFlip Notes

> ⚠️ Always re-read `docs/stpageflip/README.md` (local snapshot of the upstream docs) before touching the diary flip-book. It mirrors the authoritative API reference and keeps us aligned with `PageFlip.loadFromHTML` / `updateFromHtml` expectations.

The React wrapper proxies the StPageFlip API. Treat StPageFlip as the authoritative source; use the links below as quick references when working on the diary flip-book:

- Live demo with source: https://nodlik.github.io/react-pageflip/
- StPageFlip docs and examples: https://nodlik.github.io/StPageFlip/
- TypeDoc API reference: https://nodlik.github.io/StPageFlip/docs/index.html
- The flip-book renders a single Lexical editor on the active page. Non-active pages use
  `DiaryEntryPreview`, so remember to update previews via `useDiaryEntrySession` before calling
  `pageFlip.update()`.
- **Do not trigger full HTML reloads while the user digita nel diario.** Imposta la prop
  `renderOnlyPageLengthChange` sul wrapper del progetto `FocusSafeHTMLFlipBook` (non è un’opzione di StPageFlip né dell’HTMLFlipBook ufficiale):
  in caso contrario la libreria invoca `updateFromHtml` ad ogni render, ricostruisce il nodo `contenteditable`
  e il cursore torna all'inizio. L’opzione fa sì che il markup venga rigenerato solo quando cambia il numero di
  pagine, preservando focus e selezione (vedi commit `fix(diary): avoid flipbook html reload while typing`).
  Nel diario usiamo il wrapper `FocusSafeHTMLFlipBook` (`src/features/diary/client/components/FocusSafeHTMLFlipBook.tsx`)
  per rispettare questa regola: il componente tiene traccia delle pagine (count + key) e chiama `loadFromHTML`
  / `updateFromHtml` solo quando cambiano, così il flip-book resta montato e l’editor non perde il focus.
- **Non usare hack di focus restore.** Se il flip-book causa blur, c'è un bug di configurazione: non
  provare a richiamare `focus()` o cambiare le selection manualmente. Sistemare la causa (click
  intercettati, update inutili, ecc.) seguendo la doc, altrimenti il caret salta e il debug si
  riempie di eventi.

### Installation

```bash
npm install react-pageflip
```

### Basic Usage

```tsx
import HTMLFlipBook from 'react-pageflip';

function MyBook() {
  return (
    <HTMLFlipBook width={300} height={500}>
      <div className="demoPage">Page 1</div>
      <div className="demoPage">Page 2</div>
      <div className="demoPage">Page 3</div>
      <div className="demoPage">Page 4</div>
    </HTMLFlipBook>
  );
}
```

### Advanced Usage

When you need to render components as pages, wrap them with `React.forwardRef`:

```tsx
import HTMLFlipBook from 'react-pageflip';
import { forwardRef } from 'react';

const Page = forwardRef<HTMLDivElement, { number: string }>(({ number, children }, ref) => (
  <div className="demoPage" ref={ref}>
    <h1>Page Header</h1>
    <p>{children}</p>
    <p>Page number: {number}</p>
  </div>
));

function MyBook() {
  return (
    <HTMLFlipBook width={300} height={500}>
      <Page number="1">Page text</Page>
      <Page number="2">Page text</Page>
      <Page number="3">Page text</Page>
      <Page number="4">Page text</Page>
    </HTMLFlipBook>
  );
}
```

### Key Props

- `width`, `height` (required): base page dimensions.
- `size` (`"fixed"` or `"stretch"`, default `"fixed"`): stretch to parent container when set to `"stretch"`. When stretching, also define `minWidth`, `maxWidth`, `minHeight`, `maxHeight`.
- `drawShadow` (default `true`): toggle flip shadows.
- `flippingTime` (default `1000` ms): animation duration.
- `usePortrait` (default `true`): enable portrait mode.
- `startZIndex` (default `0`): starting z-index.
- `autoSize` (default `true`): sync parent size to book size.
- `maxShadowOpacity` (default `1`): shadow strength.
- `showCover` (default `false`): treat first/last pages as hard cover.
- `mobileScrollSupport` (default `true`): disable content scrolling while touching the book on mobile.
- `swipeDistance` (default `30`): minimum swipe length.
- `clickEventForward` (default `true`): forward click events to child elements (`a`, `button`, etc.).
- `useMouseEvents` (default `true`): enable mouse/touch flipping.
- `showPageCorners` (wrapper-level): toggle visible corner hotspots in some React wrappers.
- `renderOnlyPageLengthChange` (wrapper-level, default `false`): only re-render when page count changes (proprietary prop of our `FocusSafeHTMLFlipBook`).

### Events

- `onFlip(pageIndex: number)`: fires on page turn.
- `onChangeOrientation(mode: 'portrait' | 'landscape')`: fires when orientation changes.
- `onChangeState(state: 'user_fold' | 'fold_corner' | 'flipping' | 'read')`: fires on state changes.
- `onInit({ page, mode })`: fires when the book initializes.
- `onUpdate({ page, mode })`: fires when pages update via `updateFrom*` methods.

Event payloads include both `data` and the underlying `PageFlip` instance.

### Methods

Get the `PageFlip` instance via `ref.current.pageFlip()` to call helpers:

- `getPageCount()` → number of pages.
- `getCurrentPageIndex()` → current page index.
- `getOrientation()` → `'portrait' | 'landscape'`.
- `getBoundsRect()` → layout metrics.
- `turnToPage(pageNum)` / `turnToNextPage()` / `turnToPrevPage()`: jump without animation.
- `flip(pageNum, corner?)` / `flipNext(corner?)` / `flipPrev(corner?)`: animate page turns.
- `loadFromImages(images)` / `loadFromHTML(items)` / `updateFromHtml(items)` / `updateFromImages(images)` / `update()`: hydrate or refresh content or trigger a re-render.
- `destroy()`: tear down the instance and listeners.

StPageFlip is the source of truth for the API; keep these notes in sync with the upstream docs.

### Manual Navigation Notes

- Normalizza sempre l’indice corrente alla pagina sinistra della coppia (`index` pari) prima di eseguire flip programmatici.
- Usa i metodi di animazione di StPageFlip (`flipPrev` / `flipNext` / `flip`) in modo coerente con la direzione; ricorri a `turnToPage(targetIndex)` solo per salti senza animazione.
- Convenzione UI del diario: le frecce usano `flipPrev('bottom')` / `flipNext('top')` (navigazione a passo singolo); il calendario usa `flip(targetIndex, corner?)` verso l’indice calcolato. Mantieni `turnToPage` solo per salti non animati.
- Pulsanti di navigazione rapida (in alto a destra): navigazione diretta senza animazione. Usa `turnToPage(targetIndex)` (o `turnToNextPage`/`turnToPrevPage` quando applicabile) per saltare velocemente tra sezioni/pagine senza avviare l’effetto di flip.
- Dopo un flip manuale sincronizza la navigazione ascoltando l’evento `flip`. Se devi forzare l’indice, allinealo comunque al valore normalizzato per evitare che `update()` o `turnToPage` interrompano l’animazione.
- Non aggiornare lo stato di navigazione dell’app mentre il flip è in corso: forzare l’indice provoca una chiamata immediata a `flip()`/`turnToPage()` da parte del watcher di sincronizzazione e la transizione scompare.
- Evita di chiamare `flip()` / `turnToPage()` mentre lo stato riportato da `changeState` è `'flipping'`; attendi il ritorno a `'read'` prima di riallineare manualmente l’indice.
- Per il debug abbiamo eventi `flipbook.manual.request` / `flipbook.manual` e `flipbook.state` che includono spread calcolati, metodo usato e stato corrente: cattura l’output quando il flip non anima correttamente.
