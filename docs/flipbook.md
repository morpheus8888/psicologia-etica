<!-- eslint-disable max-len -->

# Flipbook V2 (React + CSS 3D)

Il nuovo flipbook sostituisce il wrapper `react-pageflip` nelle anteprime e nei prototipi. È costruito con componenti controllati React + CSS 3D e supporta gesture, wheel, tastiera e modalità scroll continuo.

## Struttura

| File | Scopo |
| --- | --- |
| `src/features/flipbook/components/Flipbook.tsx` | Entry-point. Gestisce provider, toolbar, viste paginata/continua e pannello impostazioni. |
| `src/features/flipbook/FlipbookProvider.tsx` | Contesto con stato `settings` + `engine`. |
| `src/features/flipbook/hooks/useFlipbookSettings.ts` | Persistenza con `localStorage` (`flipbook.settings.v1:{id}`). |
| `src/features/flipbook/hooks/useFlipbookEngine.ts` | Motore animazioni/gesture: wheel, pointer drag, continuous offset, announcer. |
| `src/features/flipbook/components/FlipbookPagedView.tsx` | Rendering spread 3D + superfici animate (curl/slide/fade). |
| `src/features/flipbook/components/FlipbookContinuousView.tsx` | Modalità scroll con `scroll-snap`, controller bidirezionale. |
| `src/features/flipbook/components/FlipbookSettings.tsx` | Pannello UI (shadcn) per temi, fisica, accessibilità. |
| `src/features/flipbook/components/FlipbookToolbar.tsx` | Navigazione, toggle layout, zoom, suono, apertura impostazioni. |
| `src/features/flipbook/utils/geometry.ts` | Helper spread, clamp/lerp, CSS vars. |
| `src/features/flipbook/utils/accessibility.ts` | Live-region per annunci pagina e util focus. |

## Utilizzo

```tsx
import { Flipbook } from '@/features/flipbook';

const pages = data.map(entry => (
  <article key={entry.id}>
    {/* contenuto */}
  </article>
));

<Flipbook
  pages={pages}
  flipbookId="diary"
  initialPage={0}
  showSettings
  onPageChange={page => console.log('page', page)}
/>;
```

- `flipbookId` → scope per la persistenza.
- `settingsOverride` → patch iniziale (es. forzare tema dark). Verrà applicata sopra i valori salvati.
- `onPageChange` → chiamato quando il motore committa la pagina (animazione conclusa o salto immediato).

## Impostazioni e temi

I valori live sono disponibili nel contesto `useFlipbookSettingsContext()`. Le chiavi principali:

| Chiave | Range/Opzioni | Default |
| --- | --- | --- |
| `animation` | `curl` · `slide` · `fade` · `none` | `curl` |
| `speed` | 0.2 – 2.0 | 1 |
| `inertia` | 0 – 1 | 0.6 |
| `snapThreshold` | 0 – 1 | 0.35 |
| `shadows` | 0 – 1 | 0.7 |
| `curlIntensity` | 0 – 1 | 0.7 |
| `pageThickness` | 0 – 12 (px) | 4 |
| `gutterDepth` | 0 – 24 (px) | 8 |
| `theme` | `paper` · `dark` · `sepia` · `custom` | `paper` |
| `twoPage` | boolean | true (desktop) |
| `continuousScroll` | boolean | false |
| `zoom` | 1 – 3 | 1 |
| `sound` | boolean | false |
| `soundVolume` | 0 – 1 | 0.5 |
| `reduceMotion` | `system` · `on` · `off` | `system` |
| `showThumbnails`, `showToc`, `showBookmarks` | boolean | false |

Le variabili CSS sono applicate sul contenitore e controllano tema/sfocature (`--flipbook-page-bg`, `--flipbook-shadow`, ecc.). Per temi custom è sufficiente estendere `THEME_PRESETS` o sovrascrivere le variabili dal parent.

## Gesture & Input

- **Wheel/trackpad** → delta normalizzato su soglia `snapThreshold`. Supporta inerzia e preferenze `reduce motion`.
- **Pointer drag** → calcolo direzione e soglia px configurabile dal pannello.
- **Continuous scroll** → container con `scroll-snap` e controller imperativo che sincronizza `scrollToPage`.
- **Keyboard** → puoi agganciare `engine.goNext/goPrevious` a hotkey esterni.
- **Annunci ARIA** → `announceFlipbookMessage` emette `Pagina N di M`.

## Integrazione

1. Converti le pagine in array di nodi (sinistra/destra). Usa `Flipbook` come drop-in al posto di `FocusSafeHTMLFlipBook`.
2. Per fallback server, avvolgi il componente dietro flag (`flipbookV2`) finché gli e2e non coprono gesture principali.
3. Quando `continuousScroll` è attivo, sfrutta `engine.registerExternalController` per sincronizzare overlay o indicatori.

## Test

- Unit: `useFlipbookEngine` coperto da Vitest (progress, soglie, overscroll).
- UI: prevedi una Playwright suite (`tests/flipbook.spec.ts`) per gesture + impostazioni quando il componente verrà connesso al diario completo.

Per ulteriori note vedere anche `docs/react-pageflip.md` (per la compatibilità con la versione legacy). Quando rimuoviamo completamente StPageFlip, aggiornare questo documento con i nuovi flussi QA.
