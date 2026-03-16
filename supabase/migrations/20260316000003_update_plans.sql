-- Remove planos antigos (piloto, crescimento) e adiciona novos planos
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users ADD CONSTRAINT users_plan_check
  CHECK (plan = ANY (ARRAY[
    'explorador','comandante','almirante',
    'missao_espacial','enterprise'
  ]));
