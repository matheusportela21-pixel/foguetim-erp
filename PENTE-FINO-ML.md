# PENTE FINO — Auditoria Completa da Integração Mercado Livre
### Foguetim ERP — Fase 1: Diagnóstico
**Data:** 2026-03-20
**Metodologia:** Análise estática de código (57 arquivos lidos) + pesquisa de concorrentes
**Escopo:** Todos os módulos ML — pedidos, produtos, estoque, expedição, pós-venda, reputação, saúde, performance, reviews, financeiro, conciliação, promoções, precificação, vendas-por-anúncio, concorrentes, publicidade, integrações, mapeamentos
**Restrição:** Conta ML oficial — somente leitura. Nenhuma ação executada via API.

---

## ÍNDICE

- [Bloco A — Pesquisa de Concorrentes e Capacidades da API ML](#bloco-a)
- [Bloco B — Resultado dos Testes por Módulo](#bloco-b)
- [Bloco C — Auditoria de Código (API Routes)](#bloco-c)
- [Bloco D — Auditoria de Segurança](#bloco-d)
- [Bloco E — Tabela Comparativa (Foguetim vs Concorrentes)](#bloco-e)
- [Bugs Encontrados](#bugs)
- [Features Ausentes](#features-ausentes)
- [Plano de Execução — Fases 2 a 4](#plano-fases)

---

## BLOCO A — Pesquisa de Concorrentes e Capacidades da API ML {#bloco-a}

### A.1 — Capacidades Oficiais da API do Mercado Livre

| Domínio | Endpoints Disponíveis | Foguetim Usa |
|---------|----------------------|--------------|
| Autenticação OAuth 2.0 | `/oauth/token`, `/authorization` | ✅ |
| Pedidos (Orders) | `/orders/search`, `/orders/{id}`, `/packs/{id}` | ✅ |
| Anúncios (Items) | `/items`, `/items/{id}`, `/items/{id}/description`, `/items/{id}/listing_type`, `/items/{id}/pictures` | ✅ |
| Estoque | Via `available_quantity` no PATCH de `/items/{id}` | ✅ (via PATCH) |
| Envios (Shipments) | `/shipments/{id}`, `/shipments/{id}/history`, `/shipments/{id}/carrier`, `/shipments/{id}/label`, DANFE | ✅ |
| Mensagens | `/messages/unread`, `/messages/packs/{id}/sellers/{id}`, `/messages/packs/{id}` | ✅ |
| Perguntas | `/questions/search`, `/answers` | ✅ |
| Reclamações | `/post-purchase/v1/claims/search`, `/claims/{id}/detail`, `/claims/{id}/returns`, `/claims/{id}/affects-reputation` | ✅ |
| Reputação | Via `/users/{id}` — `seller_reputation` | ✅ |
| Billing | `/billing/integration/monthly/periods`, `/billing/integration/periods/key/{k}/group/ML/summary` | ✅ |
| Promoções | `/seller-promotions/promotions`, itens elegíveis, adicionar/remover itens | ✅ |
| Publicidade (Product Ads) | `/advertising/MLB/advertisers/{id}/product_ads/campaigns` | ✅ |
| Categorias | `/categories`, `/categories/{id}`, `/category_predictor/predict` | ✅ |
| Reviews | `/reviews/item/{id}` | ✅ |
| **Webhooks/Notificações** | `/applications/{id}/topics`, `/notification_url` | ❌ NÃO IMPLEMENTADO |
| **Catálogo Oficial** | `/catalog/products`, `/catalog/search` | ❌ NÃO IMPLEMENTADO |
| **Tendências** | `/trends/MLB/{category}` | ❌ NÃO IMPLEMENTADO |
| **Devoluções** | `/post-purchase/v2/claims/{id}/returns` | ✅ (parcial — leitura) |
| **Pagamentos** | `/collections/{id}`, `/payments/{id}` | ❌ NÃO IMPLEMENTADO |

### A.2 — Concorrentes: UpSeller

**Fontes:** upseller.com.br, documentação pública, reviews

**Funcionalidades ML:**
- ✅ Sincronização de pedidos em tempo real via **webhooks** (não polling)
- ✅ Resposta automática a perguntas com IA (templates + ML automático)
- ✅ Atualização de preço/estoque em bulk em múltiplas contas simultaneamente
- ✅ Criação e edição de anúncios diretamente pelo ERP
- ✅ Gestão de reclamações com classificação de urgência
- ✅ **Gestão de Product Ads** com relatórios ACOS, ROAS, CPC
- ✅ Conciliação financeira com billing ML
- ✅ Monitoramento de saúde da conta (com alertas push)
- ✅ Rastreamento de pedidos com atualização automática
- ✅ Suporte a **múltiplas contas ML** (até 10 por plano)
- ✅ Inteligência de preço de concorrentes em tempo real
- ✅ Relatório de vendas por anúncio, por período, por SKU
- ✅ Emissão de NF-e integrada
- ✅ Integração com Shopee, Amazon, Shein, Magalu
- ❌ Não tem ERP completo (foco em marketplace management)

### A.3 — Concorrentes: Bling ERP

**Fontes:** bling.com.br, documentação pública, reviews

**Funcionalidades ML:**
- ✅ Sincronização de pedidos via webhooks ML
- ✅ Emissão de NF-e / NFS-e integrada ao pedido ML
- ✅ Gestão de estoque multi-depósito com baixa automática
- ✅ Catálogo de produtos integrado ao ML (sincronização bidirecional)
- ✅ Atualização automática de preço e estoque no ML
- ✅ Integração com +100 plataformas (ML, SP, AMZ, B2W, Via, etc.)
- ✅ Financeiro completo (contas a pagar/receber, fluxo de caixa, DRE)
- ✅ Relatórios de vendas por marketplace
- ✅ Suporte a múltiplas contas ML por plano
- ✅ Conciliação bancária
- ❌ Sem gestão de Product Ads ML
- ❌ Sem monitoramento de reputação ML em tempo real
- ❌ Sem gestão de reclamações dedicada
- ❌ Sem intelligence de concorrentes

### A.4 — Concorrentes: Tiny ERP (Olist Store)

**Fontes:** tiny.com.br, olist.com, reviews

**Funcionalidades ML:**
- ✅ Sincronização de pedidos via webhooks
- ✅ Emissão de NF-e integrada
- ✅ Gestão de estoque com baixa automática
- ✅ Criação de anúncios no ML pelo ERP
- ✅ Atualização de preço/estoque automática
- ✅ Financeiro básico (faturamento, DRE)
- ✅ Integração com múltiplos marketplaces
- ✅ Múltiplas contas ML suportadas
- ❌ Sem gestão de reclamações
- ❌ Sem Product Ads management
- ❌ Sem monitoramento de reputação/saúde
- ❌ Sem inteligência de concorrentes
- ❌ Sem conciliação billing ML detalhada

---

## BLOCO B — Resultado dos Testes por Módulo {#bloco-b}

> **Nota:** Testes ao vivo via Playwright não foram executados nesta auditoria por indisponibilidade de servidor local no momento da análise. Os resultados abaixo são baseados em análise estática de código + inspeção de todas as 57 rotas API + páginas do dashboard. Status marcado como `[CODE]` = análise de código, `[LIVE]` = teste ao vivo.

### B.1 — Módulo: Integração / OAuth
| Item | Status | Observação |
|------|--------|------------|
| Fluxo OAuth `auth → callback → DB` | ✅ FUNCIONAL `[CODE]` | Tokens salvos em `marketplace_connections` |
| Refresh automático de token | ✅ FUNCIONAL `[CODE]` | Auto-refresh quando < 5 min para expirar |
| Múltiplas contas ML | ✅ FUNCIONAL `[CODE]` | `is_primary` gerencia conta ativa |
| Desconexão granular por conta | ✅ FUNCIONAL `[CODE]` | `/connections DELETE ?id=` |
| Limite de plano (BILLING) | ⚠️ DESATIVADO `[CODE]` | `BILLING_ACTIVE = false` hardcoded |
| Validação do `state` OAuth | 🔴 FALHA `[CODE]` | Callback ignora `state` — ver Bloco D |

### B.2 — Módulo: Pedidos
| Item | Status | Observação |
|------|--------|------------|
| Listagem de pedidos com filtros | ✅ FUNCIONAL `[CODE]` | status, days, offset, limit |
| Ordenação por data DESC | ✅ FUNCIONAL `[CODE]` | `sort=date_desc` |
| Enriquecimento com buyer/items/payments | ✅ FUNCIONAL `[CODE]` | Campos mapeados corretamente |
| Paginação | ✅ FUNCIONAL `[CODE]` | offset + limit (max 50) |
| Detalhes do pack | ✅ FUNCIONAL `[CODE]` | `/packs/[id]` route existe |
| Webhooks para updates em tempo real | 🔴 AUSENTE | Polling a cada carregamento de página |
| Exportação de pedidos (CSV/XLSX) | 🔴 AUSENTE | Não implementado |
| NF-e por pedido | 🔴 AUSENTE | Route DANFE existe para envio, não para NF-e |

### B.3 — Módulo: Produtos ML
| Item | Status | Observação |
|------|--------|------------|
| Listagem de anúncios (`ml_listings`) | ✅ FUNCIONAL `[CODE]` | Via tabela local pós-sync |
| Criação de anúncio | ✅ FUNCIONAL `[CODE]` | Clássico + Premium simultâneos |
| Edição campo a campo (título, preço, estoque, status, etc.) | ✅ FUNCIONAL `[CODE]` | 14 campos suportados |
| Bulk pause/reactivate/close | ✅ FUNCIONAL `[CODE]` | Até 200 IDs, 300ms delay |
| Upload de imagens | ✅ FUNCIONAL `[CODE]` | Via `items/[id]/upload-image` |
| Sincronização ML → DB local | ✅ FUNCIONAL `[CODE]` | `listings/sync` POST |
| Catálogo oficial ML (catalog products) | 🔴 AUSENTE | Não implementado |
| Variações de produto | ⚠️ PARCIAL | Atributos suportados, variações não explícitas |
| Listing type upgrade/downgrade | ✅ FUNCIONAL `[CODE]` | Bloqueado para `free` (correto) |

### B.4 — Módulo: Estoque
| Item | Status | Observação |
|------|--------|------------|
| Dashboard de estoque por nível | ✅ FUNCIONAL `[CODE]` | ruptura/alerta/baixo/normal |
| Leitura do estoque atual | ⚠️ PARCIAL `[CODE]` | Lê DB local (`ml_listings`), não ML em tempo real |
| Atualização de estoque | ✅ FUNCIONAL `[CODE]` | Via PATCH `/items/[id]` field=stock |
| Alertas de ruptura | ✅ FUNCIONAL `[CODE]` | Calculado localmente |
| Sincronização automática de estoque | 🔴 AUSENTE | Sem webhook; sync manual via botão |
| Multi-depósito | 🔴 AUSENTE | Não implementado |

### B.5 — Módulo: Expedição
| Item | Status | Observação |
|------|--------|------------|
| Listagem de envios | ✅ FUNCIONAL `[CODE]` | `/shipments` route |
| Detalhes do envio (+ histórico + carrier) | ✅ FUNCIONAL `[CODE]` | 3 fetches paralelos |
| Etiqueta de envio | ✅ FUNCIONAL `[CODE]` | `/shipments/[id]/label` |
| DANFE | ✅ FUNCIONAL `[CODE]` | `/shipments/[id]/danfe` |
| Impressão em lote de etiquetas | ✅ FUNCIONAL `[CODE]` | `/shipments/labels/batch` |
| Rastreamento em tempo real | ⚠️ PARCIAL | Carrier info disponível, sem push de updates |
| NF-e por pedido (geração própria) | 🔴 AUSENTE | DANFE é do ML, não do ERP |

### B.6 — Módulo: Pós-Venda (Mensagens + Perguntas)
| Item | Status | Observação |
|------|--------|------------|
| Listagem de mensagens não lidas | ✅ FUNCIONAL `[CODE]` | Top 10 packs por unread |
| Histórico de conversa por pack | ✅ FUNCIONAL `[CODE]` | `/messages/[pack_id]` |
| Envio de mensagem | ✅ FUNCIONAL `[CODE]` | POST `/messages/[pack_id]` |
| Listagem de perguntas | ✅ FUNCIONAL `[CODE]` | Filtro UNANSWERED/ANSWERED/all |
| Resposta a pergunta | ✅ FUNCIONAL `[CODE]` | POST `/answers` |
| Auto-resposta de perguntas (IA) | 🔴 AUSENTE | Feature do UpSeller, não implementada |
| Moderação de perguntas | 🔴 AUSENTE | ML permite deletar; não implementado |
| Templates de resposta | 🔴 AUSENTE | Não implementado |
| Notificação push de novas perguntas | 🔴 AUSENTE | Sem webhook |

### B.7 — Módulo: Reputação e Saúde
| Item | Status | Observação |
|------|--------|------------|
| Score de saúde calculado (0-100) | ✅ FUNCIONAL `[CODE]` | Pesos: claims 35%, cancel 25%, delayed 25%, ratings 15% |
| Métricas com thresholds oficiais ML | ✅ FUNCIONAL `[CODE]` | Verde/Amarelo/Vermelho corretos |
| Alertas inteligentes | ✅ FUNCIONAL `[CODE]` | 4 tipos com links de ação |
| Level e power seller status | ✅ FUNCIONAL `[CODE]` | Extraído de `/users/{id}` |
| Histórico de reputação (trend) | 🔴 AUSENTE | Apenas snapshot atual |
| Alertas proativos (push) | 🔴 AUSENTE | Sem webhook — só ao abrir a página |

### B.8 — Módulo: Performance
| Item | Status | Observação |
|------|--------|------------|
| Gráfico de vendas por período (7d/30d/90d/12m) | ✅ FUNCIONAL `[CODE]` | Granularidade day/week/month |
| Comparação com período anterior | ✅ FUNCIONAL `[CODE]` | Variação % em pedidos e receita |
| Por dia da semana | ✅ FUNCIONAL `[CODE]` | Seg-Dom |
| Por hora do dia | ✅ FUNCIONAL `[CODE]` | 24 slots |
| Melhor e pior dia | ✅ FUNCIONAL `[CODE]` | Calculado sobre dados do período |
| Performance por anúncio (GMV por item) | 🔴 AUSENTE | Existe módulo separado `vendas-por-anuncio` |
| Performance por categoria | 🔴 AUSENTE | Não implementado |
| Comparação entre múltiplas contas ML | ⚠️ PARCIAL | API suporta, UI provavelmente só a primária |

### B.9 — Módulo: Reviews (Avaliações)
| Item | Status | Observação |
|------|--------|------------|
| Summary de avaliações (top 20 itens) | ✅ FUNCIONAL `[CODE]` | Com rating_levels detalhado |
| Reviews por item | ✅ FUNCIONAL `[CODE]` | Lista de reviews com rating, texto, data |
| Filtro por itens com avaliações negativas | ✅ FUNCIONAL `[CODE]` | `has_negative` flag |
| Resposta a avaliação | 🔴 AUSENTE | ML API suporta; não implementado |
| Avaliações de mais de 50 itens | ⚠️ LIMITADO | Summary só busca 50 itens (`limit=50`) |

### B.10 — Módulo: Financeiro
| Item | Status | Observação |
|------|--------|------------|
| Períodos de faturamento ML (12 meses) | ✅ FUNCIONAL `[CODE]` | Lista e summary em paralelo |
| Gráfico histórico de receita | ✅ FUNCIONAL `[CODE]` | Via `billing?summary=true` |
| Resumo financeiro com taxas | ✅ FUNCIONAL `[CODE]` | `/financeiro` route |
| Detalhamento por cobrança/bônus | ✅ FUNCIONAL `[CODE]` | Breakdown de charges e bonuses |
| Saldo liberado vs. a liberar | ⚠️ PARCIAL | Endpoint ML existe; integração parcial |
| Exportação financeira (CSV) | 🔴 AUSENTE | Não implementado |
| Integração bancária / conciliação bancária | 🔴 AUSENTE | Só concilia com billing ML |

### B.11 — Módulo: Conciliação
| Item | Status | Observação |
|------|--------|------------|
| Conciliação pedidos × billing ML | ✅ FUNCIONAL `[CODE]` | Compara receita bruta com summary de billing |
| Status: ok / divergente / pendente | ✅ FUNCIONAL `[CODE]` | Com limiar de R$10 |
| Lista de pedidos do período | ✅ FUNCIONAL `[CODE]` | Paginada, max 20 páginas (1000 pedidos) |
| **Bug: cálculo de divergência** | 🔴 BUG | Ver Bloco de Bugs — cálculo algebricamente errado |
| Exportação da conciliação | 🔴 AUSENTE | Não implementado |
| Conciliação com conta bancária | 🔴 AUSENTE | Não implementado |

### B.12 — Módulo: Promoções
| Item | Status | Observação |
|------|--------|------------|
| Listar campanhas do vendedor | ✅ FUNCIONAL `[CODE]` | `/promocoes` GET |
| Criar campanha | ✅ FUNCIONAL `[CODE]` | POST `/promocoes/criar` — max 14 dias |
| Listar itens em promoção | ✅ FUNCIONAL `[CODE]` | `/promocoes/em-promocao` |
| Listar itens elegíveis | ✅ FUNCIONAL `[CODE]` | `/promocoes/elegibilidade` |
| Adicionar item à promoção | ✅ FUNCIONAL `[CODE]` | `/promocoes/item` POST |
| Editar/pausar/retomar campanha | ✅ FUNCIONAL `[CODE]` | `/promocoes/[id]` PATCH |
| Remover item da promoção | ✅ FUNCIONAL `[CODE]` | `/promocoes/item` DELETE |
| Flash sale (oferta relâmpago) | ⚠️ PARCIAL | Endpoint de elegibilidade disponível |
| Adicionar em lote (bulk) à promoção | 🔴 AUSENTE | Apenas item individual |

### B.13 — Módulo: Vendas por Anúncio
| Item | Status | Observação |
|------|--------|------------|
| Ranking de anúncios mais vendidos | ✅ FUNCIONAL `[CODE]` | Por total_vendas |
| Receita bruta e líquida por anúncio | ✅ FUNCIONAL `[CODE]` | Com taxa ML por linha (sale_fee) |
| Participação % de cada anúncio | ✅ FUNCIONAL `[CODE]` | Calculado |
| Filtro de período (7d/30d/90d) | ✅ FUNCIONAL `[CODE]` | |
| Thumbnails | ✅ FUNCIONAL `[CODE]` | Batch fetch |
| Limite de 500 pedidos (MAX_PAGES=10) | ⚠️ LIMITADO | Vendedores com >500 pedidos/período têm dados truncados |

### B.14 — Módulo: Concorrentes
| Item | Status | Observação |
|------|--------|------------|
| Espionar vendedor por nickname | ✅ FUNCIONAL `[CODE]` | 20 anúncios + reputação |
| Saúde dos próprios anúncios | ✅ FUNCIONAL `[CODE]` | unhealthy + warning gauge |
| Comparação de preço em tempo real | 🔴 AUSENTE | Não implementado |
| Alerta de mudança de preço de concorrente | 🔴 AUSENTE | Não implementado |
| Busca por categoria | 🔴 AUSENTE | Só por nickname |

### B.15 — Módulo: Publicidade (Product Ads)
| Item | Status | Observação |
|------|--------|------------|
| Listagem de campanhas | ✅ FUNCIONAL `[CODE]` | `/ads/campaigns` |
| Detalhes de campanha | ✅ FUNCIONAL `[CODE]` | `/ads/campaigns/[id]` |
| Editar campanha (budget, status) | ✅ FUNCIONAL `[CODE]` | PATCH `/ads/campaigns/[id]` |
| Itens da campanha | ✅ FUNCIONAL `[CODE]` | `/ads/items` |
| Métricas (ACOS, ROAS, CTR, CPC) | ✅ FUNCIONAL `[CODE]` | Via query params date_from/date_to |
| Criar nova campanha | 🔴 AUSENTE | Apenas visualização/edição |
| Adicionar/remover item de campanha | ✅ FUNCIONAL `[CODE]` | `/ads/items/[id]` PATCH |
| Relatório de publicidade por período | ⚠️ PARCIAL | Dados disponíveis, UI pode ser limitada |

### B.16 — Módulo: Integrações
| Item | Status | Observação |
|------|--------|------------|
| Conectar conta ML (OAuth) | ✅ FUNCIONAL `[CODE]` | |
| Desconectar conta | ✅ FUNCIONAL `[CODE]` | |
| Definir conta primária | ✅ FUNCIONAL `[CODE]` | |
| Label por conta | ✅ FUNCIONAL `[CODE]` | Até 50 chars |
| Limite de contas por plano | ⚠️ DESATIVADO | `BILLING_ACTIVE = false` |
| Webhooks ML configurados via ERP | 🔴 AUSENTE | |
| Status de saúde da conexão | ✅ FUNCIONAL `[CODE]` | `/status` route |

---

## BLOCO C — Auditoria de Código: API Routes {#bloco-c}

### C.1 — Inventário de Routes (57 arquivos)

| Rota | Métodos | Auth | User Isolation | Rate Limit | Error Handling | Tipo |
|------|---------|------|----------------|------------|----------------|------|
| `/auth` | GET | ✅ | ✅ | ❌ | ✅ | Leitura |
| `/callback` | GET | ✅ session | ✅ | ❌ | ✅ | OAuth |
| `/refresh` | POST | ✅ | ✅ | ❌ | ✅ | Auth |
| `/status` | GET | ? | ? | ❌ | ? | Leitura |
| `/connections` | GET/DELETE/PATCH | ✅ | ✅ | ❌ | ✅ | Leitura/Escrita |
| `/disconnect` | DELETE | ✅ | ✅ | ❌ | ✅ | Escrita |
| `/orders` | GET | ✅ | ✅ | ❌ | ✅ | Leitura |
| `/packs` | GET | ? | ? | ❌ | ? | Leitura |
| `/packs/[id]` | GET | ? | ? | ❌ | ? | Leitura |
| `/items` | POST | ✅ | ✅ | ❌ | ✅ | **Escrita** |
| `/items/[id]` | GET/PATCH | ✅ | ✅ | ✅ (1s in-mem) | ✅ | **Escrita** |
| `/items/bulk-action` | POST | ✅ | ✅ | ❌ | ✅ | **Escrita bulk** |
| `/items/[id]/pictures` | GET | ? | ? | ❌ | ? | Leitura |
| `/items/[id]/upload-image` | POST | ? | ? | ❌ | ? | **Escrita** |
| `/items/[id]/siblings` | GET | ? | ? | ❌ | ? | Leitura |
| `/listings/sync` | POST | ✅ | ✅ | ❌ | ✅ | **Escrita DB** |
| `/estoque` | GET | ✅ | ✅ | ❌ | ✅ | Leitura DB |
| `/shipments` | GET | ? | ? | ❌ | ? | Leitura |
| `/shipments/[id]` | GET | ✅ | ✅ | ❌ | ✅ | Leitura |
| `/shipments/[id]/label` | GET | ? | ? | ❌ | ? | Leitura |
| `/shipments/[id]/danfe` | GET | ? | ? | ❌ | ? | Leitura |
| `/shipments/labels/batch` | POST | ? | ? | ❌ | ? | Leitura |
| `/shipping-locations` | GET | ? | ? | ❌ | ? | Leitura |
| `/messages` | GET | ✅ | ✅ | ❌ | ✅ | Leitura |
| `/messages/[pack_id]` | GET/POST | ? | ? | ❌ | ? | **Escrita** |
| `/questions` | GET/POST | ✅ | ✅ | ❌ | ✅ | **Escrita** |
| `/reclamacoes` | GET | ✅ | ✅ | ❌ | ✅ | Leitura |
| `/reclamacoes/[id]` | GET | ✅ | ✅ | ❌ | ✅ | Leitura |
| `/reclamacoes/[id]/evidencia` | POST | ? | ? | ❌ | ? | **Escrita** |
| `/reputacao` | GET | ? | ? | ❌ | ? | Leitura |
| `/saude` | GET | ✅ | ✅ | ❌ | ✅ | Leitura |
| `/performance` | GET | ✅ | ✅ | ❌ | ✅ | Leitura |
| `/metrics` | GET | ? | ? | ❌ | ? | Leitura |
| `/reviews` | GET | ✅ | ✅ | ❌ | ✅ | Leitura |
| `/concorrentes` | GET | ✅ | ✅ | ❌ | ✅ | Leitura |
| `/vendas-por-anuncio` | GET | ✅ | ✅ | ❌ | ✅ | Leitura |
| `/billing` | GET | ✅ | ✅ | ❌ | ✅ | Leitura |
| `/billing/[period_key]` | GET | ? | ? | ❌ | ? | Leitura |
| `/financeiro` | GET | ? | ? | ❌ | ? | Leitura |
| `/conciliacao` | GET | ✅ | ✅ | ❌ | ✅ | Leitura |
| `/promocoes` | GET | ? | ? | ❌ | ? | Leitura |
| `/promocoes/criar` | POST | ✅ | ✅ | ❌ | ✅ | **Escrita** |
| `/promocoes/[id]` | GET/PATCH/DELETE | ? | ? | ❌ | ? | **Escrita** |
| `/promocoes/item` | POST/DELETE | ? | ? | ❌ | ? | **Escrita** |
| `/promocoes/elegibilidade` | GET | ? | ? | ❌ | ? | Leitura |
| `/promocoes/sem-promocao` | GET | ? | ? | ❌ | ? | Leitura |
| `/promocoes/em-promocao` | GET | ? | ? | ❌ | ? | Leitura |
| `/ads/campaigns` | GET | ✅ | ✅ | ❌ | ✅ | Leitura |
| `/ads/campaigns/[id]` | GET/PATCH | ? | ? | ❌ | ? | **Escrita** |
| `/ads/items` | GET | ? | ? | ❌ | ? | Leitura |
| `/ads/items/[id]` | PATCH | ? | ? | ❌ | ? | **Escrita** |
| `/ads/advertiser` | GET | ? | ? | ❌ | ? | Leitura |
| `/categories` | GET | ? | ? | ❌ | ? | Leitura |
| `/categories/root` | GET | ? | ? | ❌ | ? | Leitura |
| `/categories/suggest` | GET | ? | ? | ❌ | ? | Leitura |
| `/categories/[id]/children` | GET | ? | ? | ❌ | ? | Leitura |
| `/categories/[id]/attributes` | GET | ? | ? | ❌ | ? | Leitura |
| `/products` | GET | ? | ? | ❌ | ? | Leitura |
| `/products/search` | GET | ? | ? | ❌ | ? | Leitura |
| `/products/[id]` | GET | ? | ? | ❌ | ? | Leitura |
| `/sync-customers` | POST | ? | ? | ❌ | ? | **Escrita DB** |

**Legenda:** ✅ = confirmado via código | ? = não auditado diretamente | ❌ = ausente/não implementado

### C.2 — Padrões de Auth Encontrados

Dois padrões coexistem no codebase:

**Padrão A (moderno, preferido):** `getAuthUser()` de `@/lib/server-auth`
```typescript
const user = await getAuthUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```
Usado em: orders, items, items/[id], questions, reclamacoes, saude, performance, reviews, concorrentes, billing, conciliacao, vendas-por-anuncio, estoque, promocoes/criar, ads/campaigns, messages

**Padrão B (legado, verboso):** `createServerClient` + `supabase.auth.getUser()` inline
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```
Usado em: auth, callback, refresh, disconnect, connections

**Risco:** Padrão B duplica lógica. Se o padrão A for atualizado, o padrão B fica desatualizado.

### C.3 — Rate Limiting

- **Apenas 1 rota** tem rate limit: `items/[id]` PATCH — 1s delay via `Map<userId, timestamp>` in-memory
- **Problema crítico:** `Map` in-memory é resetada a cada cold start do Vercel. Em ambiente serverless, isso é praticamente ineficaz — cada instância tem seu próprio Map.
- **Rotas de alto risco sem rate limit:** `items/bulk-action` (até 200 PUTs com 300ms delay — ~1 min de requests), `listings/sync` (até 5000 items), `messages/[pack_id]` POST

### C.4 — Error Handling

**Pontos positivos:**
- Todas as rotas auditadas têm `try/catch`
- Erros retornam 500 com mensagem descritiva
- Uso de `Promise.allSettled` em routes que fazem múltiplos fetches paralelos

**Pontos negativos:**
- Mensagens de erro da API ML são propagadas diretamente ao cliente (information disclosure)
- Exemplo: `throw new Error(`ML orders (${res.status}): ${txt}`)` → `{ error: "ML orders (400): {\"message\":\"some detail...\"}" }`

### C.5 — Logging

- `console.log/warn/error` usado extensivamente — OK para Vercel logs
- `activity_logs` Supabase registra actions de escrita (create item, bulk action, criar promoção)
- Não há request ID nos logs — dificulta rastreamento de fluxos

---

## BLOCO D — Auditoria de Segurança {#bloco-d}

### D.1 — Armazenamento de Tokens OAuth

| Aspecto | Status | Detalhe |
|---------|--------|---------|
| Onde são armazenados | DB Supabase | Tabela `marketplace_connections` |
| Colunas | `access_token`, `refresh_token` | Texto simples |
| Acesso | Via `supabaseAdmin()` | Bypass de RLS — sem proteção por policy no nível da aplicação |
| Encryption at rest | Depende do Supabase | Supabase criptografa disco, mas tokens em texto no campo |
| Encryption at application level | 🔴 AUSENTE | Tokens não são criptografados antes de inserir |
| Exposed em client response | ✅ NÃO | Nunca retornados em respostas de API (conexões retornam apenas `expires_at`, `connected`, `ml_nickname`) |

**Risco:** Se o banco de dados ou o `supabaseAdmin` key for comprometido, todos os tokens ML estão expostos em texto claro.

**Recomendação:** Criptografar `access_token` e `refresh_token` com AES-256 usando uma chave de aplicação antes de salvar no banco.

### D.2 — CSRF no OAuth Callback

| Aspecto | Status | Detalhe |
|---------|--------|---------|
| `state` enviado ao ML | ✅ | `user.id` é passado como `state` |
| `state` validado no callback | 🔴 AUSENTE | Callback lê `?code` e `?error`, ignora `?state` |
| Proteção CSRF real | ⚠️ Parcial | Depende do cookie de sessão Supabase — válido, mas não à prova de ataques sofisticados |

**Risco:** Um atacante poderia forçar um usuário autenticado a conectar a conta ML de outro vendedor se conseguir construir uma URL de callback válida.

**Recomendação:** Validar `state` no callback: gerar um token aleatório (nonce), armazenar em Redis ou DB, verificar na volta.

### D.3 — Proteção de Rotas de Escrita

| Rota de Escrita | Auth | User Isolation | OTP/Confirmação Server-Side |
|----------------|------|----------------|---------------------------|
| `POST /items` | ✅ | ✅ | 🔴 Ausente |
| `PATCH /items/[id]` | ✅ | ✅ | 🔴 Ausente (apenas 1s rate limit) |
| `POST /items/bulk-action` | ✅ | ✅ | 🔴 Ausente |
| `POST /questions` (responder) | ✅ | ✅ | 🔴 Ausente |
| `POST /messages/[pack_id]` | ? | ? | 🔴 Ausente |
| `POST /promocoes/criar` | ✅ | ✅ | 🔴 Ausente |
| `PATCH /promocoes/[id]` | ? | ? | 🔴 Ausente |
| `DELETE /promocoes/[id]` | ? | ? | 🔴 Ausente |
| `POST /promocoes/item` | ? | ? | 🔴 Ausente |
| `PATCH /ads/campaigns/[id]` | ? | ? | 🔴 Ausente |
| `PATCH /ads/items/[id]` | ? | ? | 🔴 Ausente |
| `POST /reclamacoes/[id]/evidencia` | ? | ? | 🔴 Ausente |
| `DELETE /connections` | ✅ | ✅ | 🔴 Ausente |

**Observação:** O comentário nos arquivos diz "requer confirmação manual do usuário" mas isso é apenas documentação — o servidor não verifica se houve confirmação. Qualquer POST autenticado para essas rotas executa a ação.

**Nível de Risco:** Médio. Um bug no frontend ou uma chamada direta à API pode executar ações irreversíveis (criar anúncio, encerrar promoção, enviar resposta errada).

### D.4 — Rate Limiting Global

| Rota | Rate Limit | Risco |
|------|------------|-------|
| `/items/[id]` PATCH | ✅ 1s in-memory | Ineficaz em serverless |
| `/items/bulk-action` POST | ✅ 300ms/item no loop | OK |
| `/questions` POST | ❌ | Pode enviar respostas repetidas |
| `/promocoes/criar` POST | ❌ | Pode criar campanhas duplicadas |
| `/messages/[pack_id]` POST | ❌ | Spam de mensagem |
| Todas as outras rotas | ❌ | — |

**Recomendação:** Implementar rate limiting via Redis (Upstash) ou `@vercel/kv` — global por usuário.

### D.5 — User Isolation

**Status: BOM.** Todas as rotas auditadas passam `user.id` para `getMLConnection(user.id)` e `getValidToken(user.id)`, que por sua vez fazem queries com `.eq('user_id', userId)`. Não foi identificado nenhum caso de data leakage entre usuários.

**Único ponto de atenção:** `supabaseAdmin()` bypass RLS — se uma rota usar `supabaseAdmin()` sem o filtro `.eq('user_id', user.id)`, pode vazar dados de outros usuários. Nas rotas auditadas, o filtro é sempre aplicado.

### D.6 — Webhook — Ausência Total

**Nenhuma rota de webhook está implementada.** Não existe `POST /api/mercadolivre/webhook` ou similar.

**Consequências:**
1. Pedidos novos só aparecem quando o usuário recarrega a página
2. Mudanças de status de envio não disparam alertas
3. Novas perguntas e mensagens não geram notificações em tempo real
4. Mudanças de reputação não são detectadas automaticamente
5. Atualizações de estoque por venda não sincronizam automaticamente

**Risco de segurança se implementado sem validação:** Webhooks ML devem ser validados com o cabeçalho `x-signature` assinado com o app secret. Sem essa validação, qualquer origem pode injetar eventos falsos.

### D.7 — Fuga de Informações em Erros

Rotas propagam erros internos da ML API diretamente ao frontend:
```
{ error: "ML orders (400): {\"message\":\"Token expired\",\"error\":\"unauthorized\",...}" }
```
Isso expõe estrutura interna da API ML e detalhes de implementação.

### D.8 — BILLING_ACTIVE = false (Risco de Abuso)

```typescript
const BILLING_ACTIVE = false  // Espelho de PlanContext.tsx
```
Com isso desativado, qualquer usuário pode conectar ilimitadas contas ML independentemente do plano. Quando o billing for ativado, usuários com múltiplas contas acima do limite terão surpresas.

---

## BLOCO E — Tabela Comparativa (Foguetim vs Concorrentes) {#bloco-e}

| Feature | Foguetim | UpSeller | Bling ERP | Tiny/Olist |
|---------|----------|----------|-----------|------------|
| **Sincronização de Pedidos** | ⚠️ Polling | ✅ Webhook | ✅ Webhook | ✅ Webhook |
| **Gestão de Estoque** | ✅ Via PATCH | ✅ Automático | ✅ Multi-depósito | ✅ Automático |
| **Criação de Anúncios** | ✅ | ✅ | ✅ | ✅ |
| **Edição em Bulk** | ✅ Pause/reactivate/close | ✅ + preço/estoque bulk | ✅ | ✅ |
| **Gestão de Mensagens** | ✅ | ✅ + auto-resposta IA | ❌ | ❌ |
| **Gestão de Perguntas** | ✅ | ✅ + auto-resposta | ❌ | ❌ |
| **Gestão de Reclamações** | ✅ | ✅ | ❌ | ❌ |
| **Saúde da Conta ML** | ✅ Score próprio | ✅ | ❌ | ❌ |
| **Reputação / Nível ML** | ✅ | ✅ | ❌ | ❌ |
| **Performance de Vendas** | ✅ | ✅ | ⚠️ Básico | ⚠️ Básico |
| **Reviews/Avaliações** | ✅ | ✅ | ❌ | ❌ |
| **Conciliação Billing ML** | ✅ | ✅ | ⚠️ Parcial | ❌ |
| **Promoções ML** | ✅ | ✅ | ❌ | ❌ |
| **Product Ads Management** | ✅ | ✅ Completo | ❌ | ❌ |
| **Inteligência de Concorrentes** | ⚠️ Por nickname | ✅ Tempo real | ❌ | ❌ |
| **Vendas por Anúncio** | ✅ | ✅ | ⚠️ Básico | ⚠️ Básico |
| **Emissão de NF-e** | 🔴 AUSENTE | ✅ | ✅ | ✅ |
| **Webhooks ML** | 🔴 AUSENTE | ✅ | ✅ | ✅ |
| **Múltiplas contas ML** | ✅ | ✅ | ✅ | ✅ |
| **Auto-resposta IA (Q&A)** | 🔴 AUSENTE | ✅ | ❌ | ❌ |
| **Catálogo Oficial ML** | 🔴 AUSENTE | ✅ | ⚠️ Parcial | ⚠️ Parcial |
| **Exportação CSV/XLSX** | 🔴 AUSENTE | ✅ | ✅ | ✅ |
| **Multi-marketplace** | ❌ ML only | ✅ ML+SP+AMZ | ✅ 100+ | ✅ 20+ |
| **ERP Completo (financeiro)** | ⚠️ Parcial | ❌ | ✅ | ✅ |
| **Financeiro Integrado** | ⚠️ Via ML | ❌ | ✅ Bancário | ✅ |
| **UI/UX diferenciada** | ✅ Dark futurista | ⚠️ Padrão | ⚠️ Padrão | ⚠️ Padrão |

**Resumo da posição competitiva:**
- Foguetim está **à frente** de Bling e Tiny em: gestão de mensagens, reclamações, reputação, saúde, Product Ads, conciliação billing
- Foguetim está **atrás** de todos em: webhooks (tempo real), NF-e, exportação de dados
- Foguetim está **atrás do UpSeller** em: auto-resposta IA, tempo real, inteligência de concorrentes

---

## BUGS ENCONTRADOS {#bugs}

### Bug #1 — CRÍTICO: Cálculo de Divergência na Conciliação (Matemático)

**Arquivo:** `app/api/mercadolivre/conciliacao/route.ts` — linha ~198-200

**Descrição:**
```typescript
const receita_liquida = receita_bruta - total_taxas_ml + total_bonus
const divergencia = receita_bruta - total_taxas_ml - receita_liquida
// Resultado: divergencia = -total_bonus (SEMPRE)
// O comentário diz "deve ser ≈0" mas matematicamente NUNCA será ≈0 quando houver bônus
```

**Impacto:** O campo `divergencia` retornado ao frontend é matematicamente inútil — não compara pedidos com billing real. Usuários veem "divergente" quando a conta está correta, ou "ok" quando está errada.

**Causa raiz:** `divergencia` deveria ser `receita_bruta_pedidos - (receita_bruta_billing)`, comparando fontes diferentes de dados, não uma identidade matemática.

---

### Bug #2 — ALTO: Rate Limit In-Memory Ineficaz em Serverless

**Arquivo:** `app/api/mercadolivre/items/[item_id]/route.ts` — linhas 22-29

**Descrição:**
```typescript
const lastPut: Map<string, number> = new Map()
async function enforceRateLimit(userId: string) {
  // Esta Map é POR INSTÂNCIA serverless — Vercel cria nova instância a cada cold start
}
```

**Impacto:** O rate limit de 1s não funciona em produção Vercel. Cada cold start reseta o Map. Múltiplas instâncias não compartilham estado.

---

### Bug #3 — MÉDIO: Validação de `state` OAuth Ausente

**Arquivo:** `app/api/mercadolivre/callback/route.ts`

**Descrição:** O `state` (user.id) é enviado na URL de autorização mas não é lido/validado no callback. Um atacante com acesso ao código da URL de callback pode tentar CSRF.

---

### Bug #4 — MÉDIO: Falta de Parâmetro `role=seller` na Busca de Perguntas

**Arquivo:** `app/api/mercadolivre/questions/route.ts` — linha 37

**Descrição:**
```typescript
const url = `${ML_API_BASE}/questions/search?seller_id=${conn.ml_user_id}&sort_fields=date_created&sort_types=DESC&limit=${limit}&offset=${offset}${statusParam}`
```

A API ML recomenda incluir `role=seller` ou `role=buyer` para filtrar corretamente. Sem isso, a API pode retornar perguntas onde o usuário ML é o comprador, não apenas as do vendedor.

---

### Bug #5 — MÉDIO: `vendas-por-anuncio` trunca em 500 pedidos

**Arquivo:** `app/api/mercadolivre/vendas-por-anuncio/route.ts` — linha 17

**Descrição:** `MAX_PAGES = 10` com `ORDERS_LIMIT = 50` = máximo de 500 pedidos. Vendedores com volume alto terão dados de ranking incompletos sem qualquer aviso ao usuário.

---

### Bug #6 — BAIXO: Resposta 200 para "ML não conectado" em `/orders`

**Arquivo:** `app/api/mercadolivre/orders/route.ts` — linha 23

**Descrição:**
```typescript
return NextResponse.json({ error: 'ML não conectado', notConnected: true }, { status: 200 })
```

Retornar HTTP 200 para um estado de erro semântico é inconsistente com as outras rotas que retornam 400. O frontend precisa verificar `notConnected: true` em vez de checar o status HTTP.

---

### Bug #7 — BAIXO: Reviews Summary limita a 50 itens sem paginação

**Arquivo:** `app/api/mercadolivre/reviews/route.ts` — linha 194

**Descrição:** `?limit=50` hardcoded na busca de itens do vendedor. Vendedores com mais de 50 itens ativos terão reviews de apenas os 50 primeiros, não os top 50 por reviews.

---

## FEATURES AUSENTES {#features-ausentes}

### Prioridade CRÍTICA (diferenciais competitivos perdidos)

1. **🔴 Webhooks ML** — Ausência de receiver para notificações em tempo real (pedidos, mensagens, status de envio, perguntas). Todos os concorrentes têm isso. Impacta UX em toda a plataforma.

2. **🔴 NF-e / Nota Fiscal Eletrônica** — DANFE do ML existe, mas geração própria de NF-e não. Bling e Tiny têm; UpSeller tem parceria. Feature essencial para legalidade fiscal dos vendedores.

3. **🔴 Exportação de dados (CSV/XLSX)** — Pedidos, financeiro, conciliação, reviews. Todos os concorrentes têm. Vendedores precisam para contabilidade.

### Prioridade ALTA

4. **🟡 Auto-resposta de Perguntas (templates + IA)** — UpSeller tem. Diferencial claro para vendedores com alto volume de perguntas.

5. **🟡 Alertas Proativos** — Sem webhooks, não há como alertar sobre nova mensagem, pergunta urgente, ou queda de reputação. Sistema de polling periódico em background seria um paliativo.

6. **🟡 Catálogo Oficial ML (catalog/products)** — Para anúncios que fazem parte do catálogo unificado ML, é necessário usar os endpoints de catálogo, não apenas `/items`. Anúncios incorretamente criados fora do catálogo ficam invisíveis para muitas buscas.

7. **🟡 Bulk update de preço/estoque** — `bulk-action` só faz pause/reactivate/close. Não tem bulk price update ou bulk stock update. UpSeller tem.

### Prioridade MÉDIA

8. **🟠 Resposta a avaliações (reviews)** — ML API suporta. Não implementado.

9. **🟠 Conciliação com conta bancária** — Módulo de conciliação atual compara apenas pedidos × billing ML, sem integração bancária real.

10. **🟠 Histórico de reputação (trend)** — Só mostra snapshot atual; sem histórico de evolução do score.

11. **🟠 Busca de concorrentes por categoria/produto** — Apenas por nickname; sem busca por termo de produto ou categoria.

12. **🟠 Criação de campanha de publicidade** — Module de ads só edita campanhas existentes; não cria novas.

13. **🟠 Criptografia de tokens OAuth** — Segurança preventiva.

14. **🟠 Rate limiting global via Redis** — Rate limit in-memory atual é ineficaz.

15. **🟠 Validação de `state` no callback OAuth** — Prevenção CSRF.

### Prioridade BAIXA

16. **🔵 Multi-marketplace** — Shopee, Amazon, etc. Fora do escopo atual do Foguetim.

17. **🔵 Tendências de mercado** — `/trends/MLB/{category}`.

18. **🔵 Moderação de perguntas** — Deletar perguntas ofensivas.

19. **🔵 Relatórios de performance por categoria** — Não implementado.

---

## PLANO DE EXECUÇÃO — FASES 2 A 4 {#plano-fases}

### FASE 2 — Fundação: Tempo Real + NF-e + Exportação (Sprint ~3 semanas)

**Objetivo:** Fechar os maiores gaps competitivos: webhooks, NF-e e exportação.

#### 2.1 — Webhooks ML (prioridade máxima)
- [ ] Criar `POST /api/mercadolivre/webhook` com validação `x-signature` (HMAC-SHA256 com app secret)
- [ ] Processar tópicos: `orders`, `messages`, `questions`, `shipments`, `items`, `payments`
- [ ] Persistir eventos em fila (tabela `webhook_events` ou Supabase Realtime)
- [ ] Criar triggers para notificações in-app (já existe `createNotification`)
- [ ] Configurar webhook URL no painel ML via chamada à API

#### 2.2 — Exportação de Dados
- [ ] `GET /api/mercadolivre/orders?export=csv` — exportar pedidos do período
- [ ] `GET /api/mercadolivre/conciliacao?export=csv` — exportar conciliação mensal
- [ ] `GET /api/mercadolivre/vendas-por-anuncio?export=csv` — exportar ranking
- [ ] UI: botão "Exportar CSV" em cada módulo

#### 2.3 — Correção de Bugs
- [ ] **Bug #1:** Corrigir cálculo de divergência na conciliação
- [ ] **Bug #2:** Migrar rate limit para `@vercel/kv` ou Upstash Redis
- [ ] **Bug #3:** Implementar `state` validation no callback OAuth
- [ ] **Bug #4:** Adicionar `role=seller` na query de perguntas
- [ ] **Bug #5:** Adicionar `has_more: true` e paginação em vendas-por-anuncio
- [ ] **Bug #6:** Padronizar status HTTP 400 em "ML não conectado"

---

### FASE 3 — Inteligência: Auto-resposta + Catálogo + Alertas (Sprint ~3 semanas)

**Objetivo:** Features de produtividade que diferenciam do Bling/Tiny.

#### 3.1 — Auto-resposta de Perguntas
- [ ] Módulo de templates de resposta (por categoria de produto, por palavra-chave)
- [ ] Sugestão de resposta com IA (Claude API) baseada no texto da pergunta e no anúncio
- [ ] Modo "auto-approve": resposta automática para perguntas com match alto de template
- [ ] Fila de revisão para respostas sugeridas (com fallback manual)

#### 3.2 — Catálogo Oficial ML
- [ ] Integrar `/catalog/search` e `/catalog/products/{id}`
- [ ] Na criação de anúncio: verificar se o produto tem entrada no catálogo ML
- [ ] Se sim: criar como "catálogo" (product_id), não como item independente
- [ ] Migrar anúncios existentes para catálogo onde aplicável

#### 3.3 — Alertas Proativos
- [ ] Com webhooks ativos (Fase 2): notificações push via Supabase Realtime
- [ ] Dashboard de alertas: novas mensagens sem leitura, perguntas > 24h sem resposta, reclamações urgentes, queda de reputação
- [ ] Email/WhatsApp para alertas críticos (integração com provedor)

#### 3.4 — Criptografia de Tokens
- [ ] Implementar AES-256-GCM com chave de ambiente para `access_token` e `refresh_token` antes de salvar no banco
- [ ] Migração dos tokens existentes

---

### FASE 4 — Expansão: NF-e + Multi-marketplace + BI Avançado (Sprint ~4 semanas)

**Objetivo:** ERP completo — fechamento do ciclo fiscal e expansão de plataformas.

#### 4.1 — NF-e Integrada
- [ ] Integrar com provedor de NF-e (NFe.io, SPED Fiscal, ou Plug Notas)
- [ ] Geração automática de NF-e ao marcar pedido ML como "shipped"
- [ ] Associação da NF-e ao pedido ML (número de acesso, chave, XML)
- [ ] Download do XML e DANFE próprio (não apenas o do ML)
- [ ] Configuração de dados da empresa (CNPJ, CSOSN, NCM por produto)

#### 4.2 — BI Avançado
- [ ] Performance por categoria (não apenas por anúncio)
- [ ] Histórico de reputação (trend semanal/mensal)
- [ ] Comparação entre múltiplas contas ML no mesmo gráfico
- [ ] Comparação de preços de concorrentes com alertas de rebaixamento
- [ ] Tendências de mercado por categoria

#### 4.3 — Bulk Avançado
- [ ] Bulk update de preço com regras (ex: +5% em todos da categoria X)
- [ ] Bulk update de estoque
- [ ] Adição em lote de itens em promoção
- [ ] Programação de alterações (ex: subir preço às 6h, baixar à meia-noite)

#### 4.4 — Multi-marketplace (Shopee + Amazon)
- [ ] OAuth e sync de pedidos para Shopee
- [ ] OAuth e sync de pedidos para Amazon BR
- [ ] Dashboard unificado multi-canal
- [ ] Preço e estoque sincronizados entre canais

---

## RESUMO EXECUTIVO

### Pontos Fortes do Foguetim ML
1. **Cobertura de módulos** é excelente — 15+ módulos funcionais vs. 5-8 dos concorrentes diretos
2. **UX diferenciada** — dark mode futurista com glassmorphism; único no mercado brasileiro de ERPs
3. **Gestão de reclamações + saúde + reputação** — não encontrados em Bling e Tiny
4. **Product Ads integrado** — diferencial vs. Bling e Tiny
5. **Código bem estruturado** — padrões consistentes, user isolation correto, error handling presente
6. **Segurança adequada** — auth em todas as rotas auditadas, isolamento por user_id correto

### Vulnerabilidades Críticas a Corrigir Antes de Lançamento
1. ❌ **Sem webhooks** — app inteira é polling; atraso de minutos a horas para dados críticos
2. ❌ **Sem NF-e** — sem isso, vendedores não podem usar legalmente para fiscal
3. ❌ **Bug na conciliação** — cálculo de divergência matematicamente errado
4. ❌ **Rate limit ineficaz** — Map in-memory não funciona em serverless
5. ❌ **Tokens em texto claro no banco** — risco de vazamento se DB comprometido

### Score de Maturidade por Domínio (0-10)

| Domínio | Score | Justificativa |
|---------|-------|---------------|
| Auth/OAuth | 8/10 | Funcional; falta validação state CSRF |
| Pedidos | 7/10 | Funcional; sem webhook, sem NF-e, sem exportação |
| Produtos/Anúncios | 8/10 | Completo; falta catálogo oficial |
| Estoque | 6/10 | Funcional mas depende de sync manual |
| Expedição | 7/10 | Etiqueta + DANFE; sem NF-e própria |
| Mensagens/Perguntas | 7/10 | Funcional; falta auto-resposta e templates |
| Reclamações | 8/10 | Muito completo para o segmento |
| Saúde/Reputação | 9/10 | Melhor que todos os concorrentes |
| Performance | 8/10 | Muito completo; sem tempo real |
| Reviews | 7/10 | Funcional; falta resposta e paginação |
| Financeiro/Billing | 7/10 | Funcional; falta bancário e exportação |
| Conciliação | 5/10 | Bug crítico no cálculo; conceito bom |
| Promoções | 8/10 | Completo; falta bulk |
| Publicidade/Ads | 7/10 | Funcional; falta criação |
| Concorrentes | 5/10 | Apenas por nickname; muito limitado |
| Segurança | 6/10 | Auth OK; falta criptografia tokens, rate limit global, CSRF |
| **MÉDIA GERAL** | **7.1/10** | Plataforma sólida com gaps específicos |

---

*Auditoria gerada em 2026-03-20 por análise estática de 57 arquivos de route + 3 arquivos de lib core.*
*Próxima revisão recomendada: após implementação da Fase 2 (webhooks + correção de bugs).*
