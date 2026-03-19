# AUDITORIA — Módulo de Promoções ML (Foguetim ERP)
**Data:** 2026-03-19
**Escopo:** Pesquisa de API + Audit de código + Audit visual (Playwright) + Comparativo com concorrentes
**Próxima ação:** FASE 2 — Redesign completo do módulo

---

## 1. API do Mercado Livre — Promoções (seller-promotions v2)

### 1.1 Endpoints Implementados no Foguetim

| Método | Endpoint ML | Rota Foguetim | Função |
|--------|-------------|---------------|--------|
| GET | `/seller-promotions/users/{ml_user_id}/promotions?app_version=v2` | `/api/mercadolivre/promocoes` | Lista todas as promoções do vendedor |
| GET | `/seller-promotions/promotions/{id}/items?promotion_type=...&app_version=v2` | `/api/mercadolivre/promocoes/[id]` | Itens de uma promoção |
| DELETE | `/seller-promotions/promotions/{id}?promotion_type=...&app_version=v2` | `/api/mercadolivre/promocoes/[id]` | Encerrar promoção |
| POST | `/seller-promotions/promotions?app_version=v2` | `/api/mercadolivre/promocoes/criar` | Criar campanha SELLER_CAMPAIGN |
| POST | `/seller-promotions/items/{item_id}?app_version=v2` | `/api/mercadolivre/promocoes/item` | Adicionar item à promoção |
| DELETE | `/seller-promotions/items/{item_id}?promotion_type=...&promotion_id=...&app_version=v2` | `/api/mercadolivre/promocoes/item` | Remover item da promoção |
| GET | `/seller-promotions/items/{item_id}?app_version=v2` | `/api/mercadolivre/promocoes/elegibilidade` | Verificar promoções ativas de um item |

### 1.2 Tipos de Promoção

| Tipo | Sub-tipo | Quem cria | Descrição | Duração máx |
|------|----------|-----------|-----------|-------------|
| `SELLER_CAMPAIGN` | `FLEXIBLE_PERCENTAGE` | Vendedor | Campanha própria de desconto — vendedor define preço por item | 14 dias |
| `SELLER_COUPON_CAMPAIGN` | — | Vendedor | Cupom de desconto | — |
| `DEAL` | — | ML convida | Campanha organizada pelo ML — vendedor aceita convite | — |
| `DOD` | — | ML convida | Oferta do Dia — alta visibilidade, ML seleciona | 1 dia |
| `PRICE_DISCOUNT` | — | Automático | Desconto individual aplicado diretamente ao preço do item | — |

### 1.3 Status de Promoção
- `pending` — Agendada (não iniciada)
- `started` — Ativa
- `paused` — Pausada
- `finished` — Encerrada

### 1.4 Status de Item em Promoção
- `candidate` — Elegível para participar
- `active` — Participando
- `paused` — Pausado
- `finished` — Encerrado

### 1.5 Campos-Chave por Tipo de Resposta

**Promoção (GET /promotions)**
```typescript
{
  id: string
  name: string
  type: PromoType
  sub_type: string
  status: PromoStatus
  start_date: string   // ISO 8601
  finish_date: string  // ISO 8601
  items_count?: number
}
```

**Item em Promoção (GET /promotions/{id}/items)**
```typescript
{
  id: string
  status: 'candidate' | 'active' | 'paused' | 'finished'
  price: number                    // preço atual
  original_price: number           // preço original (sem promoção)
  deal_price?: number              // preço na promoção
  min_discounted_price?: number    // mínimo permitido pelo ML
  suggested_discounted_price?: number  // sugestão do ML
}
```

### 1.6 Subsídio ML (DEAL / DOD)
- Quando o ML subsidia parte do desconto, o campo `deal_price` pode ser menor que o `min_discounted_price` fixado pelo vendedor.
- **Não há campo explícito na API para o valor do subsídio.** Ele é inferido:
  - `subsidio_ml = original_price - deal_price - (original_price - vendedor_price)`
  - Alternativa: `subsidio_ml = original_price - deal_price` quando o vendedor não baixou o preço
- O subsídio ML aparece no billing/extrato financeiro, não na API de promoções.

### 1.7 Cálculo "Você Recebe"
A API **não retorna** o valor líquido diretamente. Deve ser calculado no frontend:
```
voce_recebe = deal_price - comissao_ml - frete_estimado
comissao_ml = deal_price × commission_rate(category)
frete = calcFromWeight(weightG) ou estimado manual
```

### 1.8 Endpoints Não Implementados (lacunas)
- `PUT /seller-promotions/promotions/{id}` — Atualizar campanha (nome/datas)
- `PUT /seller-promotions/items/{item_id}` — Atualizar preço de item já na promoção
- Busca de itens elegíveis em lote (sem endpoint ML nativo — necessário iterar por anúncio)
- Aceitar/recusar convite para DEAL ou DOD (endpoint específico a pesquisar)

### 1.9 Requisitos para SELLER_CAMPAIGN
- Reputação verde no ML
- Itens ativos com condição "Novo"
- Produtos não gratuitos
- Duração máxima: 14 dias
- `sub_type: 'FLEXIBLE_PERCENTAGE'` — desconto percentual flexível por item

---

## 2. Análise Competitiva — Funcionalidades de Promoções

### 2.1 UpSeller
**O que têm:**
- Listagem de todas as campanhas do ML com status em tempo real
- "Você recebe" com breakdown: preço promo − comissão − frete = líquido
- Destaque visual em verde quando ML subsidia parte do desconto
- Filtros por status (ativa/encerrada/pendente), tipo, período
- Aba "Sem Promoção" — lista anúncios que não estão em nenhuma promoção
- Alerta de margem: avisa quando o preço de promoção está abaixo do custo + margem mínima
- Bulk add: pode adicionar múltiplos anúncios à promoção em lote

**Lacunas do UpSeller (nossa diferenciação):**
- Não integra engine de precificação completa (só calcula comissão, ignora imposto/marketing/afiliado)
- Não tem OTP para ações críticas
- Não distingue visualmente qual parte do desconto é paga pelo vendedor vs ML

### 2.2 Bling ERP
- Promoções ML apenas via import de arquivo CSV
- Sem visualização de "Você recebe" em tempo real
- Sem integração com engine de precificação

### 2.3 Olist / Tiny ERP
- Sincronização básica de preços promocionais
- Sem módulo dedicado de promoções ML
- Visualização limitada ao preço final, sem breakdown

### 2.4 Diferenciadores Foguetim (FASE 2)
1. **Engine de precificação integrada** — Margem real = preço promo − comissão − imposto − frete − marketing − embalagem
2. **OTP para ações críticas** (habilitar manualmente → confirmar → OTP)
3. **Alerta de margem mínima** baseado no custo real cadastrado no armazém
4. **"Você recebe" detalhado** com cada custo separado
5. **Aba "Sem Promoção"** com recomendação de quais anúncios participar

---

## 3. Audit do Módulo Atual — Código

### 3.1 Arquivo: `app/dashboard/promocoes/page.tsx`
**Tamanho:** 854 linhas
**Componentes internos:**
- `MarginSimulator` — Simulador básico (só mostra % de desconto, SEM engine de precificação)
- `PromoCard` — Card de campanha com status/datas/itens
- `ItemsDrawer` — Drawer lateral com itens da promoção
- `CreateModal` — Modal criar SELLER_CAMPAIGN (2 passos: form → confirm)
- `ConfirmModal` — Modal genérico de confirmação (sem OTP)

**Tabs atuais:**
```typescript
type TabType = 'minhas' | 'convidado' | 'por-item'
```
- `minhas` — SELLER_CAMPAIGN + SELLER_COUPON_CAMPAIGN
- `convidado` — DEAL + DOD
- `por-item` — Busca manual por MLB ID

### 3.2 Problemas Críticos Identificados

#### 🔴 P1 — MarginSimulator não usa engine de precificação
```typescript
// ATUAL: apenas calcula % de desconto
const pct = Math.round((1 - deal / originalPrice) * 100)
// Aviso "desconto alto" só acima de 30% — sem base real de margem
```
**Impacto:** Vendedor pode aceitar promoção com margem negativa sem saber.

#### 🔴 P2 — Write actions sem OTP
```typescript
// ATUAL: só usa ConfirmModal básico (texto + botão)
// Ações críticas: encerrar campanha, adicionar item, remover item
setConfirmState({ title, message, onConfirm: async () => { /* DELETE ML */ } })
```
**Impacto:** Risco de ação acidental na API do ML.

#### 🟠 P3 — "Você recebe" ausente nos itens
```typescript
// ItemsDrawer mostra apenas:
item.deal_price ? `${fmtBRL(item.deal_price)} (era ${fmtBRL(item.original_price)})` : fmtBRL(item.price)
// Não mostra: comissão, frete, imposto, margem, liquido
```

#### 🟠 P4 — Tab "Por Item" requer ID manual
- Usuário precisa saber o MLB ID do item — nenhum browse/listagem
- Sem paginação, sem busca por nome/SKU

#### 🟠 P5 — Sem "Sem Promoção" tab
- Diferenciador chave vs concorrentes completamente ausente
- Nenhuma visibilidade de quais anúncios estão fora de promoções

#### 🟡 P6 — Sem KPIs / cards de resumo
- Nenhum counter de "X campanhas ativas", "Y itens em promoção", "Desconto médio: Z%"

#### 🟡 P7 — Convidado pelo ML sem ações
- Tab mostra campanhas DEAL/DOD mas não oferece botão de participar/aceitar
- Sem breakdown financeiro para decidir se vale entrar na campanha

#### 🟡 P8 — Sem filtros avançados
- Nenhum filtro por status, tipo, período, % desconto mínimo/máximo

#### 🟡 P9 — Botão "Nova Campanha" sempre habilitado
- Deveria estar DESABILITADO por padrão com opt-in explícito do usuário
- Cria campanhas ML sem OTP/confirmação robusta

### 3.3 O Que Está Bom (manter na FASE 2)
- Estrutura de tabs com contadores
- PromoCard com tipo/status/datas
- CreateModal com validação de 14 dias e requisitos
- Tratamento de 404 da API ML (sem promoção = lista vazia)
- ActivityLogs em todas as write actions
- `ItemsDrawer` para visualizar itens (melhorar com "Você recebe")

---

## 4. Audit Visual — 10 Páginas (Playwright)

| Página | Status Visual | Bugs |
|--------|---------------|------|
| Dashboard | ✅ OK | Metric cards em loading permanente (sem ML) — esperado |
| Promoções | ⚠️ Loading infinito | Spinner permanente sem ML, sem KPIs, 3 tabs sem "Sem Promoção" |
| Precificação | ✅ OK | Funcional com todos os novos campos (PASSO 2) |
| Produtos ML | ⚠️ Loading infinito | "Carregando..." sem erro quando ML não conectado |
| Financeiro | ⚠️ Loading state | "Carregando..." no dropdown de período — deveria ter timeout de erro |
| Pedidos | ⚠️ Loading infinito | "Carregando pedidos..." sem estado de erro |
| Armazém/Produtos | ✅ OK | Skeleton loading com filtros/tabs funcionais |
| Integrações | ✅ OK | Layout bem estruturado, 0/11 conectados visível |
| Pós-Venda | ✅ OK | 3 tabs com filtros, "0 perguntas" visível |
| Reputação ML | ⚠️ Skeleton permanente | Cards skeleton sem resolver para "não conectado" |

### 4.1 Bugs Cross-Page
- **B1:** Console errors em TODAS as páginas — `_next/static/chunks/main-app.js`, `error.js`, `app-pages-internals.js`, `not-found.js` retornam 404 — dev server artifact, não crítico em produção
- **B2:** Múltiplas páginas ML ficam em loading infinito quando ML não conectado — deveriam mostrar estado "Conecte o Mercado Livre" após timeout (5–10s)

---

## 5. Design do Novo Módulo (FASE 2)

### 5.1 Arquitetura de Tabs

```
┌─────────────────────────────────────────────────────────────┐
│  Campanhas do ML  │  Minhas Promoções  │  Em Promoção  │  Sem Promoção  │
└─────────────────────────────────────────────────────────────┘
```

**Tab 1 — Campanhas do ML** (DEAL + DOD — convidado)
- Cards de campanhas disponíveis para participar
- Breakdown financeiro por campanha: "Se entrar, você recebe R$ X"
- Botão "Participar" DESABILITADO por padrão → opt-in → OTP
- ML subsidy destacado em verde: "ML paga R$ Y do desconto"

**Tab 2 — Minhas Promoções** (SELLER_CAMPAIGN + SELLER_COUPON_CAMPAIGN)
- KPI cards: ativas, pausadas, itens em promoção, desconto médio
- Criar/pausar/encerrar campanhas
- Botão "Nova Campanha" DESABILITADO por padrão → opt-in → form → OTP
- Filtros: status, tipo, período

**Tab 3 — Anúncios em Promoção**
- Tabela de todos os itens atualmente em promoção
- Coluna "Você recebe": `deal_price − comissão − frete = líquido`
- Coluna "Margem real" com engine de precificação (se custo_price cadastrado)
- Alerta visual se margem < threshold mínimo configurado
- Remover item DESABILITADO → opt-in → OTP

**Tab 4 — Sem Promoção** ⭐ Diferenciador
- Todos os anúncios ATIVOS que não estão em nenhuma promoção
- Coluna "Preço ideal promoção" (sugestão com 10-20% de desconto mantendo margem mínima)
- Botão "Adicionar à campanha" → seleciona campanha ativa → MarginSimulator real → OTP

### 5.2 "Você Recebe" Breakdown

```
Preço Promoção      R$ 89,90
- Comissão ML       R$ 10,79  (12% sobre preço de venda)
- Frete estimado    R$ 18,00  (ou calculado por peso)
─────────────────────────────
Você recebe         R$ 61,11
  [ML subsidia ✓]  +R$  8,00  (em verde, quando aplicável)
  Você recebe (real) R$ 69,11

Custo produto       R$ 45,00  (se cadastrado no armazém)
- Imposto           R$  5,39  (6% sobre preço de venda)
- Embalagem         R$  3,00
─────────────────────────────
Margem líquida      R$  7,72  (8.6%)
⚠️ Abaixo da margem mínima (20%)
```

### 5.3 Regras de Segurança das Write Actions

```
1. ESTADO PADRÃO: Todos os botões de write ficam DESABILITADOS
   - "🔒 Ativar edição para habilitar ações"

2. OPT-IN: Usuário clica em toggle "Habilitar edições"
   - Banner âmbar aparece: "Modo edição ativo — ações afetam o ML diretamente"

3. CONFIRMAÇÃO: Modal com detalhes da ação
   - Mostra preço antes / preço depois
   - Mostra "Você recebe" antes / depois

4. OTP: Código 6 dígitos via email/SMS
   - actionType: "promo_change" | "promo_create" | "promo_delete"
```

### 5.4 Filtros Avançados (nova API params)

```typescript
interface PromoFilters {
  status?:       'started' | 'pending' | 'finished' | 'paused'
  type?:         PromoType
  dateFrom?:     string
  dateTo?:       string
  discountMin?:  number   // % mínimo
  discountMax?:  number   // % máximo
  hasMarginRisk?: boolean // apenas itens com margem abaixo do threshold
}
```

---

## 6. APIs a Implementar (FASE 2)

### 6.1 Nova Rota: `/api/mercadolivre/promocoes/itens-em-promocao`
```typescript
// GET — Todos os itens atualmente em qualquer promoção
// Faz: busca lista de promoções → para cada ativa, busca items
// Combina com custo do produto (Supabase) para calcular margem real
// Retorna: { items: EnhancedPromoItem[] }

interface EnhancedPromoItem {
  mlItemId:      string
  title:         string
  thumbnail:     string
  originalPrice: number
  dealPrice:     number
  discountPct:   number
  promotionId:   string
  promotionName: string
  promotionType: string
  // Calculados no servidor
  commission:    number   // deal_price × commissionRate
  shipping:      number   // por peso ou estimado
  netReceive:    number   // deal_price - commission - shipping
  mlSubsidy?:    number   // subsídio do ML (se DEAL/DOD)
  // Do produto no armazém (se mapeado)
  costPrice?:    number
  realMargin?:   number
  taxAmount?:    number
  isMarginRisk?  boolean
}
```

### 6.2 Nova Rota: `/api/mercadolivre/promocoes/sem-promocao`
```typescript
// GET — Anúncios ativos que não estão em promoção alguma
// Faz: GET /users/{ml_id}/items → filtra os que não aparecem em promoções ativas
// Combina com dados locais para sugestão de preço
// Retorna: { items: ItemWithoutPromo[] }
```

### 6.3 Nova Rota: `/api/mercadolivre/promocoes/bulk-items`
```typescript
// POST — Adiciona múltiplos itens a uma campanha em uma operação
// Body: { promotionId, items: [{item_id, deal_price}] }
// Requer OTP válido no header X-OTP-Token
```

---

## 7. Estrutura TypeScript — Novos Types

```typescript
// Adicionar ao arquivo promocoes/page.tsx ou lib/types/promocoes.ts

type PromoType = 'SELLER_CAMPAIGN' | 'SELLER_COUPON_CAMPAIGN' | 'DEAL' | 'DOD' | 'PRICE_DISCOUNT'
type PromoStatus = 'pending' | 'started' | 'finished' | 'paused'

type NewTabType = 'campanhas-ml' | 'minhas' | 'em-promocao' | 'sem-promocao'

interface BreakdownFinanceiro {
  dealPrice:    number
  commission:   number    // deal_price × rate
  shipping:     number
  netReceive:   number    // deal_price - commission - shipping
  mlSubsidy?:   number    // destaque verde
  costPrice?:   number    // do armazém
  taxAmount?:   number
  packaging?:   number
  realMargin?:  number    // %
  isRisk:       boolean   // margem < threshold
}
```

---

## 8. Priorização FASE 2

| Prioridade | Feature | Complexidade |
|-----------|---------|--------------|
| P1 | "Você recebe" breakdown em todos os itens | Média |
| P1 | OTP para write actions | Baixa (já existe OtpConfirmation component) |
| P1 | Write buttons DESABILITADOS por padrão + opt-in | Baixa |
| P2 | Tab "Sem Promoção" | Alta |
| P2 | MarginSimulator real com pricing engine | Média |
| P2 | KPI cards no topo | Baixa |
| P3 | Filtros avançados | Média |
| P3 | ML subsidy em verde | Baixa |
| P3 | Bulk add de itens | Alta |

---

## 9. Bugs Transversais a Corrigir na FASE 2

1. **B-ML-01:** Loading infinito em Produtos ML, Pedidos, Reputação quando ML não conectado → adicionar timeout 8s + estado "Conecte o ML"
2. **B-PROMO-01:** MarginSimulator usa apenas % de desconto, ignora custo real → integrar pricing engine
3. **B-PROMO-02:** Nenhum tipo de ação requer OTP → adicionar OtpConfirmation em todas as writes
4. **B-PROMO-03:** Tab "Convidado ML" sem ações → adicionar join/leave com breakdown financeiro

---

*Gerado automaticamente via Playwright audit + leitura de código em 2026-03-19*
