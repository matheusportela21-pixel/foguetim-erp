-- Preferências de impressão de etiquetas por usuário
-- Permite salvar formato preferido (pdf/zpl2), tamanho de etiqueta e auto-impressão

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS print_prefs JSONB NOT NULL DEFAULT '{"format":"pdf","label_size":"100x150","auto_print":false}'::jsonb;
