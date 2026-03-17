-- Fix: remove políticas públicas inseguras de marketplace_connections
-- Contexto: saveConnection() e disconnectML() em lib/mercadolivre.ts usam
-- supabaseAdmin() que bypassa RLS — políticas para {public} eram desnecessárias
-- e representavam risco de segurança (qualquer pessoa podia inserir conexões).

DROP POLICY IF EXISTS "Allow insert from service" ON marketplace_connections;
DROP POLICY IF EXISTS "Allow update from service" ON marketplace_connections;

-- Política única: owner pode fazer tudo — service_role bypassa RLS automaticamente
CREATE POLICY "owner_marketplace" ON marketplace_connections
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Garantir RLS ativo
ALTER TABLE marketplace_connections ENABLE ROW LEVEL SECURITY;
