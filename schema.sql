-- Ejecutar en Supabase SQL Editor
CREATE TABLE IF NOT EXISTS words (
  id BIGSERIAL PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access" ON words FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_words_word ON words (word);
