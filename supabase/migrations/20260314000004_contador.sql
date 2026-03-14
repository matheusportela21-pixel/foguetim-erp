-- ============================================================
-- Migration: Espaço do Contador
-- ============================================================

-- ── accounting_documents ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounting_documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE,

  type text NOT NULL CHECK (type IN (
    'nfe_saida',
    'nfe_entrada',
    'nfce',
    'boleto',
    'extrato',
    'guia_das',
    'guia_darf',
    'contrato',
    'outros'
  )),

  name             text NOT NULL,
  description      text,
  file_url         text,
  file_size        integer,
  mime_type        text,

  -- Período de competência
  competencia_mes  integer CHECK (competencia_mes BETWEEN 1 AND 12),
  competencia_ano  integer,

  -- Valores
  valor            numeric(15,2),

  -- Referência a NF-e
  nfe_id           uuid REFERENCES public.nfe(id),

  tags             text[] DEFAULT '{}',

  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- updated_at trigger (reutiliza função criada na migration fiscal)
CREATE TRIGGER accounting_documents_updated_at
  BEFORE UPDATE ON public.accounting_documents
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ── accountant_access ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accountant_access (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  accountant_email  text NOT NULL,
  accountant_name   text,
  permissions       jsonb DEFAULT '{
    "view_nfe": true,
    "view_financial": true,
    "view_reports": true,
    "download_documents": true,
    "view_nfe_entrada": true
  }',
  status            text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  invited_at        timestamptz DEFAULT now(),
  accepted_at       timestamptz,
  expires_at        timestamptz DEFAULT (now() + interval '1 year'),
  UNIQUE(user_id, accountant_email)
);

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS accounting_docs_user_idx
  ON public.accounting_documents(user_id);

CREATE INDEX IF NOT EXISTS accounting_docs_type_idx
  ON public.accounting_documents(type);

CREATE INDEX IF NOT EXISTS accounting_docs_competencia_idx
  ON public.accounting_documents(competencia_ano, competencia_mes);

CREATE INDEX IF NOT EXISTS accountant_access_user_idx
  ON public.accountant_access(user_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.accounting_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountant_access    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounting_documents: owner all"
  ON public.accounting_documents FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "accountant_access: owner all"
  ON public.accountant_access FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
