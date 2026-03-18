-- Multi-conta Mercado Livre
-- Permite que um usuário conecte mais de uma conta ML ao Foguetim ERP.
-- Altera o constraint único de (user_id, marketplace) para (user_id, marketplace, ml_user_id),
-- impedindo que a mesma conta ML seja conectada duas vezes, mas permitindo contas distintas.

-- 1. Remover constraint antigo (user_id, marketplace) se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'marketplace_connections_user_id_marketplace_key'
      AND conrelid = 'marketplace_connections'::regclass
  ) THEN
    ALTER TABLE marketplace_connections
      DROP CONSTRAINT marketplace_connections_user_id_marketplace_key;
  END IF;
END $$;

-- 2. Adicionar colunas novas
ALTER TABLE marketplace_connections
  ADD COLUMN IF NOT EXISTS account_label TEXT,
  ADD COLUMN IF NOT EXISTS is_primary    BOOLEAN NOT NULL DEFAULT false;

-- 3. Marcar todas as conexões existentes como primárias
--    (eram únicas por user+marketplace, logo já são a principal)
UPDATE marketplace_connections
  SET is_primary = true
  WHERE marketplace = 'mercadolivre';

-- 4. Novo unique index: impede duplicata da mesma conta ML por usuário
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_connections_user_mktplace_mluser_idx
  ON marketplace_connections (user_id, marketplace, ml_user_id)
  WHERE ml_user_id IS NOT NULL;

-- 5. Índice para busca rápida da conta primária
CREATE INDEX IF NOT EXISTS idx_marketplace_connections_primary
  ON marketplace_connections (user_id, marketplace)
  WHERE is_primary = true;
