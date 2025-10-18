<!-- eslint-disable -->

## React PageFlip Notes

> ⚠️ Always re-read `docs/stpageflip/README.md` (local snapshot of the upstream docs) before touching the diary flip-book. It mirrors the authoritative API reference and keeps us aligned with `PageFlip.loadFromHtml` / `updateFromHtml` expectations.

Version 2.0.0 of `react-pageflip` rewrote the library around React hooks and **changed several method APIs**. Keep these references handy whenever you touch the diary flip-book:

- Live demo with source: https://nodlik.github.io/react-pageflip/
- StPageFlip docs and examples: https://nodlik.github.io/StPageFlip/
- TypeDoc API reference: https://nodlik.github.io/StPageFlip/docs/index.html
- The flip-book renders a single Lexical editor on the active page. Non-active pages use
  `DiaryEntryPreview`, so remember to update previews via `useDiaryEntrySession` before calling
  `pageFlip.update()`.
- **Do not trigger full HTML reloads while the user digita sul diario.** Imposta sempre la prop
  `renderOnlyPageLengthChange` su `<HTMLFlipBook>`: in caso contrario la libreria invoca
  `updateFromHtml` ad ogni render, ricostruisce il nodo `contenteditable` e il cursore torna
  all'inizio. L’opzione fa sì che il markup venga rigenerato solo quando cambia il numero di
  pagine, preservando focus e selezione (vedi commit `fix(diary): avoid flipbook html reload while typing`).

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
- `renderOnlyPageLengthChange` (default `false`): only re-render when page count changes.

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
- `loadFromImages(images)` / `loadFromHtml(items)` / `updateFromHtml(items)` / `updateFromImages(images)`: hydrate or refresh content.
- `destroy()`: tear down the instance and listeners.

These notes are the single source of truth for working with the flip-book; keep them in sync with upstream releases.
