# DonForms — Project Context & Architecture

Este arquivo serve como contexto unificado tanto para o **Claude Code** quanto para o **Antigravity**.

---

## 1. Visão Geral do Projeto
* **Nome**: DonForms (`donforms`)
* **Stack**: Next.js 15 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS, Vite/Vitest para testes unitários.
* **Repositório GitHub**: [williamcalifa2/donforms](https://github.com/williamcalifa2/donforms.git)
* **Branch principal**: `main`

---

## 2. Integrações e Serviços

### 🐙 GitHub
* **Repositório**: `https://github.com/williamcalifa2/donforms.git`
* **Usuário**: `williamcalifa2` (`williamcalifa@icloud.com`)
* Padrão de commits semânticos: `feat:`, `fix:`, `refactor:`, `chore:`.

### ⚡ Supabase
* **Project ID**: `cpnwkmmhtjllcyruvqek`
* **Diretório de Migrations**: `supabase/migrations/`
  * `001_donforms_init.sql`: estrutura inicial de tabelas (formulários, campos, submissões)
  * `002_kanban_status.sql`: campos para visualização kanban
  * `003_form_history.sql`: versionamento e histórico de alterações
  * `004_form_events.sql`: telemetria de visualizações e interações
  * `005_form_uploads_bucket.sql`: bucket de storage para arquivos anexados
  * `006_workspaces.sql`: gestão de organizações e times
  * `007_webhook_logs.sql`: registro de disparos de webhooks
* **Geração de Tipos**:
  ```bash
  npm run db:types
  ```
* **Bibliotecas**: `@supabase/ssr` e `@supabase/supabase-js`.

### ▲ Vercel
* **Projeto**: `donforms`
* **Project ID**: `prj_KS66g5GYJUpm9Zp5PrCWn3JWyzUK`
* **Team ID**: `team_MwsBqkeALRVG7uqqcUBTxbqK`
* **Configuração**: `vercel.json` e `.vercel/project.json`
* Deploy e status podem ser inspecionados via Vercel CLI (`npx vercel`).

### ✉️ Resend
* Utilizado para envio de e-mails transacionais:
  * Notificações de nova resposta de formulário (`src/app/api/forms/[formId]/submit/route.ts`)
  * Convites para workspaces e membros (`src/app/api/workspace/invite/route.ts` e `src/app/actions/projects.ts`)
* **Variáveis de Ambiente**:
  * `RESEND_API_KEY`: Chave da API do Resend (`re_...`)
  * `RESEND_FROM_EMAIL`: Remetente padrão (ex: `DonForms <onboarding@resend.dev>` ou domínio verificado).

---

## 3. Scripts e Comandos Frequentes
* `npm run dev`: Inicia servidor local em `http://localhost:3000` com Turbopack.
* `npm run build`: Valida o build do Next.js.
* `npm run typecheck`: Validação estrita de tipagem TypeScript (`tsc --noEmit`).
* `npm run test`: Executa a suíte de testes com Vitest.
* `npm run db:types`: Atualiza os tipos TypeScript do Supabase em `src/types/database.types.ts`.
