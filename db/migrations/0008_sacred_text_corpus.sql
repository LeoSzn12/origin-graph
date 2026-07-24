CREATE TABLE sacred_traditions (
  key text PRIMARY KEY CHECK (key ~ '^[a-z0-9-]+$'),
  label text UNIQUE NOT NULL,
  description text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sacred_texts (
  key text PRIMARY KEY CHECK (key ~ '^[a-z0-9-]+$'),
  tradition_key text NOT NULL REFERENCES sacred_traditions(key),
  label text NOT NULL,
  text_kind text NOT NULL CHECK (text_kind IN ('canonical_collection','embedded_work','related_ancient_text')),
  description text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (tradition_key, label)
);

CREATE TABLE sacred_books (
  key text PRIMARY KEY CHECK (key ~ '^[a-z0-9-]+$'),
  label text NOT NULL,
  alternate_labels jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(alternate_labels)='array'),
  default_order integer,
  parent_book_key text REFERENCES sacred_books(key),
  UNIQUE (label)
);

CREATE TABLE sacred_text_books (
  sacred_text_key text NOT NULL REFERENCES sacred_texts(key) ON DELETE CASCADE,
  sacred_book_key text NOT NULL REFERENCES sacred_books(key) ON DELETE CASCADE,
  position integer,
  section text,
  PRIMARY KEY (sacred_text_key, sacred_book_key)
);

CREATE TABLE sacred_canons (
  key text PRIMARY KEY CHECK (key ~ '^[a-z0-9-]+$'),
  tradition_key text NOT NULL REFERENCES sacred_traditions(key),
  label text NOT NULL,
  community text,
  description text NOT NULL,
  claimed_unit_count integer CHECK (claimed_unit_count > 0),
  unit_label text NOT NULL DEFAULT 'books',
  source_url text,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (tradition_key, label)
);

CREATE TABLE sacred_canon_books (
  canon_key text NOT NULL REFERENCES sacred_canons(key) ON DELETE CASCADE,
  sacred_book_key text NOT NULL REFERENCES sacred_books(key) ON DELETE CASCADE,
  section text,
  position integer,
  canonical_group text,
  membership_status text NOT NULL DEFAULT 'canonical'
    CHECK (membership_status IN ('canonical','deuterocanonical','broader_canon','related','disputed')),
  note text,
  PRIMARY KEY (canon_key, sacred_book_key)
);

CREATE TABLE sacred_edition_profiles (
  source_edition_id uuid PRIMARY KEY REFERENCES source_editions(id) ON DELETE CASCADE,
  sacred_text_key text NOT NULL REFERENCES sacred_texts(key),
  edition_key text UNIQUE NOT NULL CHECK (edition_key ~ '^[a-z0-9-]+$'),
  display_name text NOT NULL,
  language_code text NOT NULL,
  source_kind text NOT NULL
    CHECK (source_kind IN ('original_language','translation','manuscript','commentary')),
  license_scope text NOT NULL
    CHECK (license_scope IN ('public_domain','attribution','noncommercial','restricted','unknown')),
  text_integrity_policy text,
  is_default boolean NOT NULL DEFAULT false,
  searchable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE passage_sacred_references (
  passage_id uuid PRIMARY KEY REFERENCES passages(id) ON DELETE CASCADE,
  sacred_text_key text NOT NULL REFERENCES sacred_texts(key),
  sacred_book_key text REFERENCES sacred_books(key),
  chapter_number integer CHECK (chapter_number > 0),
  verse_start integer CHECK (verse_start > 0),
  verse_end integer CHECK (verse_end IS NULL OR verse_end >= verse_start),
  unit_label text NOT NULL,
  normalized_reference text NOT NULL,
  reference_sort_key text NOT NULL,
  UNIQUE (sacred_text_key, normalized_reference, passage_id)
);

CREATE TABLE passage_motifs (
  passage_id uuid NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  motif_id uuid NOT NULL REFERENCES motifs(id) ON DELETE CASCADE,
  match_basis text NOT NULL CHECK (match_basis IN ('explicit_term','curated_concept','model_suggestion')),
  confidence confidence_level NOT NULL DEFAULT 'medium',
  rationale text NOT NULL,
  review_status review_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (passage_id, motif_id)
);

CREATE TABLE sacred_parallel_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  label text NOT NULL,
  description text NOT NULL,
  match_type text NOT NULL CHECK (
    match_type IN ('direct_textual_relationship','shared_inherited_narrative','strong_thematic_parallel','general_motif','speculative_interpretation')
  ),
  confidence confidence_level NOT NULL DEFAULT 'medium',
  review_status review_status NOT NULL DEFAULT 'draft',
  created_by text,
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sacred_parallel_passages (
  parallel_set_id uuid NOT NULL REFERENCES sacred_parallel_sets(id) ON DELETE CASCADE,
  passage_id uuid NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  member_role text NOT NULL DEFAULT 'parallel',
  rationale text NOT NULL,
  PRIMARY KEY (parallel_set_id, passage_id)
);

CREATE INDEX sacred_text_books_order_idx ON sacred_text_books (sacred_text_key, position);
CREATE INDEX sacred_canon_books_book_idx ON sacred_canon_books (sacred_book_key, canon_key);
CREATE INDEX sacred_edition_profiles_text_idx ON sacred_edition_profiles (sacred_text_key, searchable);
CREATE INDEX passage_sacred_reference_lookup_idx ON passage_sacred_references
  (sacred_text_key, sacred_book_key, chapter_number, verse_start);
CREATE INDEX passage_motifs_motif_idx ON passage_motifs (motif_id, review_status, confidence);
CREATE INDEX sacred_parallel_passages_passage_idx ON sacred_parallel_passages (passage_id);

INSERT INTO sacred_traditions (key,label,description,sort_order) VALUES
  ('judaism','Judaism','Torah and the wider Tanakh, represented through edition-specific Jewish texts.',10),
  ('christianity','Christianity','Christian biblical collections with canon membership kept distinct by community.',20),
  ('islam','Islam','The Quran in Arabic and clearly identified translations; translations are not presented as replacements for Arabic.',30),
  ('hinduism','Hinduism','The Bhagavad Gita as an embedded work within the Mahabharata, with Sanskrit and translation editions kept distinct.',40),
  ('related','Related ancient texts','Historically related manuscripts and writings kept separate from the four primary collections.',90);

INSERT INTO sacred_texts (key,tradition_key,label,text_kind,description,sort_order) VALUES
  ('torah','judaism','Torah','canonical_collection','The five books of Moses in Jewish textual and interpretive context.',10),
  ('tanakh','judaism','Tanakh','canonical_collection','The Jewish Bible: Torah, Nevi’im, and Ketuvim.',20),
  ('christian-bible','christianity','Christian Bible','canonical_collection','Old and New Testament books with community-specific canon membership.',30),
  ('quran','islam','Quran','canonical_collection','The 114 surahs of the Quran, with Arabic and translations separately identified.',40),
  ('bhagavad-gita','hinduism','Bhagavad Gita','embedded_work','The eighteen-chapter dialogue embedded in the Mahabharata.',50),
  ('related-ancient','related','Related Ancient Texts','related_ancient_text','Dead Sea Scrolls, Enochic literature, Jubilees, commentary, and other adjacent sources.',90);

INSERT INTO sacred_canons (key,tradition_key,label,community,description,claimed_unit_count,unit_label,source_url,sort_order) VALUES
  ('jewish-torah','judaism','Torah','Jewish','Genesis through Deuteronomy.',5,'books',NULL,10),
  ('jewish-tanakh','judaism','Tanakh','Jewish','The twenty-four-book Jewish canon; book grouping and order differ from Christian Old Testaments.',24,'books',NULL,20),
  ('christian-protestant','christianity','Protestant Bible','Protestant','The commonly printed sixty-six-book Protestant canon.',66,'books','https://ebible.org/details.php?id=engwebp',30),
  ('christian-catholic','christianity','Catholic Bible','Roman Catholic','The Catholic Old and New Testament canon.',73,'books','https://www.vatican.va/archive/ENG0015/__PP.HTM',40),
  ('christian-ethiopian','christianity','Ethiopian Orthodox Bible','Ethiopian Orthodox Tewahedo','The Ethiopian Orthodox Tewahedo canon, traditionally counted as eighty-one books.',81,'books','https://www.ethiopianorthodox.org/english/canonical/books.html',50),
  ('quran-standard','islam','Quran','Islam','The Quran organized as 114 surahs.',114,'surahs','https://tanzil.net/docs/Quran_Text_Types',60),
  ('bhagavad-gita-18','hinduism','Bhagavad Gita','Hindu','The Bhagavad Gita organized as eighteen chapters.',18,'chapters','https://www.gutenberg.org/ebooks/2388',70);
