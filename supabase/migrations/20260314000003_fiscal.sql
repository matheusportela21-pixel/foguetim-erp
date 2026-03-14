-- ============================================================
-- Migration: Infraestrutura Fiscal NF-e
-- ============================================================

-- ── fiscal_config ─────────────────────────────────────────────────────────────
create table if not exists public.fiscal_config (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,

  -- Emissão
  ambiente              text not null default 'homologacao' check (ambiente in ('homologacao', 'producao')),
  versao_layout         text not null default '4.00',
  serie                 integer not null default 1,
  proximo_numero        integer not null default 1,
  natureza_operacao     text not null default 'Venda de mercadoria',

  -- Certificado Digital A1
  certificado_path      text,       -- caminho no Storage (private bucket)
  certificado_cnpj      text,       -- CNPJ extraído do certificado
  certificado_titular   text,       -- Razão Social / titular
  certificado_validade  date,       -- data de expiração

  -- Configurações Gerais
  enviar_email_dest     boolean not null default true,
  email_cc              text,
  formato_danfe         text not null default 'retrato' check (formato_danfe in ('retrato', 'paisagem')),
  atualizar_estoque     boolean not null default true,
  atualizar_financeiro  boolean not null default true,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (user_id)
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger fiscal_config_updated_at
  before update on public.fiscal_config
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.fiscal_config enable row level security;

create policy "fiscal_config: owner select"
  on public.fiscal_config for select
  using (auth.uid() = user_id);

create policy "fiscal_config: owner insert"
  on public.fiscal_config for insert
  with check (auth.uid() = user_id);

create policy "fiscal_config: owner update"
  on public.fiscal_config for update
  using (auth.uid() = user_id);

create policy "fiscal_config: owner delete"
  on public.fiscal_config for delete
  using (auth.uid() = user_id);

-- ── nfe ───────────────────────────────────────────────────────────────────────
create table if not exists public.nfe (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,

  -- Identificação
  numero            integer not null,
  serie             integer not null default 1,
  chave_acesso      text unique,
  ambiente          text not null default 'homologacao' check (ambiente in ('homologacao', 'producao')),

  -- Status
  status            text not null default 'rascunho'
                    check (status in ('rascunho', 'pendente', 'autorizada', 'cancelada', 'denegada', 'erro')),
  motivo_rejeicao   text,
  protocolo         text,           -- número do protocolo SEFAZ
  data_autorizacao  timestamptz,

  -- Destinatário
  dest_nome         text not null,
  dest_cnpj_cpf     text,
  dest_ie           text,
  dest_email        text,
  dest_logradouro   text,
  dest_numero       text,
  dest_bairro       text,
  dest_municipio    text,
  dest_uf           text,
  dest_cep          text,

  -- Valores
  valor_produtos    numeric(14,2) not null default 0,
  valor_frete       numeric(14,2) not null default 0,
  valor_desconto    numeric(14,2) not null default 0,
  valor_outros      numeric(14,2) not null default 0,
  valor_icms        numeric(14,2) not null default 0,
  valor_ipi         numeric(14,2) not null default 0,
  valor_pis         numeric(14,2) not null default 0,
  valor_cofins      numeric(14,2) not null default 0,
  valor_total       numeric(14,2) not null default 0,

  -- Armazenamento
  xml_url           text,
  danfe_url         text,

  -- Metadados
  natureza_operacao text not null default 'Venda de mercadoria',
  informacoes_adicionais text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger nfe_updated_at
  before update on public.nfe
  for each row execute procedure public.set_updated_at();

-- Índices
create index if not exists nfe_user_id_idx  on public.nfe (user_id);
create index if not exists nfe_status_idx   on public.nfe (status);
create index if not exists nfe_created_idx  on public.nfe (created_at desc);

-- RLS
alter table public.nfe enable row level security;

create policy "nfe: owner select"
  on public.nfe for select
  using (auth.uid() = user_id);

create policy "nfe: owner insert"
  on public.nfe for insert
  with check (auth.uid() = user_id);

create policy "nfe: owner update"
  on public.nfe for update
  using (auth.uid() = user_id);

create policy "nfe: owner delete"
  on public.nfe for delete
  using (auth.uid() = user_id);

-- ── nfe_items ─────────────────────────────────────────────────────────────────
create table if not exists public.nfe_items (
  id              uuid primary key default gen_random_uuid(),
  nfe_id          uuid not null references public.nfe(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,

  numero_item     integer not null,
  codigo_produto  text,
  descricao       text not null,
  ncm             text,             -- Nomenclatura Comum do Mercosul
  cfop            text not null,    -- Código Fiscal de Operações e Prestações
  unidade         text not null default 'UN',

  quantidade      numeric(14,4) not null default 1,
  valor_unitario  numeric(14,4) not null default 0,
  valor_total     numeric(14,2) not null default 0,
  valor_desconto  numeric(14,2) not null default 0,
  valor_frete     numeric(14,2) not null default 0,

  -- Tributos por item
  cst_icms        text,
  aliquota_icms   numeric(5,2) not null default 0,
  valor_icms      numeric(14,2) not null default 0,

  cst_pis         text,
  aliquota_pis    numeric(5,2) not null default 0,
  valor_pis       numeric(14,2) not null default 0,

  cst_cofins      text,
  aliquota_cofins numeric(5,2) not null default 0,
  valor_cofins    numeric(14,2) not null default 0,

  created_at      timestamptz not null default now()
);

create index if not exists nfe_items_nfe_id_idx on public.nfe_items (nfe_id);

-- RLS
alter table public.nfe_items enable row level security;

create policy "nfe_items: owner select"
  on public.nfe_items for select
  using (auth.uid() = user_id);

create policy "nfe_items: owner insert"
  on public.nfe_items for insert
  with check (auth.uid() = user_id);

create policy "nfe_items: owner update"
  on public.nfe_items for update
  using (auth.uid() = user_id);

create policy "nfe_items: owner delete"
  on public.nfe_items for delete
  using (auth.uid() = user_id);
