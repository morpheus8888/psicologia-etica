import React, { useMemo } from 'react';

import { AnimatedDiary } from './AnimatedDiary';

const sampleEntries = [
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
  const pages = useMemo(() => sampleEntries.map((entry, index) => (
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
  )), [locale]);

  return (
    <AnimatedDiary pages={pages} />
  );
};

export { AnimatedDiaryDemo };
