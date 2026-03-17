# Configurar Webhooks no ML Developer Center

## Pré-requisito
A URL já está implementada e pronta em produção:
```
https://foguetim.com.br/api/webhooks/mercadolivre
```

## Passos

1. Acesse https://developers.mercadolivre.com.br/devcenter
2. Clique no app **Foguetim** (Application ID: `6064698396681929`)
3. Vá em **"Notificações"** ou **"Tópicos de notificação"**
4. Em **"URL de notificação"**, insira:
   ```
   https://foguetim.com.br/api/webhooks/mercadolivre
   ```
5. Selecione os tópicos:
   - [x] `orders_v2` — Pedidos novos ou atualizados
   - [x] `questions` — Perguntas de compradores
   - [x] `claims` — Reclamações abertas
   - [x] `messages` — Mensagens do centro de mensagens
   - [x] `shipments` — Atualizações de envio
   - [x] `items` — Anúncios modificados/pausados pelo ML
   - [x] `payments` — Pagamentos confirmados/recusados
6. Clique em **Salvar**

## Como verificar
- O ML fará um GET na URL para validar — deve retornar `{"ok": true}`
- Após configurar, acesse `/admin/webhooks` para monitorar os eventos em tempo real

## Comportamento
- O endpoint responde `200` em menos de 500ms (conforme exigência do ML)
- O processamento (notificações, logs) é feito de forma assíncrona em background
- Todos os webhooks são salvos na tabela `webhook_queue` para auditoria
- Em caso de falha no processamento, o ML reenvia automaticamente (até 3 tentativas)

## Tópicos e o que disparam
| Tópico | Ação no Foguetim |
|--------|-----------------|
| `orders_v2` | Notificação de novo pedido + log |
| `questions` | Notificação de nova pergunta |
| `claims` | Notificação de alerta de reclamação |
| `messages` | Notificação de nova mensagem |
| `shipments` | Log de atualização de envio |
| `items` | Log de modificação de anúncio |
| `payments` | Notificação de pagamento confirmado |
