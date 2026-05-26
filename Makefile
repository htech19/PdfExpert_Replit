# PdfExpert v8 — Atalhos de comandos
# Uso: make <comando>
# Requer: make (Linux/Mac) ou chocolatey/winget make (Windows)

.PHONY: install setup db api web dev typecheck build help

help: ## Mostra esta ajuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Instala todas as dependências
	pnpm install

setup: install ## Copia .env.example → .env e instala dependências
	@[ -f artifacts/api-server/.env ] || cp artifacts/api-server/.env.example artifacts/api-server/.env && echo "Criado artifacts/api-server/.env — edite o DATABASE_URL!"
	@[ -f artifacts/pdf-expert/.env ] || cp artifacts/pdf-expert/.env.example artifacts/pdf-expert/.env && echo "Criado artifacts/pdf-expert/.env"

db: ## Cria / atualiza tabelas no banco (requer DATABASE_URL em .env)
	pnpm --filter @workspace/db run push

api: ## Inicia o servidor da API (porta 8080)
	pnpm --filter @workspace/api-server run dev

web: ## Inicia o frontend (porta 3000)
	pnpm --filter @workspace/pdf-expert run dev

typecheck: ## Verifica tipos TypeScript
	pnpm run typecheck

build: ## Build completo (libs + api + frontend)
	pnpm run typecheck:libs && \
	PORT=3000 BASE_PATH=/ pnpm --filter @workspace/pdf-expert run build && \
	pnpm --filter @workspace/api-server run build

codegen: ## Regenera hooks e schemas a partir do OpenAPI spec
	pnpm --filter @workspace/api-spec run codegen

docker-db: ## Sobe o PostgreSQL local via Docker
	docker-compose up -d postgres
	@echo "Banco disponível em postgresql://postgres:postgres@localhost:5432/pdfexpert"
