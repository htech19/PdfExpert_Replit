<<<<<<< HEAD
# PdfExpert v8

Plataforma SaaS para processamento automatizado de catálogos PDF — extração de imagens, OCR, correção de nomes de produtos via IA e exportação para e-commerce.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Express 5 + Node.js 24 |
| Banco de dados | PostgreSQL + Drizzle ORM |
| Validação | Zod + OpenAPI (Orval codegen) |
| Gerenciador de pacotes | pnpm (monorepo) |

---

## 1. Rodar local (Windows)

### Pré-requisitos

1. **Node.js 24** — baixe em https://nodejs.org (escolha a versão LTS mais recente 22+ ou 24)
2. **pnpm** — após instalar o Node, execute no PowerShell:
   ```powershell
   npm install -g pnpm
   ```
3. **PostgreSQL** — duas opções:
   - Local: https://www.postgresql.org/download/windows/
   - Cloud gratuita (recomendado para começar): https://neon.tech — crie um projeto e copie a connection string

### Configurar variáveis de ambiente

Crie o arquivo `artifacts/api-server/.env`:
```env
PORT=8080
DATABASE_URL=postgresql://SEU_USER:SUA_SENHA@localhost:5432/pdfexpert
SESSION_SECRET=uma-string-longa-e-aleatoria-aqui
NODE_ENV=development
```

Crie o arquivo `artifacts/pdf-expert/.env`:
```env
PORT=3000
BASE_PATH=/
```

> Se o banco for remoto (Neon, Supabase etc.), use a connection string fornecida por eles no `DATABASE_URL`.

### Instalar dependências e preparar o banco

Abra o PowerShell na raiz do projeto:

```powershell
# 1. Instalar todas as dependências
pnpm install

# 2. Criar as tabelas no banco
pnpm --filter @workspace/db run push
```

### Rodar os dois serviços

Abra **dois terminais** separados:

**Terminal 1 — API:**
```powershell
pnpm --filter @workspace/api-server run dev
# Roda em http://localhost:8080
```

**Terminal 2 — Frontend:**
```powershell
pnpm --filter @workspace/pdf-expert run dev
# Abre em http://localhost:3000
```

> **Nota Windows**: se aparecer erro de permissão no PowerShell, execute `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` e tente novamente.

### Testar o upload de PDF

1. Acesse http://localhost:3000
2. Clique em **Queue & Jobs** → **+ New Job**
3. Arraste um PDF ou clique para selecionar
4. Clique em **Upload & Queue PDF**
5. Clique no botão ▶ para iniciar o processamento

---

## 2. Publicar no GitHub

```bash
# Na raiz do projeto:
git init
git add .
git commit -m "feat: PdfExpert v8 initial commit"

# Crie um repositório em https://github.com/new (sem README)
# Depois execute:
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git branch -M main
git push -u origin main
```

---

## 3. Deploy — Vercel (Frontend) + Railway (API) + Neon (Banco)

### 3.1 Banco de dados — Neon (grátis)

1. Acesse https://neon.tech e crie uma conta
2. Crie um novo projeto (escolha a região mais próxima)
3. Copie a **Connection String** (formato: `postgresql://user:pass@host/dbname?sslmode=require`)
4. Guarde — você vai usar essa string nos próximos passos

### 3.2 API — Railway

1. Acesse https://railway.app e conecte com GitHub
2. Clique em **New Project → Deploy from GitHub repo**
3. Selecione seu repositório
4. Nas configurações do serviço, adicione as variáveis de ambiente:

   | Variável | Valor |
   |----------|-------|
   | `DATABASE_URL` | sua connection string do Neon |
   | `SESSION_SECRET` | string aleatória longa |
   | `NODE_ENV` | `production` |
   | `PORT` | `8080` |

5. Railway vai detectar o `railway.toml` e fazer o build automaticamente
6. Após o deploy, copie a **URL pública** gerada (ex: `https://pdfexpert-api.railway.app`)

> **Importante**: após o primeiro deploy da API, rode as migrations:
> Localmente com o DATABASE_URL do Neon:
> ```bash
> DATABASE_URL="sua-connection-string-neon" pnpm --filter @workspace/db run push
> ```

### 3.3 Frontend — Vercel

1. Acesse https://vercel.com e conecte com GitHub
2. Clique em **Add New Project → Import Git Repository**
3. Selecione seu repositório
4. A Vercel vai detectar o `vercel.json` automaticamente
5. Adicione as variáveis de ambiente:

   | Variável | Valor |
   |----------|-------|
   | `PORT` | `3000` |
   | `BASE_PATH` | `/` |
   | `VITE_API_URL` | URL da API no Railway (ex: `https://pdfexpert-api.railway.app`) |

6. Clique em **Deploy**

---

## Comandos úteis

```bash
# Instalar dependências
pnpm install

# Verificar tipos (TypeScript)
pnpm run typecheck

# Gerar código a partir do OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Aplicar mudanças de schema no banco
pnpm --filter @workspace/db run push

# Build completo
pnpm run build
```

## Estrutura do projetO

```
├── artifacts/
│   ├── api-server/          # Express API (porta 8080)
│   │   ├── src/routes/      # Endpoints: jobs, products, stats, logs, exports, upload
│   │   ├── src/lib/         # processor.ts (simulação), logger-db.ts
│   │   └── uploads/         # PDFs enviados (local)
│   └── pdf-expert/          # Frontend React + Vite (porta 3000)
│       └── src/pages/       # dashboard, jobs, products, export, logs
├── lib/
│   ├── api-spec/            # openapi.yaml (fonte da verdade da API)
│   ├── api-client-react/    # Hooks React Query (gerado pelo Orval)
│   ├── api-zod/             # Schemas Zod (gerado pelo Orval)
│   └── db/                  # Schema Drizzle ORM + migrations
├── vercel.json              # Config deploy frontend (Vercel)
├── railway.toml             # Config deploy API (Railway)
└── .env.example             # Exemplo de variáveis de ambiente
```
=======
# PdfExpert_Replit
>>>>>>> d71f13ca3929f56da651523c478dcb035c787e43
