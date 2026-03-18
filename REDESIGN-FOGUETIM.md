# RELATÓRIO DE REDESIGN — FOGUETIM ERP
Data: 2026-03-17

---

## 1. Maturidade Visual Atual

**Nível geral: 6/10**

### Forças do dashboard
- Tema escuro consistente com paleta definida (navy/purple/cyan)
- Sistema de tokens CSS bem estruturado em globals.css com variáveis `--bg-*`, `--text-*`
- Dark/light mode implementado com `theme-dark` / `theme-light` classes
- Sidebar funcional com navegação agrupada e estados ativos
- Header com notificações, busca e toggle de tema
- Componentes como `dash-card`, `dash-badge`, `dash-input` consistentes dentro do padrão

### Fraquezas visuais
- Sidebar com 20+ itens planos — sem hierarquia de marketplace, parece uma lista genérica de admin
- "Pós-Venda" com badge "Novo" e "SAC" e "Reclamações" separados — triplicidade desnecessária
- KPI cards do Dashboard têm pouca hierarquia visual — o número grande não destaca
- Muitas páginas mostram "Mercado Livre não conectado" com tela vazia — desperdício de espaço
- "Em breve" e "Breve" usados de formas diferentes (inconsistência de copy)
- Ícones emoji (🔴 🟡 🔵) misturados com Lucide — inconsistência de sistema de ícones
- Pedidos: header da página não usa o componente Header padrão, tem layout próprio
- Produtos: 5 alertas banner visíveis com count zero — muito ruído visual quando não há dados
- Sidebar: seção "Suporte" com apenas 1 item (Central de Ajuda) — desperdiça espaço vertical
- Logo do "Foguetim" muito pequeno e sem personalidade forte
- Versão "ERP v1.0" em cinza muito sutil na sidebar — parece placeholder
- Plan widget na sidebar usa "Carregando..." como texto estático de fallback (parece bug)

---

## 2. Problemas Encontrados

### UX e usabilidade
- Páginas que dependem de ML conectado (Estoque, Financeiro) mostram tela completamente vazia sem CTA prominente
- Pedidos mostra "Erro ao carregar — Unauthorized" em vez de fluxo de conexão limpo
- Dashboard mostra "0" em todos KPIs sem contexto — usuário não entende se é erro ou estado real
- Botões "Importar", "Exportar", "Sincronizar" em Produtos têm badge "Em breve" mas ficam ativos e clicáveis (confuso)
- Alertas de produtos com count zero são ruído desnecessário — deveriam ser escondidos quando count = 0
- "Foguetim AI" flutua sobre conteúdo em páginas com tabelas — pode sobrepor dados

### Arquitetura de navegação / sidebar
- Mistura de itens de marketplace-específicos (Pós-Venda, Reputação, Saúde) com itens genéricos (Financeiro, Produtos) no mesmo nível
- Itens duplicados de pós-venda: "Pós-Venda", "SAC" e "Reclamações" são funcionalmente similares
- Sem agrupamento visual por marketplace — se hoje é ML-only, deveria ser explícito
- "Conciliação" no grupo "Principal" não faz sentido — é financeiro
- "Publicidade" em Análise mas não aparece para usuário comum (roles)
- "NF-e" em Operação mas filtrado por roles — cria lacuna visual na lista
- Seção "Suporte" com 1 item: desperdício de espaço de sidebar
- Não há separação visual clara entre "ferramentas de marketplace" vs "ferramentas internas"
- Ausência de indicador visual de qual marketplace está ativo/selecionado

### Organização de páginas
- Dashboard mistura overview de ML com ações rápidas e avisos de sistema — falta de foco
- Produtos tem 2 abas (Cadastrados Localmente / Mercado Livre) mas ambas mostram vazio
- Precificação é uma calculadora avançada mas acessível diretamente do Principal — deveria estar em Mercado Livre ou como ferramenta

### Hierarquia visual
- Todos os headers de seção usam o mesmo peso visual — sem diferença entre seção primária e secundária
- Cards KPI do dashboard têm ícone, label e número mas o número não é o elemento mais saliente
- Breadcrumbs inexistentes — impossível saber profundidade na hierarquia
- Os h1/h2 variam entre páginas (Pedidos usa h1, outros usam h2) — inconsistência

### Duplicidades e redundâncias
- Pós-Venda + SAC + Reclamações: três itens de sidebar para funcionalidade similar
- Header duplica informação do sidebar (user info aparece em ambos)
- "Fazer upgrade" aparece na sidebar e o plano aparece no sidebar — poderia ser mais sutil
- "Novo" badge em Pós-Venda junto com count de reclamações laranja (dois badges no mesmo item)

### Componentes inconsistentes
- Alguns botões usam `.btn-accent`, outros usam classes Tailwind diretas
- Badges usam classes `dash-badge db-*` e `badge badge-*` (duas famílias diferentes)
- Inputs usam `.dash-input`, `.input-cyber` e classes Tailwind nativas — três padrões
- Estoque usa emojis como status badges (🔴🟡🔵🟢) em vez de componentes visuais
- Pedidos tem header diferente dos outros — usa `h1` com user avatar próprio no canto

### Mobile
- Sidebar colapsa corretamente com hamburger mas o hamburger está no Header, não em posição fixa
- Pedidos: header do mobile mostra avatar + tabs de marketplace mas sem busca ou filtros
- KPIs no dashboard: provavelmente quebram em grid de 1-col no mobile (muito scroll)
- Tabelas sem wrapper de scroll horizontal explícito

### Light mode
- Funcional mas incompleto: alguns elementos ficam com contraste ruim
- `text-slate-600` no light fica cinza claro em fundo branco — passa do mínimo de contraste
- Badges coloridas ficam com cores lavadas no light (transparências muito sutis)
- Sidebar light mode: seção labels ficam invisíveis (dark text sobre light bg mas cor errada)

### Dark mode
- Sólido. Melhor experiência atual.
- `--bg-main: #0f1117` bom, mas `dash-card: #1c2233` e `bg-dark-900: ?` — dois sistemas paralelos de definição de cor
- Hover states de tabela quase invisíveis (`rgba(255,255,255,0.03)`)

### Pontos com cara de genérico/amador
- Placeholder "Gráfico em desenvolvimento" no Dashboard — caixa de placeholder vazia
- "Os pedidos são carregados diretamente da API do Mercado Livre" como conteúdo de card
- Badge "Novo" em verde próximo a badge count de alerta laranja — caos visual
- Ícones emoji inline no código (🔴🟡🔵🟢) em vez de SVG ou Lucide
- "Central de Ajuda" como seção própria com 1 item no footer da sidebar
- Plan widget com "Carregando..." como texto permanente (auth carregando lento)
- Footer de sidebar "ERP v1.0" em cinza minúsculo — parece esquecido
- Integrations page: emojis de países/cores como logos de marketplace (🟡 para ML, 🟠 para Shopee)

---

## 3. Oportunidades

### Quick wins (alto impacto, baixo esforço)
1. Reorganizar sidebar em grupos: VISÃO GERAL / MERCADO LIVRE / ANÁLISE / SISTEMA
2. Remover/merge SAC + Reclamações dentro de Pós-Venda (ou manter mas colapsar)
3. Esconder alertas de Produtos quando count = 0
4. Adicionar indicador visual de marketplace (ponto amarelo ML) nas seções
5. Padronizar heading level (h1 em todas as páginas)
6. Melhorar estado vazio das páginas ML-dependentes com CTA mais visual
7. Corrigir badge "Novo" + badge count redundantes em Pós-Venda

### Melhorias estruturais
1. Criar sistema de "marketplace pill" — botão que indica ML está ativo e permite troca futura
2. Sidebar com seções colapsáveis para preparar multi-marketplace
3. Placeholder visual para Shopee/Amazon ("Em breve") com estilo de card desabilitado
4. Padronizar sistema de badges para um único padrão
5. Criar componente `<PageHeader>` reutilizável com title, subtitle, actions
6. Breadcrumbs em páginas de segundo nível

### Preparação para escalabilidade
1. Estrutura de sidebar por marketplace → quando Shopee chegar, só adicionar seção colapsada
2. Componente de "marketplace não conectado" reutilizável entre páginas
3. Tokens de cor semânticos (success/error/warning/info) além dos tokens de brand

---

## 4. Priorização

### Crítico (corrigir antes de expandir)
- Sidebar reorganização em grupos marketplace-first
- Merge de SAC + Reclamações em Pós-Venda (ou remoção de duplicatas)
- Estado vazio das páginas ML-dependentes (Estoque, Financeiro, Pedidos) mais claro
- Alertas de Produtos zerados: esconder quando count = 0
- Inconsistência de heading level entre páginas (h1 vs h2)

### Importante (corrigir em breve)
- Emojis → Lucide icons nas páginas de Estoque e Integrações
- Light mode: melhorar contraste de labels e badges
- Integrations: "Em breve" Shopee/Amazon com visual de card desabilitado mais polido
- Padronizar sistema de botões (btn-accent em toda parte)
- Tabelas: garantir scroll horizontal no mobile

### Refinamento (polish futuro)
- Animações de entrada mais suaves nas páginas
- Recharts com tooltips customizados no tema
- Microinterações nos estados hover de sidebar
- Logo com versão mais marcante
- Foguetim AI button: tornar colapsável ou menor em mobile

---

## 5. Plano de Execução

### Etapa 1 — Sidebar (maior impacto visual imediato)
Reorganizar navGroups para: VISÃO GERAL → MERCADO LIVRE (com dot indicator) → ANÁLISE → SISTEMA
Remover itens duplicados, adicionar placeholders Shopee/Amazon.

### Etapa 2 — globals.css
Adicionar classes utilitárias padronizadas: `.page-header`, `.stat-card`, `.filter-bar`, `.section-title`.
Refinar hierarquia de background layers. Corrigir light mode contraste.

### Etapa 3 — Padronização de páginas
Garantir padrão consistente: header → filtros → conteúdo.
Esconder alertas com count zero em Produtos.
Unificar heading level para h1 em todas as páginas.

### Etapa 4 — Mobile e acessibilidade
Wrapper de scroll horizontal em tabelas.
KPI grids 2-col no mobile.
Verificar contraste mínimo no light mode.

### Etapa 5 — Integrações e estados vazios
Polir cards de Shopee/Amazon no integrations.
Melhorar empty states das páginas ML-dependentes.
