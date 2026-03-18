# AUDITORIA ML — GAP ANALYSIS
**Data:** 2026-03-18
**Projeto:** Foguetim ERP
**Escopo:** Integração Mercado Livre — UpSeller vs API oficial vs Foguetim atual

---

## Bloco 1 — Inventário de Referências

### UpSeller — Recursos Mercado Livre

> Fonte: https://www.upseller.com/pt/help (verificado via pesquisa; detalhe interno marcado onde necessário)

#### Integração / OAuth
- Conexão OAuth com conta ML (multi-conta)
- Reconexão / gestão de tokens

#### Anúncios
- Listagem de anúncios com filtros por status, tipo, categoria
- Visualização de métricas por anúncio (visitas, vendas, conversão)
- Edição de título, preço, estoque, fotos, descrição, atributos
- Pausar / reativar anúncios em lote
- Criar anúncio a partir de catálogo ML
- Gestão de variações (cor, tamanho, etc.)
- Diagnóstico de saúde do anúncio (qualidade de título, fotos, atributos)
- Sugestão de categoria ML por produto
- Vinculação ao catálogo oficial ML
- Precificação por anúncio / simulador de margens
- Gestão de fotos (upload, reordenação)

#### Pedidos
- Listagem de pedidos com filtros (status, data, marketplace)
- Detalhamento do pedido (itens, comprador, pagamento, envio)
- Histórico de status do pedido
- Exportação de pedidos CSV/Excel
- Integração com múltiplos canais (ML, Shopee, Amazon) em painel unificado

#### Expedição
- Geração de etiquetas ME1/ME2/Flex
- Código de rastreamento e status de envio
- Impressão em lote de etiquetas
- Alertas de envio atrasado
- Gestão de DANFE
- Geração de NF-e vinculada ao pedido (*verificar extensão na documentação*)

#### Pós-venda / SAC
- Painel centralizado de mensagens pós-venda
- Respostas a mensagens com templates
- Gerenciamento de reclamações (abrir, responder, enviar evidências)
- Acompanhamento de devoluções e estornos
- Mediação (acompanhar status no ML)
- Histórico do cliente (compras anteriores)

#### Reputação / Saúde da Conta
- Dashboard de reputação (cor, nível, métricas)
- Taxa de cancelamento, entrega no prazo, reclamações
- Evolução histórica da reputação
- Alertas de degradação de reputação
- Comparativo com médias do mercado (*verificar*)

#### Promoções / Preços
- Criação de campanhas de desconto no ML
- Adição/remoção de itens em campanhas
- Acompanhamento de promoções ativas
- Reprecificação automática (*verificar se disponível no UpSeller*)
- Calendário de promoções sazonais (*verificar*)

#### Estoque / Mapeamento
- Controle de estoque multicanal
- Mapeamento produto interno ↔ anúncio ML
- Alerta de ruptura de estoque
- Entrada de estoque por NF-e (*verificar extensão*)
- Sincronização automática de estoque entre canais
- Reserva de estoque por pedido pendente

#### Perguntas
- Painel de perguntas pendentes por anúncio
- Resposta rápida com templates
- Filtro por anúncio, data, status (respondida / pendente)
- Sugestão de respostas por IA (*verificar*)

#### Relatórios / Análises
- Relatório de vendas por período, canal, produto
- Faturamento, ticket médio, margem
- Análise de rentabilidade por anúncio
- Top produtos
- Conciliação financeira ML ↔ repasse
- Relatório de publicidade (ADS)
- Exportação de relatórios

---

### API Oficial ML — Capacidades por Área

> Fonte: https://developers.mercadolivre.com.br + references/api-architecture.md

#### Autenticação
- OAuth 2.0 com Authorization Code Flow
- Access token (~6h) + Refresh token (~6 meses)
- Escopo `read`, `write`, `offline_access`
- URL: `https://api.mercadolibre.com/oauth/token`

#### Usuários
- `GET /users/me` — dados do usuário autenticado
- `GET /users/{user_id}` — dados públicos
- `GET /users/{user_id}/addresses` — endereços
- Reputação, status, métricas de vendas

#### Categorias e Atributos
- `GET /sites/MLB/categories` — árvore de categorias
- `GET /categories/{id}` — detalhe
- `GET /categories/{id}/attributes` — atributos obrigatórios/opcionais
- Atributos com `value_id` (pré-definido) ou texto livre
- Categorias-folha apenas para anúncios

#### Anúncios (Items)
- `POST /items` — criar anúncio
- `PUT /items/{id}` — editar (title, price, quantity, status, attributes, variations)
- `GET /items/{id}` — consultar
- `PUT /items/{id}/description` — atualizar descrição
- `POST /items/{id}/pictures` — adicionar fotos
- Status: `active`, `paused`, `closed`, `under_review`, `inactive`
- Tipos: `gold_special` (premium), `gold_pro` (clássico), `gold` (grátis)
- Variações com estoque e preço independentes por variante

#### Catálogo Oficial
- `GET /products/{product_id}` — produto do catálogo
- `POST /items` com `catalog_product_id` — anúncio vinculado ao catálogo
- Fichas técnicas compartilhadas, preço/estoque individuais

#### Estoque e Preço
- Atualização via `PUT /items/{id}` com `price` e `available_quantity`
- Variações: atualizar dentro de `variations[]`
- Fulfillment Full: regras especiais de estoque gerenciado pelo ML

#### Pedidos (Orders)
- `GET /orders/search?seller={id}` — listar pedidos
- `GET /orders/{id}` — detalhar pedido
- Status: `confirmed`, `payment_required`, `payment_in_process`, `paid`, `cancelled`
- Paginação offset/limit

#### Envios (Shipments)
- `GET /shipments/{id}` — detalhes do envio
- `GET /orders/{id}/shipments` — envios de um pedido
- `GET /shipment_labels` — gerar etiqueta PDF/ZPL
- `GET /shipments/{id}/tracking` — rastreamento
- Tipos: ME1 (coleta), ME2 (postagem), Flex, Full

#### Mensagens
- `GET /messages/packs/{pack_id}/sellers/{seller_id}` — ler mensagens
- `POST /messages/packs/{pack_id}/sellers/{seller_id}` — enviar mensagem
- Contexto pós-venda obrigatório
- Moderação automática (links, dados pessoais)

#### Perguntas
- `GET /questions/search?item_id={id}` — perguntas de um anúncio
- `POST /answers` — responder pergunta
- `DELETE /questions/{id}` — deletar (se permitido)
- Respostas definitivas (não editáveis)

#### Pagamentos
- `GET /collections/search?seller_id={id}` — pagamentos recebidos
- `GET /collections/{id}` — detalhe
- Status: `approved`, `pending`, `in_process`, `rejected`, `refunded`
- Gerenciado pelo Mercado Pago

#### Notificações (Webhooks)
- Tópicos: `orders_v2`, `items`, `questions`, `messages`, `payments`, `shipments`
- Payload contém apenas `resource` URL — GET adicional necessário
- Até 3-4 re-tentativas com backoff

#### Moderação
- Status via `GET /items/{id}` → campo `sub_status`
- Motivos: título inadequado, foto proibida, produto restrito, preço suspeito

#### Publicidade (Ads)
- Product Ads via API separada de advertising
- Campanhas, métricas de CPC/impressões (*detalhe: verificar docs específicos de Ads*)

---

## Bloco 2 — Raio-X do Foguetim

### O que existe e funciona 🟢

**APIs ML (57 arquivos em `/app/api/mercadolivre/`):**

| Área | Endpoints | Obs |
|------|-----------|-----|
| OAuth/Auth | `/callback`, `/refresh`, `/status`, `/connections`, `/disconnect` | Funcional, multi-conta, auto-refresh 5min antes de expirar |
| Anúncios | `GET /items/{id}`, `POST /items`, `PATCH /items/{id}`, `POST /items/bulk-action` | Criar, editar, pausar/reativar em lote |
| Imagens | `POST /items/{id}/pictures`, `POST /items/{id}/upload-image` | Upload + substituição |
| Categorias | `/categories`, `/categories/[id]/children`, `/categories/[id]/attributes`, `/categories/suggest` | Completo |
| Sincronização | `POST /listings/sync` → ML → `ml_listings` (local) | Leitura pura, manual |
| Pedidos | `GET /orders` | Listagem com paginação |
| Envios | `GET /shipments/{id}`, `/shipments/{id}/label`, `/shipments/{id}/danfe`, `/shipments/labels/batch` | Etiquetas, DANFE, rastreio |
| Mensagens | `GET + POST /messages/{pack_id}` | Ler + responder pós-venda |
| Perguntas | `GET + POST /questions` | Listar + responder |
| Reclamações | `GET /reclamacoes/{id}`, `POST /reclamacoes/{id}/evidencia` | Ler + enviar evidência |
| Reputação | `GET /reputacao`, `GET /saude`, `GET /performance` | Funcional |
| Promoções | `POST /promocoes/criar`, `DELETE /promocoes/{id}`, `/promocoes/item` (POST/DELETE) | CRUD completo com validação |
| Financeiro | `GET /conciliacao`, `GET /financeiro`, `GET /billing/{period}` | Funcional |
| Analytics | `GET /metrics`, `GET /vendas-por-anuncio`, `GET /concorrentes` | Funcional |
| Packs | `GET /packs/{id}` | Funcional |
| Estoque local | `GET /estoque` | Visualização (dados locais) |
| Mapeamentos | GET, POST, DELETE `/api/armazem/mapeamentos` + auto-suggest | Vínculo local, sem write ML |

**Módulo Armazém:**
- Sincronização ML→armazém via `ml_listings` (upsert local) 🟢
- Auto-suggest por SKU/EAN (leitura pura) 🟢
- `warehouse_product_mappings` com `mapping_status` 🟢
- Token auto-refresh em `lib/mercadolivre.ts` 🟢
- Multi-conta (tabela `marketplace_connections`, `is_primary`) 🟢
- Activity logging em todas as operações de write 🟢
- Rate-limiting por endpoint (1s/user para edição, 150ms entre batches) 🟢
- Validação de payload no frontend + backend 🟢

---

### O que existe parcialmente 🟡

| Item | Status | O que falta |
|------|--------|-------------|
| Webhook processor | Arquivo existe (`lib/ml/webhook-processor.ts`), sem consumer ativo | Endpoint receptor + fila assíncrona + subscribe no ML |
| Pós-venda unificado | Mensagens e reclamações em módulos separados | Painel único centralizado (como UpSeller) |
| Moderação de anúncios | `sub_status` não tem tratamento específico | Alertas + ações de remoderação |
| Catálogo oficial ML | API disponível | Fluxo de vinculação via UI não implementado |
| Perguntas | API existe | Painel com templates de resposta, filtros avançados |
| Publicidade (Ads) | `GET /ads/items/{id}`, `GET /ads/campaigns/{id}` | Gestão de campanhas, métricas consolidadas |
| Histórico do comprador | Pedidos listados | Painel CRM por cliente |
| Notas de Entrada (NF-e XML) | Implementado no Bloco 3 | *Verificar se `fast-xml-parser` está instalado pós-hotfix* |

---

### O que é scaffold / fake 🟡⚫

| Página | Status | Obs |
|--------|--------|-----|
| `/dashboard/armazem/mapeamentos` | Scaffold → Funcional (Bloco 3) | Implementado |
| `/dashboard/armazem/movimentacoes` | Scaffold → Funcional (Bloco 3) | Implementado |
| `/dashboard/armazem/notas-entrada` | Beta implementado (Bloco 3) | Admin only, badge BETA |
| Reprecificação automática | ⚫ Não existe | Seria opt-in, ainda não planejado |
| Webhooks de notificação | ⚫ Não existe (receptor) | Crítico para tempo real |

---

### O que não existe ⚫

| Recurso | Prioridade | Impacto |
|---------|-----------|---------|
| Sincronização Armazém → ML (estoque/preço) | 🔴 Alta | Armazém não atualiza ML automaticamente |
| Webhooks de notificação do ML | 🔴 Alta | Dados desatualizados até sync manual |
| Reprecificação automática | 🟡 Média | Nice-to-have, opt-in |
| Reserva de estoque por pedido pendente | 🟡 Média | Evita overselling |
| CRM de clientes (histórico por comprador) | 🟡 Média | Painel unificado por cliente |
| Calendário de promoções sazonais | 🟢 Baixa | Analytics avançado |
| Sugestão de respostas por IA (perguntas/msgs) | 🟢 Baixa | Automação pós-venda |
| Vinculação ao catálogo oficial ML (UI) | 🟡 Média | Diferencial competitivo |
| Painel unificado de SAC (msgs + reclamações + perguntas) | 🟡 Média | UX relevante |

---

### Riscos de write acidental 🔴

**Análise:** Todos os endpoints de write do ML têm proteções implementadas. Nenhum risco imediato identificado.

| Endpoint | Proteções | Status |
|----------|-----------|--------|
| `POST /items` | Validação de campos obrigatórios, confirmação no modal | 🟢 Seguro |
| `PATCH /items/{id}` | Rate-limit 1s/user, validação por campo, log | 🟢 Seguro |
| `POST /items/bulk-action` | Modal de confirmação, max 200 items, delay 300ms/item | 🟢 Seguro |
| `POST /messages/{pack_id}` | Validação de corpo, confirmação UI | 🟢 Seguro |
| `POST /promocoes/criar` | Validação de datas, confirmação, log | 🟢 Seguro |
| `POST /answers` | Confirmação UI | 🟢 Seguro |
| `POST /reclamacoes/{id}/evidencia` | Upload com validação MIME | 🟢 Seguro |
| `DELETE /connections` | Verifica ownership | 🟢 Seguro |
| Auto-suggest mapeamentos | **Somente leitura** — sem side effects | 🟢 Seguro |

> **Nenhum write automático identificado.** Toda operação exige ação explícita do usuário.

---

### Duplicações e acoplamentos ⚠️

#### Nomenclaturas inconsistentes (baixo risco, manutenção)

| Contexto | Variação encontrada | Recomendação |
|----------|---------------------|--------------|
| Pasta de rotas | `app/api/mercadolivre/` (sem underscore) | Manter (convenção de URL) |
| Campo `channel` em `warehouse_product_mappings` | `'mercado_livre'` (snake_case) | Padronizar com enum SQL |
| Variável de ambiente | `ML_APP_ID`, `ML_CLIENT_SECRET` | Consistente, OK |
| Funções/serviços | `getMLConnection()`, `mlFetch()` | Consistente, OK |

**Risco:** Baixo — não causa bug, mas pode confundir em queries SQL que filtram por `channel = 'mercado_livre'` vs `channel = 'mercadolivre'`.

#### Acoplamentos
- ✅ **BEM SEPARADO:** `/app/api/armazem/` não chama ML diretamente
- ✅ `warehouse_product_mappings` são vínculos locais puros
- ✅ `lib/ml/` isolado com serviços específicos
- ⚠️ `lib/mercadolivre.ts` na raiz de lib (poderia estar em `lib/ml/`) — cosmético

---

### Ponte Armazém ↔ ML (estado atual)

```
ESTADO ATUAL (2026-03-18)

ML API ────(sync manual)────► ml_listings (local cache)
                                    │
                           auto-suggest (leitura)
                                    │
                                    ▼
warehouse_products ◄──── warehouse_product_mappings ────► ml_listings
       │                    (vínculo local apenas)
       │
  warehouse_inventory
  warehouse_stock_movements

FLUXO REVERSO: ❌ NÃO IMPLEMENTADO
warehouse_inventory → ML (atualizar available_quantity) = NÃO EXISTE
```

**O que funciona:**
- Sincronização **unidirecional** ML → local (manual, botão)
- Mapeamento local (warehouse_product ↔ ml_listing) funcional
- Auto-suggest por SKU/EAN funcional (read-only)

**O que não funciona:**
- Quando estoque do armazém muda → ML não é notificado
- Quando preço do armazém muda → ML não é notificado
- Sem opt-in de automação implementado

---

## Bloco 3 — Matriz GAP

> Legenda: ✅ Completo | 🟡 Parcial | 🔴 Scaffold | ⚫ Inexistente | ⚠️ Risco

| Recurso | UpSeller tem? | API ML suporta? | Foguetim tem? | Status | Prioridade | Obs |
|---------|:---:|:---:|:---:|--------|:---:|-----|
| **INTEGRAÇÃO / AUTH** | | | | | | |
| OAuth 2.0 + connect | ✅ | ✅ | ✅ | Completo | — | Multi-conta suportado |
| Refresh token automático | ✅ | ✅ | ✅ | Completo | — | Auto-refresh 5min antes |
| Multi-conta ML | ✅ | ✅ | ✅ | Completo | — | `is_primary` implementado |
| Desconexão/revogação | ✅ | ✅ | ✅ | Completo | — | |
| **ANÚNCIOS** | | | | | | |
| Listar anúncios com filtros | ✅ | ✅ | ✅ | Completo | — | `ml_listings` + sync |
| Editar anúncio (title/price/qty) | ✅ | ✅ | ✅ | Completo | — | Com rate-limit e log |
| Pausar / reativar (bulk) | ✅ | ✅ | ✅ | Completo | — | Max 200 items |
| Criar anúncio | ✅ | ✅ | ✅ | Completo | — | |
| Gestão de fotos | ✅ | ✅ | ✅ | Completo | — | Upload + substituição |
| Saúde do anúncio | ✅ | Parcial | ✅ | Completo | — | `listing-health.service.ts` |
| Variações de anúncio | ✅ | ✅ | 🟡 | Parcial | Média | API existe, UI parcial |
| Catálogo oficial ML | ✅ | ✅ | 🟡 | Parcial | Média | API existe, UI não |
| Diagnóstico / qualidade | ✅ | Parcial | 🟡 | Parcial | Baixa | Sem painel dedicado |
| Moderação (sub_status) | ✅ | ✅ | 🟡 | Parcial | Média | Dados disponíveis, sem alertas específicos |
| **PEDIDOS** | | | | | | |
| Listar pedidos com filtros | ✅ | ✅ | ✅ | Completo | — | |
| Detalhar pedido | ✅ | ✅ | ✅ | Completo | — | |
| Exportar pedidos CSV | ✅ | ✅ | 🟡 | Parcial | Média | Verificar UI de export |
| Painel unificado multicanal | ✅ | ✅ | ⚫ | Inexistente | Alta | Shopee ainda não integrado |
| Histórico por comprador (CRM) | ✅ | ✅ | ⚫ | Inexistente | Média | Backlog |
| **EXPEDIÇÃO** | | | | | | |
| Gerar etiqueta ME1/ME2 | ✅ | ✅ | ✅ | Completo | — | |
| Etiqueta em lote | ✅ | ✅ | ✅ | Completo | — | |
| DANFE | ✅ | ✅ | ✅ | Completo | — | |
| Rastreamento de envio | ✅ | ✅ | ✅ | Completo | — | |
| Alerta de envio atrasado | ✅ | ✅ | ⚫ | Inexistente | Média | Precisa lógica de prazo |
| Flex / Full específico | ✅ | ✅ | 🟡 | Parcial | Baixa | Básico implementado |
| **PÓS-VENDA / SAC** | | | | | | |
| Mensagens pós-venda | ✅ | ✅ | ✅ | Completo | — | |
| Responder perguntas pré-venda | ✅ | ✅ | ✅ | Completo | — | |
| Gerenciar reclamações | ✅ | ✅ | ✅ | Completo | — | Ler + enviar evidência |
| Painel unificado SAC | ✅ | ✅ | ⚫ | Inexistente | Média | Msgs + reclamações + perguntas separados |
| Templates de resposta | ✅ | N/A | ⚫ | Inexistente | Baixa | Armazenamento local |
| Sugestão de resposta por IA | ✅ | N/A | ⚫ | Inexistente | Baixa | Backlog |
| Histórico do comprador | ✅ | ✅ | ⚫ | Inexistente | Média | Backlog |
| **REPUTAÇÃO / SAÚDE** | | | | | | |
| Dashboard de reputação | ✅ | ✅ | ✅ | Completo | — | |
| Métricas (cancelamento, prazo) | ✅ | ✅ | ✅ | Completo | — | |
| Alerta de degradação | ✅ | ✅ | 🟡 | Parcial | Média | Dados existem, sem alert proativo |
| **PROMOÇÕES / PREÇOS** | | | | | | |
| Criar campanha de desconto | ✅ | ✅ | ✅ | Completo | — | Validação de datas (max 14d) |
| Adicionar/remover itens em promoção | ✅ | ✅ | ✅ | Completo | — | |
| Cancelar promoção | ✅ | ✅ | ✅ | Completo | — | |
| Reprecificação automática (regras) | ✅ | ✅ | ⚫ | Inexistente | Baixa | Backlog — opt-in obrigatório |
| **ESTOQUE / MAPEAMENTO** | | | | | | |
| Cache local de anúncios (`ml_listings`) | ✅ | ✅ | ✅ | Completo | — | Sync manual |
| Mapeamento produto ↔ anúncio | ✅ | N/A | ✅ | Completo | — | `warehouse_product_mappings` |
| Auto-suggest por SKU/EAN | ✅ | N/A | ✅ | Completo | — | Read-only, confirmação manual |
| Auto-mapear em lote | ✅ | N/A | ✅ | Completo | — | Bloco 3 |
| Sincronização Armazém → ML (estoque) | ✅ | ✅ | ⚫ | Inexistente | **Alta** | **Gap crítico** |
| Sincronização Armazém → ML (preço) | ✅ | ✅ | ⚫ | Inexistente | Alta | **Gap crítico** |
| Opt-in de automação por produto | ✅ | N/A | ⚫ | Inexistente | Alta | Pré-requisito da sincronização |
| Reserva de estoque (pedido pendente) | ✅ | N/A | ⚫ | Inexistente | Média | Anti-overselling |
| Alerta de ruptura | ✅ | N/A | ✅ | Completo | — | Bloco 2 |
| **RELATÓRIOS / ANÁLISES** | | | | | | |
| Vendas por período/produto | ✅ | ✅ | ✅ | Completo | — | |
| Conciliação financeira | ✅ | ✅ | ✅ | Completo | — | |
| Analytics por anúncio | ✅ | ✅ | ✅ | Completo | — | |
| Análise de concorrentes | ✅ | ✅ | ✅ | Completo | — | |
| Publicidade / Ads metrics | ✅ | ✅ | 🟡 | Parcial | Média | Leitura, sem gestão de campanhas |
| Exportação CSV/Excel | ✅ | N/A | 🟡 | Parcial | Média | Verificar cobertura |
| **NOTIFICAÇÕES / WEBHOOKS** | | | | | | |
| Webhooks do ML (orders/items/msgs) | ✅ | ✅ | ⚫ | Inexistente | **Alta** | Dados sempre desatualizados sem isso |
| NF-e / XML de entrada | ✅ | N/A | 🟡 | Parcial (BETA) | Média | Admin only, Bloco 3 |
| **ARMAZÉM** | | | | | | |
| Cadastro de produtos com SKU | N/A | N/A | ✅ | Completo | — | Bloco 2 |
| Múltiplos armazéns | N/A | N/A | ✅ | Completo | — | Bloco 2 |
| Localizações (prateleiras) | N/A | N/A | ✅ | Completo | — | Bloco 2 |
| Movimentações manuais (10 tipos) | N/A | N/A | ✅ | Completo | — | Bloco 2 |
| Transferência entre armazéns | N/A | N/A | ✅ | Completo | — | Bloco 3 |
| Log completo de movimentações | N/A | N/A | ✅ | Completo | — | Bloco 3 |

---

## Bloco 4 — Plano de Ação

### 1. Corrigir antes da Shopee (bloqueante)

Estes itens devem ser resolvidos **antes** de iniciar a integração Shopee, pois são fundacionais:

#### 1.1 Nomenclaturas — campo `channel` no banco
- **Problema:** `channel = 'mercado_livre'` (snake_case) mas pasta é `mercadolivre` (sem underscore). Ao adicionar Shopee, isso se multiplica.
- **Ação:** Criar enum SQL em `marketplace_connections` e `warehouse_product_mappings`:
  ```sql
  CREATE TYPE marketplace_channel AS ENUM ('mercado_livre', 'shopee', 'amazon', 'magalu');
  ```
  Garantir que todos os inserts/queries usam a mesma forma.
- **Risco se não corrigir:** Baixo — mas vai causar bugs silenciosos quando Shopee usar `channel = 'shopee'` e queries filtrarem por string.

#### 1.2 Opt-in de automação por produto/canal (arquitetura)
- **Problema:** Não existe flag para o usuário dizer "quando estoque mudar no armazém, atualizar ML automaticamente".
- **Ação:** Adicionar campo `auto_sync_stock boolean default false` e `auto_sync_price boolean default false` em `warehouse_product_mappings`.
- **Isso é pré-requisito** da sincronização reversa. Sem o opt-in, a sincronização não pode ser segura.

#### 1.3 Verificar `fast-xml-parser` instalado
- **Contexto:** Build do Vercel falhou por ausência desta lib. Foi instalada via hotfix.
- **Ação:** Confirmar que `package.json` e `package-lock.json` estão commitados com a lib.

---

### 2. Completar para ML maduro (importante)

#### 2.1 Sincronização Armazém → ML (🔴 Gap crítico)
- **Problema:** Quando estoque no armazém muda (venda, ajuste, entrada), o ML não é atualizado.
- **Solução arquitetural:**
  ```
  warehouse_stock_movements INSERT
       └─► trigger / job
               └─► verificar warehouse_product_mappings com auto_sync_stock = true
                       └─► PUT /api/mercadolivre/items/{item_id}
                               { available_quantity: nova_qty }
  ```
- **Implementação sugerida:**
  - Job leve rodando a cada 5 min (Vercel Cron / Supabase Edge Function)
  - Ou trigger via Supabase Database Webhooks → Edge Function → `PUT /items/{id}`
  - **NUNCA automático sem `auto_sync_stock = true` no mapeamento**
  - Log de cada sincronização em tabela `sync_log`

#### 2.2 Webhooks do ML (🔴 Gap crítico)
- **Problema:** Sem receptor de webhooks, o Foguetim nunca sabe que houve venda, pergunta nova ou reclamação em tempo real.
- **Solução:**
  ```
  POST /api/webhooks/mercadolivre
       └─► validar X-Signature do ML
       └─► responder 200 imediatamente
       └─► inserir em fila (tabela webhook_queue ou Supabase Edge Queue)
       └─► processar assincronamente:
               orders_v2  → GET /orders/{id} → atualizar local
               items      → GET /items/{id} → atualizar ml_listings
               questions  → GET /questions/{id} → notificar usuário
               messages   → notificar usuário
               payments   → GET /collections/{id} → atualizar local
  ```
- **Configurar no painel de apps ML:** URL de callback = `https://foguetim.vercel.app/api/webhooks/mercadolivre`

#### 2.3 Reserva de estoque por pedido pendente
- **Problema:** Produto com estoque=1 pode ser comprado duas vezes se dois pedidos chegarem simultaneamente.
- **Solução:** Campo `reserved_qty` em `warehouse_inventory` já existe (Bloco 1). Falta a lógica que incrementa `reserved_qty` ao receber pedido e decrementa ao confirmar despacho.
- **Depende de:** Webhooks (item 2.2)

#### 2.4 Painel SAC unificado
- **Problema:** Mensagens, perguntas e reclamações estão em 3 páginas separadas.
- **Solução:** `/dashboard/sac` unificado com abas (Mensagens / Perguntas / Reclamações), ordenado por urgência.
- **Prioridade:** Média — UX relevante para operações com volume.

#### 2.5 Alertas proativos de reputação
- **Problema:** Dados existem mas sem alerta quando a reputação degrada.
- **Solução:** Badge/toast no header quando reputação cai de cor, ou card em `/dashboard` com status atual.

#### 2.6 Variações e Catálogo (UI completo)
- **Problema:** API de variações existe, UI parcial. Catálogo oficial ML sem fluxo de vinculação.
- **Ação:** Completar drawer de variações na edição de anúncio + fluxo "Vincular ao catálogo ML".

---

### 3. Ponte Armazém ↔ ML — Arquitetura final

```
┌─────────────────── FOGUETIM ERP ────────────────────────┐
│                                                          │
│  warehouse_products ──┐                                  │
│  warehouse_inventory  │                                  │
│  warehouse_movements  │                                  │
│         │             │                                  │
│         │        warehouse_product_mappings              │
│         │         ├── auto_sync_stock: bool (opt-in)     │
│         │         ├── auto_sync_price: bool (opt-in)     │
│         │         └── marketplace_item_id → ml_listings  │
│         │                    │                           │
│    [Cron/Trigger]             │                           │
│         │                    │                           │
└─────────┼────────────────────┼───────────────────────────┘
          │                    │
          ▼ (write, opt-in)    ▼ (read, always)
  PUT /items/{id}         GET /items/{id}
  { available_quantity }  (sync manual ou webhook)
          │                    │
          └──────┬─────────────┘
                 ▼
           ML API (mercadolibre.com)
```

**Princípios inegociáveis:**
1. **Armazém é a fonte de verdade** — ML recebe os dados do armazém, nunca o contrário para estoque
2. **Opt-in explícito por produto/mapeamento** — `auto_sync_stock` e `auto_sync_price` são `false` por padrão
3. **Log de toda sincronização** — tabela `sync_log` com status, timestamp, payload
4. **Retry com backoff** — falha na API do ML não pode quebrar o fluxo do armazém
5. **Mesmo padrão para Shopee** — `channel = 'shopee'`, mesmo campo `auto_sync_stock`, mesmo job

**Tabelas adicionais necessárias:**
```sql
-- Adicionar em warehouse_product_mappings:
ALTER TABLE warehouse_product_mappings
  ADD COLUMN auto_sync_stock boolean DEFAULT false,
  ADD COLUMN auto_sync_price boolean DEFAULT false,
  ADD COLUMN last_sync_at    timestamptz,
  ADD COLUMN last_sync_error text;

-- Nova tabela de log de sincronização:
CREATE TABLE sync_log (
  id           bigserial PRIMARY KEY,
  user_id      uuid,
  mapping_id   bigint,
  direction    text,        -- 'armazem_to_ml', 'ml_to_armazem'
  field        text,        -- 'stock', 'price'
  old_value    text,
  new_value    text,
  status       text,        -- 'success', 'error', 'skipped'
  error_msg    text,
  created_at   timestamptz DEFAULT now()
);
```

---

### 4. Backlog Futuro (nice-to-have)

| Item | Inspiração | Esforço | Impacto |
|------|-----------|---------|---------|
| Reprecificação automática por regra (margem mínima, concorrente) | UpSeller | Alto | Alto |
| Sugestão de resposta por IA (perguntas/mensagens) | UpSeller | Médio | Médio |
| Templates de resposta salvos por usuário | UpSeller | Baixo | Médio |
| CRM de clientes (histórico de compras por CPF/e-mail) | UpSeller | Alto | Médio |
| Calendário de promoções sazonais (Black Friday, etc.) | UpSeller | Médio | Médio |
| Alerta de perguntas sem resposta (>Xh) | UpSeller | Baixo | Alto |
| Gestão de campanhas de Ads (Product Ads ML) | UpSeller | Alto | Médio |
| Dashboard comparativo ML vs Shopee vs Amazon | — | Médio | Alto |
| Exportação avançada de relatórios (Excel, filtros) | UpSeller | Médio | Médio |
| Moderação proativa (avisos de anúncio em risco) | — | Médio | Alto |
| Score de qualidade de anúncio com sugestões | UpSeller | Alto | Alto |
| Catálogo oficial ML com vinculação em lote | UpSeller | Alto | Alto |
| Integração Mercado Pago direta (além de conciliação) | UpSeller | Alto | Médio |

---

## Resumo Executivo

| Dimensão | Status | Nota |
|----------|--------|------|
| Autenticação ML | 🟢 Sólido | Multi-conta, auto-refresh, desconexão |
| Anúncios (CRUD) | 🟢 Funcional | Criar, editar, pausar, bulk |
| Pedidos | 🟢 Funcional | Listagem + detalhe |
| Expedição | 🟢 Funcional | Etiquetas, DANFE, rastreio |
| Pós-venda (msgs/reclamações) | 🟢 Funcional | Separado em 3 módulos |
| Reputação/Saúde | 🟢 Funcional | Dashboard completo |
| Promoções | 🟢 Funcional | CRUD completo |
| Analytics/Financeiro | 🟢 Funcional | Conciliação, métricas |
| Módulo Armazém | 🟢 Funcional | Blocos 1+2+3 concluídos |
| Mapeamento Armazém↔ML | 🟢 Funcional | Vínculo local + auto-suggest |
| **Sincronização Armazém→ML** | 🔴 Gap crítico | Estoque não flui para o ML |
| **Webhooks do ML** | 🔴 Gap crítico | Sem receptor de eventos |
| Shopee-ready (arquitetura) | 🟡 Parcial | Falta enum de canais e opt-in |
| Segurança / Writes ML | 🟢 Sólido | Nenhum write automático |

**Pronto para Shopee após:** Corrigir items 1.1 (enum channel), 1.2 (opt-in de sync) e 1.3 (fast-xml-parser). Os demais podem ser feitos em paralelo com a integração Shopee.
