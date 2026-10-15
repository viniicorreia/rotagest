# rotagest-web

Frontend da plataforma **RotaGest** (SaaS multiempresa de gestão financeira para transportes): React, Vite, TypeScript, Tailwind CSS, componentes no padrão shadcn/ui, TanStack Query, React Router, React Hook Form e Zod.

Este repositório contém só a interface. Todas as regras de negócio, autorização, isolamento entre empresas e persistência ficam no repositório independente **rotagest-api**, consumido exclusivamente por HTTP/JSON em `/api/v1`. Não há Prisma, acesso a banco nem regras financeiras críticas aqui.

## Estrutura

```
src/
  api/
    client.ts      cliente HTTP único: VITE_API_URL, Bearer, renovação de sessão, erros padronizados
    schema.d.ts    tipos GERADOS do contrato OpenAPI da API (não editar à mão)
    types.ts       aliases legíveis dos tipos gerados
  app/             rotas, providers e guards (autenticação, empresa ativa, permissão)
  components/
    ui/            componentes no padrão shadcn/ui (Radix + Tailwind + CVA)
    layout/        sidebar recolhível, bottom navigation, topo, seletor de empresa
  lib/             sessão (token só em memória), tema, validações de formulário
  features/        auth, companies, dashboard, invitations, settings, subscriptions, team
```

## Executar localmente

Pré-requisitos: Node 22+ e a **rotagest-api** rodando (veja o README dela).

```bash
npm install
cp .env.example .env            # VITE_API_URL=http://localhost:3000/api/v1
npm run dev                     # http://localhost:5173
```

Na API, `CORS_ORIGINS` e `WEB_URL` devem apontar para `http://localhost:5173`.

## Tipos a partir do contrato OpenAPI

Os tipos de requisição e resposta vêm do OpenAPI publicado pela API, sem DTOs duplicados à mão:

```bash
npm run api:types                                            # lê http://localhost:3000/api/docs-json
OPENAPI_SOURCE=../rotagest-api/openapi.json npm run api:types # ou a partir do arquivo versionado
```

O resultado (`src/api/schema.d.ts`) é versionado. Depois de gerar, `npm run typecheck` aponta qualquer tela que precise acompanhar a mudança.

## Testes e build

```bash
npm test                         # vitest
npm run build                    # tsc + vite build → dist/
```

## Implantação

A SPA é estática e independente da API. A URL da API é definida no build:

```bash
docker build --build-arg VITE_API_URL=https://api.seudominio.com/api/v1 -t rotagest-web .
docker run -p 8080:80 rotagest-web
```

Publique web e API no mesmo site com HTTPS (ex.: `app.seudominio.com` e `api.seudominio.com`), para que o cookie de sessão `SameSite=Strict` funcione.
