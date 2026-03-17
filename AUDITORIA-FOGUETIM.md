# RELATÓRIO COMPLETO DE AUDITORIA — FOGUETIM ERP

**Data:** 17/03/2026
**Auditor:** Claude Code (leitura passiva — sem alterações de código ou dados)
**Escopo:** 42 páginas auditadas (3 institucional, 30 dashboard, 9 admin)
**Método:** Playwright read-only — navegação real, sem submissions de formulários ou modificações

---

## 1. Resumo Executivo

O Foguetim ERP tem um design visual forte e consistente, dados reais do Mercado Livre integrados e estrutura de produto bem pensada. Porém existem **problemas sérios que comprometem a usabilidade em produção**.

### Nível Geral de Qualidade: 6/10

| Dimensão | Nota | Observação |
|---|---|---|
| Design Visual | 7.5/10 | Tema dark futurista coeso, glassmorphism bem executado |
| Funcionalidade | 5.5/10 | 2 features core quebradas, SAC inutilizável, erros em NF-e/Contador |
| Usabilidade | 5.5/10 | Navegação fluida mas bloqueios em módulos críticos |
| Organização | 6.5/10 | Estrutura clara, mas badges de dev e placeholders em produção |
| Segurança | 5.0/10 | PII exposto sem mascaramento, Mixed Content, referência a arquivos internos |
| Estabilidade | 6.5/10 | Dados ML carregam bem na maioria das páginas |

### Top 5 Problemas Mais Graves

1. **[CRÍTICO]** Seletor de período travado em Financeiro e Conciliação — as duas features mais importantes para gestão financeira estão completamente inutilizáveis
2. **[CRÍTICO]** Emails reais e dados PII de todos os usuários expostos sem mascaramento em `/admin/usuarios` e `/admin/logs` — risco LGPD imediato
3. **[ALTO]** 20 Mixed Content warnings em `/dashboard/vendas-por-anuncio` — recursos HTTP carregados em contexto HTTPS comprometem segurança
4. **[ALTO]** Erros Supabase (user_id vazio) nos módulos NF-e e Contador — módulos fiscais críticos com falhas silenciosas
5. **[ALTO]** SAC marcado como "Em breve" — atendimento ao cliente bloqueado para usuários pagantes

### Top 5 Riscos de Segurança

1. Emails reais de todos os usuários visíveis no admin sem mascaramento (LGPD)
2. Mixed Content — recursos HTTP em páginas HTTPS
3. Logs de sistema com PII completo (emails reais de todos os usuários)
4. Referência a arquivo interno `WEBHOOK_SETUP.md` exposta na UI do admin
5. Email do proprietário (Super Admin) visível na tabela de equipe admin

---

## 2. Bugs e Erros

### [BUG-001] Seletor de período permanentemente desabilitado no Financeiro | Gravidade: **CRÍTICA**

- **Local:** `/dashboard/financeiro`
- **Descrição:** O botão de seleção de período fica disabled com texto "Carregando..." indefinidamente após o carregamento inicial. O usuário nunca consegue trocar o período.
- **Reprodução:** Navegar para `/dashboard/financeiro` → Aguardar carregamento → Tentar clicar no seletor de período
- **Impacto:** Core feature do produto completamente inutilizável. Usuário não consegue analisar dados históricos.
- **Sugestão:** Revisar o estado de loading do `periodsLoading` — provavelmente nunca está sendo setado para `false` quando a resposta da API retorna vazia ou com erro.

---

### [BUG-002] Seletor de período permanentemente desabilitado na Conciliação | Gravidade: **CRÍTICA**

- **Local:** `/dashboard/conciliacao`
- **Descrição:** Mesmo comportamento do BUG-001. Botão de período travado em "Carregando..." permanentemente.
- **Reprodução:** Navegar para `/dashboard/conciliacao` → seletor nunca habilita
- **Impacto:** Módulo de conciliação financeira completamente inutilizável.
- **Sugestão:** O estado de loading precisa ser resolvido para `false` mesmo quando a API retorna 0 períodos ou erro.

---

### [BUG-003] Erros Supabase com user_id vazio em NF-e | Gravidade: **ALTA**

- **Local:** `/dashboard/nfe`
- **Descrição:** Console mostra 2 erros "Failed to load resource" em endpoints Supabase com `user_id=eq.` (sem valor). Query dispara com user_id nulo.
- **Reprodução:** Navegar para `/dashboard/nfe` → Abrir DevTools → Ver erros de console
- **Impacto:** Módulo NF-e pode não carregar documentos fiscais do usuário.
- **Sugestão:** Garantir que a query só dispara após o user_id estar disponível (aguardar `profile.id` antes de executar a query).

---

### [BUG-004] Toast "Sincronizando com banco de dados..." preso permanentemente | Gravidade: **ALTA**

- **Local:** `/dashboard/produtos`
- **Descrição:** Um toast de progresso persiste na tela indefinidamente após o carregamento da página de produtos. Nunca desaparece.
- **Reprodução:** Navegar para `/dashboard/produtos` → Observar canto inferior direito da tela
- **Impacto:** Poluição visual constante; usuário não sabe se sincronização está travada ou completa.
- **Sugestão:** Verificar o handler de conclusão do processo de sincronização — a chamada para fechar o toast está provavelmente falhando silenciosamente.

---

### [BUG-005] KPI "Excelente!" com 0 avaliações e nota 0.0 em Reviews | Gravidade: **ALTA**

- **Local:** `/dashboard/reviews`
- **Descrição:** O card de status de avaliações exibe "Excelente!" mesmo com rating 0.0 e 0 reviews. A lógica não trata o caso de ausência de dados.
- **Reprodução:** Navegar para `/dashboard/reviews` → Observar o KPI de reputação
- **Impacto:** Informação enganosa; pode mascarar problemas reais de reputação.
- **Sugestão:** Adicionar verificação: `if (totalReviews === 0) return "Sem avaliações"` antes de qualquer qualificação.

---

### [BUG-006] HTML inválido: `<main>` aninhado dentro de `<main>` em Promoções | Gravidade: **MÉDIA**

- **Local:** `/dashboard/promocoes`
- **Descrição:** A página de Promoções possui um elemento `<main>` dentro de outro `<main>`. A spec HTML5 permite apenas um elemento `<main>` por documento.
- **Impacto:** Falha em screen readers, potencial impacto negativo em SEO, comportamento inesperado em alguns browsers.
- **Sugestão:** Substituir o `<main>` interno por `<section>` ou `<div>`.

---

### [BUG-007] Status ML indica "0 contas conectadas" no admin sendo informação falsa | Gravidade: **MÉDIA**

- **Local:** `/admin/ferramentas`
- **Descrição:** O card de status do Mercado Livre mostra "0 contas conectadas" com indicador vermelho, mas o usuário tem ML conectado (dados reais aparecem em diversas outras páginas).
- **Impacto:** Admin pensa que a integração ML está completamente quebrada. Desinformação crítica para suporte.
- **Sugestão:** Verificar a query de contagem de conexões ML ativas — provavelmente busca na tabela errada ou com filtro incorreto.

---

### [BUG-008] Race condition: contador "0 eventos" vs "6 eventos" em admin/logs | Gravidade: **MÉDIA**

- **Local:** `/admin/logs`
- **Descrição:** O heading exibe "0 eventos registrados" no render inicial, mas logo após hidratação mostra "6 eventos". Race condition entre render inicial (SSR/placeholder) e carregamento de dados.
- **Impacto:** Contador inconsistente; pode confundir admin que monitorar a plataforma.
- **Sugestão:** Usar estado de loading para o contador ou inicializar com `null` e mostrar skeleton enquanto carrega.

---

### [BUG-009] Roadmap com datas de 2025 já passadas na landing page | Gravidade: **BAIXA**

- **Local:** `/` (landing page, seção Roadmap)
- **Descrição:** A seção de roadmap da landing menciona datas de 2025 que já passaram. Estamos em 2026.
- **Impacto:** Passa imagem de produto desatualizado ou sem manutenção para visitantes.
- **Sugestão:** Atualizar o roadmap com datas reais de 2026.

---

### [BUG-010] Erros Supabase com user_id vazio no módulo Contador | Gravidade: **BAIXA**

- **Local:** `/dashboard/contador`
- **Descrição:** Console mostra "Failed to load resource" no endpoint Supabase com `user_id=eq.` vazio. Mesmo padrão do BUG-003.
- **Impacto:** Documentos do contador podem não carregar.
- **Sugestão:** Mesma correção do BUG-003 — aguardar user_id disponível antes de disparar queries.

---

## 3. Problemas de UX/UI

### [UX-001] Badge "Dev" visível em produção no item Expedição da sidebar | Impacto: **ALTO**

- **Local:** Sidebar (todas as páginas logadas)
- **Problema:** O item "Expedição" exibe o badge "Dev" visível para todos os usuários em produção.
- **Por que prejudica:** Não-profissional; expõe estado interno de desenvolvimento para clientes pagantes.
- **Sugestão:** Remover o badge antes de cada deploy de produção, ou implementar feature flags que ocultem badges de dev automaticamente no ambiente prod.

---

### [UX-002] SAC com badge "Em breve" em funcionalidade core de atendimento | Impacto: **ALTO**

- **Local:** `/dashboard/sac` e sidebar
- **Problema:** O módulo SAC, central para operações de e-commerce, exibe "Em breve" como se fosse incompleto.
- **Por que prejudica:** Usuários pagantes não conseguem usar o atendimento ao cliente. Funcionalidade crítica bloqueada.
- **Sugestão:** Ou completar a funcionalidade do SAC, ou remover o badge se ele já funciona, ou ocultar o módulo completamente até estar pronto.

---

### [UX-003] Card placeholder "Mais ferramentas em breve" visível no admin | Impacto: **MÉDIO**

- **Local:** `/admin/ferramentas`
- **Problema:** Um card vazio com "Mais ferramentas em breve" ocupa metade da grade de Ações Rápidas.
- **Por que prejudica:** Passa imagem de produto inacabado; desperdício de espaço valioso.
- **Sugestão:** Remover o card placeholder ou substituir por uma funcionalidade real.

---

### [UX-004] Inconsistência entre quantidade de planos: landing (3) vs /planos (4) | Impacto: **MÉDIO**

- **Local:** `/` vs `/planos`
- **Problema:** A landing exibe 3 planos de preço. A página `/planos` exibe 4 planos.
- **Por que prejudica:** Usuário que viu 3 planos na landing chega em /planos e vê um plano diferente — confusão na jornada de conversão.
- **Sugestão:** Sincronizar o número de planos exibidos entre todos os pontos de entrada.

---

### [UX-005] Aba "Saúde dos Meus Anúncios" em Concorrentes sem conteúdo visível | Impacto: **MÉDIO**

- **Local:** `/dashboard/concorrentes`
- **Problema:** A segunda aba do módulo não apresenta conteúdo após clique.
- **Por que prejudica:** Usuário clica esperando informação e vê tela vazia sem explicação.
- **Sugestão:** Adicionar estado vazio explicativo com CTA, ou ocultar a aba até ter conteúdo.

---

### [UX-006] Sidebar admin exibe "Admin / admin" (lowercase) ao invés do nome real | Impacto: **MÉDIO**

- **Local:** `/admin` (todas as páginas admin)
- **Problema:** Footer da sidebar admin mostra nome "Admin" e cargo "admin" (minúsculo) ao invés do nome real do usuário logado.
- **Por que prejudica:** Inconsistência com o dashboard que mostra "matheus.portela21". Parece um placeholder não preenchido.
- **Sugestão:** Injetar o profile real do usuário no componente de sidebar do admin.

---

### [UX-007] Página de Clientes sem ações operacionais | Impacto: **MÉDIO**

- **Local:** `/dashboard/clientes`
- **Problema:** Carrega dados reais de clientes ML mas não há ações disponíveis (enviar mensagem, ver histórico completo, filtrar por valor, etc.).
- **Por que prejudica:** Página puramente informacional sem utilidade operacional real.
- **Sugestão:** Adicionar ações: link para histórico de pedidos do cliente, link para mensagem ML, filtros por recência/volume.

---

### [UX-008] Botão "Convidar contador" sem fluxo completo visível | Impacto: **BAIXO**

- **Local:** `/dashboard/contador`
- **Problema:** A aba de acesso do contador não tem um fluxo de convite funcional e visível.
- **Por que prejudica:** Usuário não sabe como configurar acesso para o contador.
- **Sugestão:** Implementar fluxo completo de convite por email ou exibir instruções claras de como configurar.

---

### [UX-009] Emojis em dropdown de categorias nos logs do admin | Impacto: **BAIXO**

- **Local:** `/admin/logs`
- **Problema:** Os filtros de categoria usam emojis (🔐, ✏️, 💳) misturados com texto.
- **Por que prejudica:** Screen readers leem emojis de forma estranha; pode falhar em alguns sistemas.
- **Sugestão:** Substituir emojis por ícones SVG ou remover completamente.

---

### [UX-010] URL de webhook sem "www" inconsistente com URL principal | Impacto: **BAIXO**

- **Local:** `/admin/webhooks`
- **Problema:** O card mostra `POST https://foguetim.com.br/api/webhooks/mercadolivre` (sem www), mas o site funciona em `www.foguetim.com.br`.
- **Por que prejudica:** Pode causar falhas de configuração se o Mercado Livre tentar chamar a URL exibida.
- **Sugestão:** Corrigir para `https://www.foguetim.com.br/api/webhooks/mercadolivre`.

---

## 4. Poluição Visual e Organização

| ID | Página | Problema |
|---|---|---|
| VP-001 | `/dashboard/produtos` | Toast "Sincronizando..." preso permanentemente no canto da tela |
| VP-002 | Sidebar (todas) | Badge "Dev" no item Expedição — estado de dev em produção |
| VP-003 | `/admin/ferramentas` | Card placeholder "Mais ferramentas em breve" ocupa metade da grade |
| VP-004 | `/dashboard/sac` | Badge "Em breve" em feature core — parece produto inacabado |
| VP-005 | `/` (landing) | Roadmap com datas de 2025 já passadas |
| VP-006 | `/dashboard/packs` | Estado vazio muito sparse — tela com excesso de espaço vazio sem guia |
| VP-007 | Admin sidebar | "Admin / admin" lowercase no footer — placeholder visível |
| VP-008 | `/dashboard/reviews` | KPI "Excelente!" com 0.0 estrelas — dado enganoso em destaque |

---

## 5. Problemas de Usabilidade e Produto

**[USAB-001]** Análise temporal bloqueada no Financeiro e Conciliação
Seletores de período desabilitados impedem qualquer análise histórica. Os módulos financeiros são inúteis sem esta funcionalidade.

**[USAB-002]** Falta de paginação explícita em tabelas de estoque/produtos
Em contas com muitos anúncios, tabelas sem paginação visível podem ser confusas. O usuário não sabe quantos itens existem no total.

**[USAB-003]** Botões "Atualizar" do admin não comunicam estado
Botões carregam como disabled e nem sempre reabilitam com feedback claro de sucesso/falha.

**[USAB-004]** Relatórios sem exportação funcional visível
O módulo de relatórios exibe dados mas não oferece forma de exportar (CSV, PDF, Excel) — usuário não consegue extrair dados para análise externa.

**[USAB-005]** Performance de anúncios sem drill-down
As métricas de performance não são clicáveis para ver detalhes por anúncio. Informação superficial sem profundidade operacional.

**[USAB-006]** Estados vazios sem CTAs orientativos
Várias páginas mostram simplesmente "Nenhum dado encontrado" sem explicar o que o usuário precisa fazer para ver dados (sincronizar, configurar, etc.).

**[USAB-007]** SAC potencialmente funcional mas marcado como "Em breve"
Se a funcionalidade de resposta ao SAC existe mas está incompleta, seria melhor exibir parcialmente do que bloquear com badge "Em breve".

---

## 6. Problemas de Segurança

### [SEC-001] Emails reais e dados PII expostos sem mascaramento | Gravidade: **CRÍTICA**

- **Local:** `/admin/usuarios`
- **Risco:** A tabela exibe emails completos, nomes e planos de todos os usuários da plataforma (ex: `lucasportelamiranda@hotmail.com`, `shopee@foguetim.com`). Qualquer pessoa com acesso admin vê todos os dados sem restrição.
- **Impacto:** Violação potencial da LGPD. Um admin malicioso ou uma sessão comprometida expõe dados de todos os clientes.
- **Recomendação:** Mascarar emails por padrão (ex: `l***@hotmail.com`), implementar toggle explícito para revelar dados completos. Adicionar audit log quando dados são revelados.

---

### [SEC-002] Logs de sistema com emails completos de todos os usuários | Gravidade: **ALTA**

- **Local:** `/admin/logs`
- **Risco:** Cada evento de log exibe o email completo do usuário que realizou a ação. Exposto para qualquer pessoa com acesso admin.
- **Impacto:** Base de dados completa de emails de clientes acessível via interface de logs.
- **Recomendação:** Substituir email por user_id truncado nos logs visíveis. Manter email completo apenas em exportação com auditoria.

---

### [SEC-003] Mixed Content: 20 recursos HTTP carregados em contexto HTTPS | Gravidade: **ALTA**

- **Local:** `/dashboard/vendas-por-anuncio`
- **Risco:** Recursos carregados via HTTP em página HTTPS. Browsers modernos bloqueiam mixed content ativo. Podem ser imagens de anúncios ML servidas em HTTP.
- **Impacto:** Recursos podem ser bloqueados em browsers restritivos; potencial downgrade attack.
- **Recomendação:** Fazer proxy das imagens ML via CDN próprio com HTTPS, ou usar endpoints HTTPS do ML para thumbnails.

---

### [SEC-004] Referência a arquivo interno `WEBHOOK_SETUP.md` exposta na UI | Gravidade: **MÉDIA**

- **Local:** `/admin/webhooks`
- **Risco:** A UI menciona "Consulte WEBHOOK_SETUP.md para instruções completas" — expõe existência de arquivo de setup interno, possivelmente acessível publicamente.
- **Impacto:** Information disclosure; atacante pode tentar acessar `https://www.foguetim.com.br/WEBHOOK_SETUP.md`.
- **Recomendação:** Substituir por documentação inline. Nunca referenciar arquivos internos na UI. Verificar se o arquivo está acessível publicamente e remover/proteger.

---

### [SEC-005] Email do Super Admin exposto na tabela de equipe | Gravidade: **MÉDIA**

- **Local:** `/admin/equipe`
- **Risco:** `matheus.portela21@gmail.com` aparece como Super Admin Nível 6 — email real do proprietário exposto em contexto admin.
- **Impacto:** Alvo para phishing direcionado; conhecimento de email de maior privilégio.
- **Recomendação:** Mascarar emails na visualização padrão da tabela de equipe.

---

### [SEC-006] Captura de IP inativa nos logs de auditoria | Gravidade: **BAIXA**

- **Local:** `/admin/logs`
- **Risco:** A coluna de IP mostra "—" para todos os eventos. Sem IP registrado, é impossível rastrear ações suspeitas a um endereço de origem.
- **Impacto:** Auditoria de segurança comprometida — impossível identificar origem de ações suspeitas.
- **Recomendação:** Implementar captura de IP no middleware de logging, considerando headers `X-Forwarded-For` em ambiente Vercel.

---

## 7. Inconsistências e Duplicidades

| Inconsistência | Páginas Afetadas |
|---|---|
| Número de planos: 3 na landing vs 4 em `/planos` | `/` e `/planos` |
| URL webhook: `foguetim.com.br` (sem www) vs URL real `www.foguetim.com.br` | `/admin/webhooks` |
| Usuário exibido como "Usuário/Administrador" no dashboard vs "matheus.portela21/admin" no admin | Sidebar dashboard vs sidebar admin |
| Badge "Dev" visível apenas no item Expedição mas não em outros módulos incompletos | Sidebar |
| SAC marcado como "Em breve" na sidebar mas acessível via URL direta | Sidebar vs `/dashboard/sac` |
| Contador de eventos: heading "0 eventos" vs lista com "6 eventos" em admin/logs | `/admin/logs` |
| Tema de paginação: algumas tabelas têm paginação, outras não — sem padrão claro | Vários módulos |
| Skeleton loaders presentes em algumas páginas, ausentes em outras | Vários módulos |

---

## 8. TOP 20 — Problemas Mais Importantes

| # | Gravidade | Problema |
|---|---|---|
| 1 | 🔴 CRÍTICO | Seletor de período disabled em Financeiro — análise histórica completamente bloqueada |
| 2 | 🔴 CRÍTICO | Seletor de período disabled em Conciliação — módulo completamente inutilizável |
| 3 | 🔴 CRÍTICO | Emails e PII de usuários expostos sem mascaramento no admin — risco LGPD imediato |
| 4 | 🔴 ALTO | 20 Mixed Content warnings em vendas-por-anuncio — risco de segurança e quebra em browsers |
| 5 | 🔴 ALTO | Erros Supabase com user_id vazio em NF-e — módulo fiscal com falhas silenciosas |
| 6 | 🔴 ALTO | SAC marcado "Em breve" — atendimento ao cliente bloqueado para usuários pagantes |
| 7 | 🔴 ALTO | Toast de sincronização preso permanentemente em Produtos — UI corrompida |
| 8 | 🔴 ALTO | Badge "Dev" no item Expedição visível em produção para todos os usuários |
| 9 | 🟡 MÉDIO | HTML inválido: `<main>` aninhado em Promoções — acessibilidade e SEO afetados |
| 10 | 🟡 MÉDIO | KPI "Excelente!" com 0 avaliações em Reviews — informação enganosa |
| 11 | 🟡 MÉDIO | Status ML "0 contas conectadas" no admin sendo informação falsa |
| 12 | 🟡 MÉDIO | Inconsistência de planos: 3 na landing vs 4 em /planos — confusão na conversão |
| 13 | 🟡 MÉDIO | Referência a WEBHOOK_SETUP.md (arquivo interno) exposta na UI |
| 14 | 🟡 MÉDIO | Logs de sistema com emails completos de todos os usuários (PII em logs) |
| 15 | 🟡 MÉDIO | Erros Supabase com user_id vazio no Contador — módulo fiscal com falhas |
| 16 | 🟡 MÉDIO | Placeholder "Mais ferramentas em breve" ocupando espaço em admin/ferramentas |
| 17 | 🟡 MÉDIO | Sidebar user section mostra placeholders ao invés de dados reais do usuário |
| 18 | 🟡 MÉDIO | Race condition no contador de eventos em admin/logs (0 vs 6 eventos) |
| 19 | 🟢 BAIXO | Roadmap da landing com datas de 2025 já passadas |
| 20 | 🟢 BAIXO | Captura de IP inativa em todos os logs de auditoria |

---

## 9. TOP 10 — Melhorias com Maior Impacto Visual/UX

| # | Melhoria | Impacto Esperado |
|---|---|---|
| 1 | Corrigir seletores de período no Financeiro e Conciliação | Desbloqueia as 2 features mais críticas do produto |
| 2 | Implementar estados vazios com CTAs orientativos em todos os módulos | Elimina telas "mortas" e guia o usuário à ação |
| 3 | Sistema de feature flags: remover badges Dev/Em breve automaticamente em prod | Produto parece profissional e acabado |
| 4 | Mascarar PII por padrão no admin com toggle de revelação explícito | Compliance LGPD + segurança sem perda de funcionalidade |
| 5 | Skeleton loaders consistentes em todas as páginas | UX de carregamento uniforme e profissional |
| 6 | Feedback visual completo nos botões de ação (loading → sucesso → erro) | Usuário sabe o que está acontecendo em cada ação |
| 7 | Unificar número de planos entre landing, /planos e sidebar | Jornada de conversão sem contradições |
| 8 | Adicionar tooltips contextuais em KPIs com explicação dos dados exibidos | Mais transparência e confiança nas métricas |
| 9 | Exibir nome e foto real do usuário no footer da sidebar | Personalização mínima que aumenta sensação de controle |
| 10 | Adicionar exportação (CSV/PDF) em Relatórios e tabelas de dados | Valor operacional imediato — dado que o usuário pode usar fora da plataforma |

---

## 10. TOP 10 — Riscos de Segurança

| # | Gravidade | Risco |
|---|---|---|
| 1 | 🔴 CRÍTICO | Emails de todos os usuários visíveis em `/admin/usuarios` sem mascaramento (LGPD) |
| 2 | 🔴 ALTO | Emails em logs de auditoria expostos para qualquer admin — PII acessível em massa |
| 3 | 🔴 ALTO | 20 Mixed Content warnings — recursos HTTP em HTTPS (possível downgrade attack) |
| 4 | 🟡 MÉDIO | Referência a `WEBHOOK_SETUP.md` na UI — information disclosure de arquivo interno |
| 5 | 🟡 MÉDIO | Email do proprietário (Super Admin) exposto sem mascaramento na tabela de equipe |
| 6 | 🟡 MÉDIO | Sem captura de IP nos logs — impossível rastrear ações suspeitas por origem |
| 7 | 🟡 MÉDIO | URL de webhook diferente da URL real do site — possível misconfiguration de integração |
| 8 | 🟢 BAIXO | Erros Supabase com user_id vazio — queries sem validação de input podem ser symptom de auth gaps |
| 9 | 🟢 BAIXO | Race conditions em contadores — podem indicar timing issues mais profundos no auth flow |
| 10 | 🟢 BAIXO | Sidebar exibindo "Usuário / Administrador" como placeholder — possível indicativo de user context não sendo injetado |

---

## 11. Notas do Sistema (0-10)

| Dimensão | Nota | Justificativa |
|---|---|---|
| **Visual** | 7.5/10 | Tema dark futurista coeso e bem executado. Glassmorphism consistente. Prejudicado por badges de dev, toasts presos e estados enganosos. |
| **Usabilidade** | 5.5/10 | Navegação intuitiva mas 2 core features financeiras quebradas, SAC inutilizável e vários estados vazios sem orientação. |
| **Organização** | 6.5/10 | Estrutura de módulos bem pensada. Grupos de sidebar claros. Prejudicada por inconsistências de nomenclatura e placeholders visíveis. |
| **Robustez** | 6.0/10 | Integração ML funcional e dados reais carregando. Race conditions, queries com user_id vazio e toasts presos indicam falta de tratamento de edge cases. |
| **Segurança** | 5.0/10 | PII exposto sem mascaramento, Mixed Content, referência a arquivos internos na UI, ausência de captura de IP. |
| **Experiência Geral** | 6.0/10 | Plataforma tem potencial claro e base sólida. Problemas críticos em módulos-chave comprometem a experiência de um usuário que paga pelo serviço. |

---

## 12. Plano de Ação — Ordem de Execução

### Fase 1 — Corrigir IMEDIATAMENTE (1-2 dias) 🔴

**Bugs críticos + segurança + produção quebrada:**

1. **CORRIGIR:** Seletor de período no Financeiro (`periodsLoading` nunca resolve para false)
2. **CORRIGIR:** Seletor de período na Conciliação (mesmo bug)
3. **CORRIGIR:** Query Supabase com user_id vazio em NF-e (aguardar `profile.id` disponível)
4. **CORRIGIR:** Query Supabase com user_id vazio no Contador (mesma correção)
5. **REMOVER:** Toast de sincronização preso em Produtos
6. **REMOVER:** Badge "Dev" do item Expedição na sidebar (badge de desenvolvimento em produção)
7. **MASCARAR:** Emails de usuários em `/admin/usuarios` (exibir `l***@hotmail.com` por padrão)
8. **MASCARAR:** Emails nos logs de auditoria em `/admin/logs`
9. **CORRIGIR:** URL do webhook para usar `www` consistente com a URL real do site

### Fase 2 — Corrigir em Breve (1-2 semanas) 🟡

**Qualidade, confiança e inconsistências:**

10. **CORRIGIR:** HTML inválido (`<main>` aninhado) em Promoções
11. **CORRIGIR:** Lógica de estado vazio em Reviews (0 avaliações não deve mostrar "Excelente!")
12. **CORRIGIR:** Status ML falso em admin/ferramentas (mostrar contagem real de conexões)
13. **RESOLVER:** Mixed Content em vendas-por-anuncio (proxy via CDN HTTPS ou usar endpoints HTTPS do ML)
14. **REMOVER:** Referência a `WEBHOOK_SETUP.md` da UI do admin/webhooks
15. **REMOVER:** Card placeholder "Mais ferramentas em breve" em admin/ferramentas
16. **CORRIGIR:** Race condition no contador de eventos em admin/logs
17. **ATUALIZAR:** Roadmap da landing para 2026
18. **SINCRONIZAR:** Número de planos entre landing e `/planos`
19. **CORRIGIR:** Sidebar user section — exibir nome real do usuário em todas as views
20. **CORRIGIR:** Sidebar admin — exibir nome real do admin ao invés de "Admin/admin"
21. **IMPLEMENTAR:** Captura de IP nos logs de auditoria

### Fase 3 — Melhorias Futuras (1 mês) 🟢

**Maturidade de produto e polish:**

22. Implementar skeleton loaders consistentes em todas as páginas
23. Sistema de feature flags para ocultar módulos incompletos em produção automaticamente
24. CTAs orientativos em todos os estados vazios (ao invés de apenas "Nenhum dado encontrado")
25. Feedback visual completo nos botões de ação (loading → sucesso → erro)
26. Exportação de dados (CSV/PDF) em Relatórios e tabelas principais
27. Drill-down clicável em Performance de anúncios
28. Ações operacionais na página de Clientes (mensagem, histórico de pedidos)
29. Fluxo completo de convite de contador
30. Revisão de acessibilidade — substituir emojis funcionais em dropdowns por ícones SVG
31. Auditoria completa de todas as queries Supabase para garantir validação de user_id
32. Implementar máscaras de PII com toggle de revelação auditado (compliance LGPD completa)
33. Paginação consistente em todas as tabelas de dados

---

## Apêndice: Estado por Página

| Página | Status | Problemas Principais |
|---|---|---|
| `/` (landing) | ⚠️ OK com issues | Roadmap desatualizado (2025), inconsistência de planos (3 vs 4) |
| `/planos` | ✅ OK | 4 planos — inconsistente com landing |
| `/login` | ✅ OK | Sem problemas observados |
| `/dashboard` | ✅ OK | Dados reais ML, sidebar footer com placeholder |
| `/dashboard/produtos` | ⚠️ Toast preso | Toast de sincronização permanente |
| `/dashboard/precificacao` | ✅ OK | Funcional |
| `/dashboard/listagens` | ✅ OK | Funcional |
| `/dashboard/estoque` | ✅ OK | Novo módulo funcional |
| `/dashboard/financeiro` | 🔴 QUEBRADO | Seletor de período disabled permanentemente |
| `/dashboard/conciliacao` | 🔴 QUEBRADO | Seletor de período disabled permanentemente |
| `/dashboard/pedidos` | ✅ OK | Dados reais carregando |
| `/dashboard/packs` | ⚠️ Vazio | Estado vazio sparse sem CTA |
| `/dashboard/promocoes` | ⚠️ HTML inválido | `<main>` aninhado |
| `/dashboard/pos-venda` | ✅ OK | Dados reais ML |
| `/dashboard/sac` | 🔴 BLOQUEADO | Badge "Em breve" em feature core |
| `/dashboard/reclamacoes` | ✅ OK | Dados reais ML |
| `/dashboard/expedicao` | ⚠️ Badge Dev | Label Dev em produção |
| `/dashboard/nfe` | 🔴 Erros | Supabase user_id vazio, 2 erros de console |
| `/dashboard/integracoes` | ✅ OK | ML ativo |
| `/dashboard/performance` | ⚠️ Sem drill-down | Funcional mas superficial |
| `/dashboard/relatorios` | ⚠️ Sem export | Dados sem exportação |
| `/dashboard/reputacao` | ✅ OK | Dados reais: FIOCABANA, MercadoLíder Silver |
| `/dashboard/vendas-por-anuncio` | ⚠️ Mixed Content | 20 warnings de HTTP em HTTPS |
| `/dashboard/concorrentes` | ⚠️ Aba vazia | Segunda aba sem conteúdo |
| `/dashboard/reviews` | ⚠️ KPI enganoso | "Excelente!" com 0.0 estrelas |
| `/dashboard/clientes` | ⚠️ Sem ações | Dados ML mas sem interatividade |
| `/dashboard/equipe` | ✅ OK | Funcional |
| `/dashboard/contador` | ⚠️ Erros | Supabase user_id vazio |
| `/dashboard/notificacoes` | ✅ OK | Funcional |
| `/dashboard/configuracoes` | ✅ OK | Funcional (após fix do updated_at) |
| `/dashboard/ajuda` | ✅ OK | Central de ajuda presente |
| `/admin` | ✅ OK | KPIs reais (3 usuários) |
| `/admin/usuarios` | 🔴 SEC | PII exposto sem mascaramento |
| `/admin/equipe` | ⚠️ SEC | Email Super Admin exposto |
| `/admin/tickets` | ✅ OK | Estado vazio adequado |
| `/admin/cancelamentos` | ✅ OK | Estado vazio adequado |
| `/admin/notificacoes` | ✅ OK | Formulário funcional |
| `/admin/logs` | ⚠️ SEC + Race | PII em logs, race condition contador |
| `/admin/ferramentas` | ⚠️ Status falso | ML mostra 0 contas sendo falso, placeholder "Em breve" |
| `/admin/webhooks` | ⚠️ Ref interna | Referência a WEBHOOK_SETUP.md, URL sem www |

---

*Relatório gerado em 17/03/2026 via auditoria automatizada com Playwright — leitura passiva, sem modificações de código ou dados.*
