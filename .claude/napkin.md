# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)

1. **[2026-03-16] Always read file before Edit tool**
   Do instead: Read the file (or the relevant portion) before calling Edit — otherwise Edit fails with "File has not been read yet".

2. **[2026-03-16] Stop hook requires preview verification after every file edit**
   Do instead: After editing any file while preview server is running, navigate to the page and take a screenshot with preview tools to confirm no new errors before moving on.

3. **[2026-03-16] npx tsc --noEmit before every commit**
   Do instead: Run `npx tsc --noEmit` and fix all errors before committing. Never push with TS errors.

4. **[2026-03-16] git add . && commit in Portuguese after every fix batch**
   Do instead: After fixing bugs, run `git add . && git commit -m "fix: ..." && git push` automatically without waiting to be asked.

## Shell & Command Reliability

1. **[2026-03-16] browser_resize MCP tool rejects string numbers**
   Do instead: Use `browser_run_code` with `page.setViewportSize({ width: 390, height: 844 })` for mobile viewport simulation.

2. **[2026-03-16] browser_evaluate requires "function" param, not "code"**
   Do instead: Use `browser_evaluate` with `function: "() => { ... }"` or use `browser_run_code` for complex JS.

## Domain Behavior Guardrails

1. **[2026-03-16] REGRA: Mercado Livre é o único marketplace ativo**
   Do instead: Nunca mencionar Shopee, Amazon, Magalu ou TikTok Shop por nome em páginas públicas ou dashboard. Usar "Novas integrações em breve" para qualquer outro marketplace.

2. **[2026-03-16] Planos corretos: Explorador (Grátis, 10 produtos), sem "Piloto" nem "Comandante"**
   Do instead: Ao editar qualquer página de planos/registro, usar apenas os planos definidos em PlanContext. Limite Explorador = 10 produtos (não 50).

3. **[2026-03-16] Dashboard page.tsx usa layout diferente do Header compartilhado**
   Do instead: Ao adicionar header ao /dashboard, verificar se a página usa o Header component ou tem header próprio — pode estar faltando o hambúrguer mobile.

## User Directives

1. **[2026-03-16] Comunicação direta e concisa, sem enrolação**
   Do instead: Responder direto ao ponto, sem preâmbulos ou sumários desnecessários.

2. **[2026-03-16] Após qualquer alteração: git add + commit em português + push automaticamente**
   Do instead: Sempre commitar e fazer push após alterações de arquivo, sem precisar ser solicitado.
