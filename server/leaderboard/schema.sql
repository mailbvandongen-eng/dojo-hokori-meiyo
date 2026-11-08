CREATE TABLE IF NOT EXISTS players (
  id      TEXT PRIMARY KEY,          -- willekeurige UUID per toestel
  naam    TEXT NOT NULL,             -- zelfgekozen naam (max 16 tekens)
  fights  INTEGER NOT NULL DEFAULT 0,
  twins   INTEGER NOT NULL DEFAULT 0, -- toernooizeges
  graad   TEXT,
  titels  INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fights ON players (fights DESC);
CREATE INDEX IF NOT EXISTS idx_twins ON players (twins DESC);
