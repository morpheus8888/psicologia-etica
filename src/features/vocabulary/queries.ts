import { randomUUID } from 'node:crypto';

import { asc, eq, ilike, or, sql } from 'drizzle-orm';

import { db } from '@/libs/db';
import { vocabularyEntries } from '@/models/vocabulary';

type VocabularyRecord = {
  id: string;
  slug: string;
  term: string;
  excerpt: string;
  content: string;
  isWordOfDay: boolean;
  publishedAt: Date | null;
};

const baseSelection = {
  id: vocabularyEntries.id,
  slug: vocabularyEntries.slug,
  term: vocabularyEntries.term,
  excerpt: vocabularyEntries.excerpt,
  content: vocabularyEntries.content,
  isWordOfDay: vocabularyEntries.isWordOfDay,
  publishedAt: vocabularyEntries.publishedAt,
};

const fallbackEntries: VocabularyRecord[] = [
  {
    id: randomUUID(),
    slug: 'dialogo-interiore',
    term: 'Dialogo interiore',
    excerpt: 'Una pratica per ascoltare e riformulare la voce interna che guida le scelte quotidiane.',
    content:
      '<h2>Dialogo interiore</h2><p>Il dialogo interiore è la narrazione che ciascuno porta avanti con sé stesso durante la giornata. Può essere fonte di motivazione oppure diventare un ostacolo.</p><p>Allenarlo significa:</p><ul><li>riconoscere i pensieri automatici,</li><li>chiedersi se sono utili o realistici,</li><li>sostituirli con parole che sostengono obiettivi e valori.</li></ul><p>Un dialogo interiore gentile favorisce resilienza e senso di agency.</p>',
    isWordOfDay: false,
    publishedAt: new Date('2024-05-20T08:00:00Z'),
  },
  {
    id: randomUUID(),
    slug: 'zona-di-sicurezza',
    term: 'Zona di sicurezza',
    excerpt: 'Lo spazio mentale in cui il sistema nervoso percepisce stabilità e può dedicarsi all’apprendimento.',
    content:
      '<h2>Zona di sicurezza</h2><p>La zona di sicurezza è lo stato in cui il corpo interpreta l’ambiente come prevedibile. Il battito si regolarizza, la respirazione torna profonda e la corteccia prefrontale può funzionare al meglio.</p><p>Entrarci richiede micro abitudini: pause consapevoli, rituali, ancore sensoriali.</p><blockquote><p>Più spesso torniamo a questa zona, più diventiamo capaci di restarci nelle sfide.</p></blockquote>',
    isWordOfDay: false,
    publishedAt: new Date('2024-06-02T09:30:00Z'),
  },
  {
    id: randomUUID(),
    slug: 'empatia-situata',
    term: 'Empatia situata',
    excerpt: 'La capacità di entrare in relazione tenendo conto del contesto, dei confini e delle risorse di chi abbiamo di fronte.',
    content:
      '<h2>Empatia situata</h2><p>Non tutta l’empatia è uguale. L’empatia situata integra la comprensione emotiva con le condizioni concrete di una relazione.</p><p>Significa:</p><ol><li>ascoltare senza anticipare soluzioni,</li><li>domandare quali sostegni siano realistici,</li><li>rispettare i limiti propri e altrui.</li></ol><p>Così l’empatia diventa sostenibile e non si trasforma in sovraccarico.</p>',
    isWordOfDay: false,
    publishedAt: new Date('2024-07-11T10:15:00Z'),
  },
  {
    id: randomUUID(),
    slug: 'ritmo-di-recupero',
    term: 'Ritmo di recupero',
    excerpt: 'L’alternanza tra attivazione e pause che permette alla mente di consolidare gli apprendimenti.',
    content:
      '<h2>Ritmo di recupero</h2><p>Il ritmo di recupero indica quanto velocemente riusciamo a tornare in equilibrio dopo uno sforzo emotivo o cognitivo.</p><p>Tre leve essenziali:</p><ul><li>sonno regolare,</li><li>movimento che scarica le tensioni,</li><li>relazioni che accolgono senza giudizio.</li></ul><p>Allenando queste leve aumentiamo la finestra di tolleranza e la capacità di restare presenti.</p>',
    isWordOfDay: false,
    publishedAt: new Date('2024-08-03T12:00:00Z'),
  },
  {
    id: randomUUID(),
    slug: 'curiosita-compassionevole',
    term: 'Curiosità compassionevole',
    excerpt: 'Un atteggiamento che unisce la voglia di esplorare alle attenzioni necessarie per non ferire sé o gli altri.',
    content:
      '<h2>Curiosità compassionevole</h2><p>È l’attitudine di chi osserva e chiede con genuino interesse, ricordando che ogni risposta merita cura.</p><p>Nella pratica terapeutica significa accogliere storie complesse senza invadere, lasciare spazio a tempi e silenzi e validare ciò che emerge.</p><p>Questa curiosità alimenta fiducia e rende la relazione un luogo sicuro di crescita reciproca.</p>',
    isWordOfDay: false,
    publishedAt: new Date('2024-09-15T15:10:00Z'),
  },
  {
    id: randomUUID(),
    slug: 'presenza-regolata',
    term: 'Presenza regolata',
    excerpt:
      'La capacità di restare disponibili senza andare in sovraccarico, modulando respiro, postura e tono della voce.',
    content:
      '<h2>Presenza regolata</h2><p>Preservare la propria presenza mentre si accompagna qualcun altro richiede consapevolezza dei segnali corporei.</p><ul><li>Osservare tensioni e micro-contrazioni,</li><li>rallentare il ritmo delle parole,</li><li>ricordarsi di respirare in modo ampio.</li></ul><p>Questa regolazione fa sentire l’altro accolto e allo stesso tempo protegge chi ascolta dal burnout emotivo.</p>',
    isWordOfDay: false,
    publishedAt: new Date('2024-10-02T09:00:00Z'),
  },
  {
    id: randomUUID(),
    slug: 'ascolto-radicato',
    term: 'Ascolto radicato',
    excerpt: 'Un ascolto che parte dal contatto con il proprio corpo per non assorbire automaticamente l’ansia dell’altro.',
    content:
      '<h2>Ascolto radicato</h2><p>Restare radicati significa verificare di avere i piedi a terra, la schiena sostenuta e il respiro che scorre.</p><p>Quando siamo radicati possiamo:</p><ol><li>risuonare con l’altro senza fonderci,</li><li>riconoscere le emozioni che emergono,</li><li>scegliere una risposta intenzionale.</li></ol><p>È una micro-competenze chiave nelle sessioni intense e nelle conversazioni difficili.</p>',
    isWordOfDay: false,
    publishedAt: new Date('2024-10-07T14:20:00Z'),
  },
  {
    id: randomUUID(),
    slug: 'confine-gentile',
    term: 'Confine gentile',
    excerpt: 'Il modo di porre limiti chiari mantenendo calore, rispetto e collaborazione con l’altra persona.',
    content:
      '<h2>Confine gentile</h2><p>Dire “no” in modo gentile è un atto di cura: per sé e per l’altro.</p><p>Si costruisce partendo da tre passi:</p><ul><li>nominare il bisogno o il limite,</li><li>riconoscere l’intenzione dell’altro,</li><li>proporre alternative realistiche.</li></ul><p>Così il confine non diventa muro, bensì orientamento.</p>',
    isWordOfDay: false,
    publishedAt: new Date('2024-10-12T11:45:00Z'),
  },
  {
    id: randomUUID(),
    slug: 'respirazione-intenzionale',
    term: 'Respirazione intenzionale',
    excerpt: 'Sequenze di respiri guidati che insegnano al sistema nervoso a cambiare marcia con consapevolezza.',
    content:
      '<h2>Respirazione intenzionale</h2><p>La respirazione intenzionale lavora sull’allungamento dell’espirazione e sulle pause consapevoli.</p><p>Favorisce una risposta parasimpatica più rapida e porta ossigeno dove serve. Può essere integrata nelle sedute come rituale di apertura o chiusura.</p><p>Brevi pratiche, ripetute, insegnano al corpo che è possibile rallentare senza perdere lucidità.</p>',
    isWordOfDay: false,
    publishedAt: new Date('2024-10-19T08:05:00Z'),
  },
  {
    id: randomUUID(),
    slug: 'traccia-emotiva',
    term: 'Traccia emotiva',
    excerpt: 'Il segno che un’esperienza lascia nel corpo e nella memoria, utile per riconoscere pattern ricorrenti.',
    content:
      '<h2>Traccia emotiva</h2><p>Ogni emozione imprime una traccia: un’immagine, una tensione, un pensiero ricorrente.</p><p>Riconoscerla consente di anticipare gli automatismi e di scegliere nuove strade.</p><p>In terapia si può lavorare sulle tracce emotive con visualizzazioni, scrittura riflessiva e tecniche somatiche di scarico.</p>',
    isWordOfDay: false,
    publishedAt: new Date('2024-10-25T17:30:00Z'),
  },
];

function mergeEntries(primary: VocabularyRecord[], secondary: VocabularyRecord[]) {
  const seen = new Set(primary.map(entry => entry.slug));
  const merged = [...primary];

  for (const entry of secondary) {
    if (seen.has(entry.slug)) {
      continue;
    }
    merged.push(entry);
  }

  return merged;
}

function filterEntries(entries: VocabularyRecord[], search?: string) {
  if (!search) {
    return entries;
  }

  const needle = search.toLowerCase();
  return entries.filter(entry =>
    entry.term.toLowerCase().includes(needle)
    || entry.excerpt.toLowerCase().includes(needle),
  );
}

export type VocabularySummary = Awaited<ReturnType<typeof listVocabularyEntries>>[number];
export type VocabularyEntryDetail = VocabularyRecord;

export async function listVocabularyEntries(search?: string) {
  const trimmed = search?.trim();
  const dbEntries = trimmed && trimmed.length > 0
    ? await db
      .select(baseSelection)
      .from(vocabularyEntries)
      .where(
        or(
          ilike(vocabularyEntries.term, `%${trimmed}%`),
          ilike(vocabularyEntries.excerpt, `%${trimmed}%`),
        ),
      )
      .orderBy(asc(vocabularyEntries.term))
    : await db
      .select(baseSelection)
      .from(vocabularyEntries)
      .orderBy(asc(vocabularyEntries.term));

  const combined = mergeEntries(dbEntries, fallbackEntries);
  return filterEntries(combined, trimmed);
}

export async function getWordOfTheDay() {
  const [pinned] = await db
    .select(baseSelection)
    .from(vocabularyEntries)
    .where(eq(vocabularyEntries.isWordOfDay, true))
    .limit(1);

  if (pinned) {
    return pinned;
  }

  const [randomEntry] = await db
    .select(baseSelection)
    .from(vocabularyEntries)
    .orderBy(sql`random()`)
    .limit(1);

  if (randomEntry) {
    return randomEntry;
  }

  if (fallbackEntries.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * fallbackEntries.length);
  return fallbackEntries[randomIndex];
}

export async function getVocabularyEntryBySlug(slug: string) {
  const [entry] = await db
    .select(baseSelection)
    .from(vocabularyEntries)
    .where(eq(vocabularyEntries.slug, slug))
    .limit(1);

  if (entry) {
    return entry;
  }

  return fallbackEntries.find(item => item.slug === slug) ?? null;
}
