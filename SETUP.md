# Foguetim ERP — Setup Guide

## Requisitos

- Node.js 18+
- npm
- Conta no [Supabase](https://supabase.com) (gratuita)
- Conta na [Vercel](https://vercel.com) (para deploy)

---

## 1. Configurar o Supabase

### 1.1 Criar projeto

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Anote a **URL** e a **anon key** (em Project Settings → API)

### 1.2 Criar as tabelas

1. Vá em **SQL Editor** no painel do Supabase
2. Cole o conteúdo de `supabase-schema.sql` e execute
3. Isso criará todas as tabelas, políticas RLS e o trigger de criação de usuário

---

## 2. Variáveis de Ambiente

### Desenvolvimento local

Crie (ou edite) o arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

> Sem essas variáveis (ou com os valores placeholder), o app roda em **modo dev** com dados mock — nenhum banco de dados necessário.

### Vercel (produção)

1. Acesse seu projeto na [Vercel](https://vercel.com)
2. Vá em **Settings → Environment Variables**
3. Adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` → URL do seu projeto Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Anon key do seu projeto Supabase
4. Faça redeploy para as variáveis entrarem em vigor

---

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`

- **Sem Supabase configurado**: o app usa dados mock, login é simulado (qualquer senha funciona)
- **Com Supabase configurado**: autenticação real, dados persistidos no banco

---

## 4. Deploy na Vercel

```bash
git push origin main
```

A Vercel faz deploy automático a cada push na branch `main`.

---

## 5. Estrutura das Tabelas

| Tabela | Descrição |
|--------|-----------|
| `users` | Perfis de usuário (sincronizado com Supabase Auth) |
| `products` | Catálogo de produtos |
| `product_marketplaces` | Listagens por marketplace (ML, Shopee, Amazon, etc.) |
| `stock_movements` | Histórico de movimentações de estoque |
| `orders` | Pedidos (para uso futuro) |
| `finances` | Lançamentos financeiros (para uso futuro) |
| `customers` | Clientes (para uso futuro) |
| `team_members` | Membros da equipe (para uso futuro) |

---

## 6. Autenticação

O app usa **Supabase Auth** com email + senha:

- `/login` — Login com email/senha
- `/registro` — Cadastro com nome, empresa e plano
- `/dashboard/*` — Rotas protegidas (requerem login)

Em modo dev (sem Supabase), um usuário mock é usado automaticamente.
