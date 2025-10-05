CREATE TABLE IF NOT EXISTS "vocabulary_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"term" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"is_word_of_day" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vocabulary_entries_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "vocabulary_entries_word_of_day_unique" ON "vocabulary_entries" USING btree ("is_word_of_day") WHERE "vocabulary_entries"."is_word_of_day" = true;
--> statement-breakpoint
INSERT INTO "vocabulary_entries" ("slug", "term", "excerpt", "content", "is_word_of_day", "published_at") VALUES
  (
    'cura-emotiva',
    'Cura emotiva',
    'Un promemoria pratico per riconoscere e accogliere le emozioni quotidiane.',
    '<h2>Cura emotiva</h2><p>La cura emotiva è la pratica intenzionale di riconoscere, nominare e accogliere le emozioni senza giudicarle.</p><p>Si costruisce nel tempo con piccoli gesti quotidiani:</p><ul><li>respirare e ascoltare il corpo,</li><li>dare un nome a ciò che si sente,</li><li>cercare supporto quando emerge il bisogno.</li></ul><p>È un processo dinamico che alimenta resilienza e senso di presenza.</p>',
    true,
    now()
  ),
  (
    'spazio-sicuro',
    'Spazio sicuro',
    'Il contesto che permette a una relazione di diventare autentica.',
    '<h2>Spazio sicuro</h2><p>Per spazio sicuro si intende un ambiente relazionale in cui le persone si sentono protette, rispettate e libere di esprimersi.</p><p>Si fonda su tre pilastri:</p><ol><li>ascolto attivo,</li><li>rispetto dei confini,</li><li>condivisione chiara delle intenzioni.</li></ol><p>Crearlo richiede costanza, consapevolezza e responsabilità reciproca.</p>',
    false,
    now()
  ),
  (
    'respiro-consapevole',
    'Respiro consapevole',
    'Una micro-pratica di autoregolazione per riportare calma e presenza.',
    '<h2>Respiro consapevole</h2><p>Il respiro consapevole è una tecnica semplice che aiuta a regolare il sistema nervoso.</p><p>Basta dedicare qualche minuto per:</p><ul><li>inspirare contando fino a quattro,</li><li>trattenere per due,</li><li>espirare lentamente fino a sei.</li></ul><p>Ripetendo il ciclo per tre minuti si favorisce il rilascio della tensione e si riattiva la capacità di concentrazione.</p>',
    false,
    now()
  );
