import React, { useMemo, useState } from 'react';

import { AnimatedDiary } from './AnimatedDiary';

const sampleEntries = [
  {
    title: 'Pagina di scrittura',
    subtitle: 'Prova a scrivere qui',
    mode: 'writing' as const,
    content: [
      'Questo slot è solo di esempio e non salva il contenuto. Ti permette però di valutare l’effetto visivo della carta rigata.',
    ],
  },
  {
    title: 'Benvenuto nel diario',
    subtitle: 'Setup iniziale',
    content: [
      'Questo prototipo mostra un diario con effetto flip “soft” realizzato interamente in React + CSS 3D, senza dipendere da StPageFlip.',
      'Ogni spread è composto da due pagine accoppiate: sinistra e destra. I controlli sottostanti consentono di scorrere le coppie di pagine.',
      'L’obiettivo è offrire un punto di partenza pulito su cui innestare editor, anteprime e logica di salvataggio reali.',
    ],
  },
  {
    title: 'Navigazione',
    subtitle: 'Come funziona',
    content: [
      'I pulsanti “Precedente” e “Successivo” avviano l’animazione. Durante il flip mostriamo due superfici:',
      '- il fronte: la pagina attuale che sta venendo sfogliata;',
      '- il retro: la pagina del nuovo spread che apparirà una volta conclusa l’animazione.',
      'L’animazione dura 720 ms e viene gestita da semplici keyframe CSS con `transform: rotateY()`.',
    ],
  },
  {
    title: 'Editor',
    subtitle: 'Slot per il testo',
    content: [
      'Per integrare un editor (Lexical, tiptap, ecc.) basta montarlo dentro una delle pagine. Finché il nodo DOM non viene ricreato, il caret rimane stabile.',
      'Questo prototipo non include un editor vero e proprio, ma gli slot `<div>` sono pensati per ospitare componenti controllati o non controllati.',
    ],
  },
  {
    title: 'Temi e personalizzazione',
    subtitle: 'Stile',
    content: [
      'Le pagine usano gradienti soft e ombre per simulare la carta. Puoi sostituire la grafica intervenendo nel modulo CSS dedicato.',
      'Eventuali indicatori extra (progresso mensile, segnalibri, ecc.) possono essere aggiunti nella toolbar o nella nota in fondo.',
    ],
  },
  {
    title: 'Roadmap',
    subtitle: 'Passi successivi',
    content: [
      '1. Agganciare l’editor reale e il contesto di salvataggio.',
      '2. Integrare le azioni (share, goal link, ecc.) come overlay o pannelli laterali.',
      '3. Estendere le animazioni con gesture/drag se necessario (oggi i pulsanti disabilitano input durante il flip).',
    ],
  },
  {
    title: 'Grazie!',
    subtitle: 'Prova il prototipo',
    content: [
      'Sfoglia le pagine e valuta se l’effetto visivo è sufficiente per sostituire Gradualmente lo StPageFlip tradizionale.',
      'La struttura del codice è volutamente modulare: puoi riutilizzare `AnimatedDiary` in qualsiasi sezione dell’app.',
    ],
  },
];

type AnimatedDiaryDemoProps = {
  locale: string;
};

const AnimatedDiaryDemo: React.FC<AnimatedDiaryDemoProps> = ({ locale }) => {
  const [theme, setTheme] = useState<'classic' | 'nocturne' | 'minimal'>('classic');
  const [flipMode, setFlipMode] = useState<'3d' | 'flat'>('3d');
  const [flipDuration, setFlipDuration] = useState(720);
  const [texture, setTexture] = useState(0.28);
  const [curvature, setCurvature] = useState(0.45);
  const [paperMode, setPaperMode] = useState<'plain' | 'lined'>('lined');
  const [shadowIntensity, setShadowIntensity] = useState(0.35);
  const [shadowWidth, setShadowWidth] = useState(24);

  const pages = useMemo(() => sampleEntries.map((entry, index) => {
    if (entry.mode === 'writing') {
      return (
        <div key={`${entry.title}-${index.toString()}`} className="flex h-full flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{entry.title}</h2>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {entry.subtitle}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{entry.content[0]}</p>
          </div>
          <div
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            aria-label="Simulazione pagina scrittura"
            className="relative min-h-[180px] flex-1 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-base text-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50"
            style={{
              backgroundImage:
                'linear-gradient(180deg, transparent 40%, rgba(110,131,170,0.28) 40%, rgba(110,131,170,0.28) 42%, transparent 42%)',
              backgroundSize: '100% 32px',
            }}
          >
            Scrivi qualcosa qui…
          </div>
        </div>
      );
    }

    return (
      <div key={`${entry.title}-${index.toString()}`}>
        <h2 className="text-lg font-semibold text-foreground">{entry.title}</h2>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {entry.subtitle}
        </p>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
          {entry.content.map((paragraph, paragraphIndex) => (
            <p key={`${entry.title}-${paragraphIndex.toString()}`}>{paragraph}</p>
          ))}
        </div>
        <div className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
          Locale:
          {' '}
          {locale}
        </div>
      </div>
    );
  }), [locale]);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <AnimatedDiary
        pages={pages}
        appearance={{
          theme,
          textureIntensity: texture,
          curvatureIntensity: curvature,
          paperMode,
          shadowIntensity,
          shadowWidth,
        }}
        flipOptions={{ durationMs: flipDuration, mode: flipMode }}
      />

      <section className="w-full max-w-4xl rounded-2xl border border-border/60 bg-background/70 p-6 shadow-sm">
        <header className="mb-4 space-y-1">
          <h3 className="text-lg font-semibold text-foreground">Controlli estetici & flip (demo)</h3>
          <p className="text-sm text-muted-foreground">
            Questa sezione personalizza solo il prototipo “AnimatedDiary”. Usa i selettori per testare temi,
            curvatura, texture e modalità di flip prima di portarli nel diario reale.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground">Tema</span>
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={theme}
                onChange={(event) => setTheme(event.currentTarget.value as typeof theme)}
              >
                <option value="classic">Classico (caldo)</option>
                <option value="nocturne">Nocturne (scuro)</option>
                <option value="minimal">Minimal (chiaro)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground">Texture carta</span>
              <input
                type="range"
                min={0}
                max={0.6}
                step={0.02}
                value={texture}
                onChange={(event) => setTexture(Number(event.currentTarget.value))}
                className="accent-primary"
              />
              <span className="text-xs text-muted-foreground">
                Intensità:
                {' '}
                {(texture * 100).toFixed(0)}
                %
              </span>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground">Curvatura pagina</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={curvature}
                onChange={(event) => setCurvature(Number(event.currentTarget.value))}
                className="accent-primary"
              />
              <span className="text-xs text-muted-foreground">
                Curvatura:
                {' '}
                {(curvature * 100).toFixed(0)}
                %
              </span>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground">Stile carta</span>
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={paperMode}
                onChange={(event) => setPaperMode(event.currentTarget.value as typeof paperMode)}
              >
                <option value="plain">Liscia</option>
                <option value="lined">Rigata (quaderno)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground">Ombra pagina (intensità)</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={shadowIntensity}
                onChange={(event) => setShadowIntensity(Number(event.currentTarget.value))}
                className="accent-primary"
              />
              <span className="text-xs text-muted-foreground">
                Opacità ombra:
                {' '}
                {(shadowIntensity * 100).toFixed(0)}
                %
              </span>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground">Ombra pagina (spessore)</span>
              <input
                type="range"
                min={6}
                max={48}
                step={1}
                value={shadowWidth}
                onChange={(event) => setShadowWidth(Number(event.currentTarget.value))}
                className="accent-primary"
              />
              <span className="text-xs text-muted-foreground">
                Larghezza ombra:
                {' '}
                {shadowWidth.toFixed(0)}
                {' '}
                px
              </span>
            </label>
          </div>

          <div className="space-y-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground">Modalità sfoglio</span>
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={flipMode}
                onChange={(event) => setFlipMode(event.currentTarget.value as typeof flipMode)}
              >
                <option value="3d">3D completo (curva)</option>
                <option value="flat">Flat (flip rapido)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground">Durata animazione</span>
              <input
                type="range"
                min={200}
                max={2000}
                step={20}
                value={flipDuration}
                onChange={(event) => setFlipDuration(Number(event.currentTarget.value))}
                className="accent-primary"
              />
              <span className="text-xs text-muted-foreground">
                Velocità:
                {' '}
                {flipDuration}
                {' '}
                ms
              </span>
            </label>
          </div>
        </div>
      </section>
    </div>
  );
};

export { AnimatedDiaryDemo };
