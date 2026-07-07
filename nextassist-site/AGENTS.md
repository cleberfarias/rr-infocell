<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# NextAssist Site - Guia para agentes

## Escopo

Este diretorio contem o site comercial/landing do NextAssist, separado do app operacional RR Infocell.

- App operacional: `../frontend` e `../backend`.
- Site publico: `nextassist-site`.
- Documentacao SaaS: `../docs/nextassist`.
- Plano de IA: `../docs/ai-implementation-plan.md`.

## Stack

- Next.js 16 com App Router.
- React 19.
- Tailwind CSS 4.
- Three.js, React Three Fiber e Drei para cenas 3D.
- Firebase client para blog/admin quando aplicavel.

## Estrutura

```text
app/
  page.tsx          Landing principal.
  layout.tsx        Metadata/layout global.
  blog/             Blog publico.
  admin/blog/       Admin de blog.
  demo/             Pagina de demo.
components/
  Pricing.tsx       Planos/precos do site publico.
  Hero.tsx          Hero da landing.
  Features.tsx      Recursos comerciais.
  FAQ.tsx           Perguntas frequentes.
  three/            Cenas 3D.
lib/
  blog-api.ts
  firebase.ts
```

## Regras de produto

- NextAssist e o produto SaaS/White Label; RR Infocell e o cliente piloto.
- O site comercial deve falar do NextAssist como produto para varias assistencias tecnicas.
- RR Infocell pode aparecer como caso piloto/referencia operacional, mas nao como se fosse o unico cliente possivel.
- Para White Label, o discurso deve permitir outros clientes com marca propria, mantendo NextAssist como plataforma base.
- Textos comerciais devem vender para assistencias tecnicas, nao apenas para a RR Infocell.
- Alteracoes em planos/precos devem ficar coerentes com:
  - `../frontend/src/config/kiwifyPlans.ts`;
  - `../frontend/src/config/planModules.ts`;
  - `../frontend/src/pages/Planos.tsx`;
  - webhooks Kiwify no backend;
  - documentacao em `../docs/ai-implementation-plan.md`.
- Se incluir IA nos planos, diferencie "Assistente de ajuda" de "IA Operacional" paga/addon.
- Nao prometer recursos IA que ainda nao estejam documentados ou planejados no sistema.

## Design

- A landing deve ser visualmente forte, clara e comercial.
- Use imagens/cenas relacionadas a assistencia tecnica, gestao, OS, estoque, financeiro, WhatsApp e SaaS.
- Evite blocos genericos que parecam template sem relacao com o produto.
- Em componentes 3D, valide que o canvas aparece e nao quebra layout mobile.

## Validacao

```bash
cd nextassist-site
npm run lint
npm run build
```

Se mexer em landing, pricing, hero ou Three.js, rode o site localmente e valide visualmente:

```bash
cd nextassist-site
npm run dev
```
