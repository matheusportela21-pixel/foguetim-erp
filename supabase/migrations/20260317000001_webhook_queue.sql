-- Fila de webhooks do Mercado Livre
-- Armazena todos os webhooks recebidos para processamento assíncrono e auditoria

CREATE TABLE IF NOT EXISTS webhook_queue (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  topic          text        NOT NULL,
  resource       text        NOT NULL,
  user_id        text        NOT NULL,
  application_id text,
  payload        jsonb       NOT NULL,
  status         text        DEFAULT 'pending', -- pending, processing, done, error
  error_message  text,
  attempts       integer     DEFAULT 0,
  processed_at   timestamptz,
  received_at    timestamptz DEFAULT now(),
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_queue_status_idx   ON webhook_queue(status);
CREATE INDEX IF NOT EXISTS webhook_queue_topic_idx    ON webhook_queue(topic);
CREATE INDEX IF NOT EXISTS webhook_queue_user_idx     ON webhook_queue(user_id);
CREATE INDEX IF NOT EXISTS webhook_queue_received_idx ON webhook_queue(received_at DESC);

-- Somente service_role acessa (via supabaseAdmin) — sem acesso anon/user
ALTER TABLE webhook_queue ENABLE ROW LEVEL SECURITY;
