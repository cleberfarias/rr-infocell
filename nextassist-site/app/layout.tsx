import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NextAssist — Sistema de Gestão para Assistência Técnica de Celular",
  description:
    "Gerencie ordens de serviço, estoque, PDV e financeiro em uma única plataforma web. O sistema mais completo para assistências técnicas de celular. Teste grátis por 14 dias.",
  keywords:
    "sistema assistência técnica celular, software ordem de serviço, gestão assistência técnica, programa para loja de celular, OS celular sistema, PDV assistência técnica, NextAssist",
  robots: "index, follow",
  authors: [{ name: "NextAssist" }],
  metadataBase: new URL("https://www.nextassist.com.br"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://www.nextassist.com.br/",
    siteName: "NextAssist",
    title: "NextAssist — Da entrada do aparelho ao recibo final",
    description:
      "Centralize ordens de serviço, estoque, PDV e financeiro em uma única plataforma. Teste 14 dias grátis.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "NextAssist — Sistema de Gestão para Assistência Técnica",
      },
    ],
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "NextAssist — Sistema para Assistência Técnica de Celular",
    description: "OS, estoque, PDV e financeiro em um só lugar. Teste grátis por 14 dias.",
    images: ["/og-image.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "NextAssist",
      url: "https://www.nextassist.com.br",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Sistema de gestão completo para assistências técnicas de celular. Controle de ordens de serviço, estoque, PDV e financeiro em uma única plataforma web.",
      offers: [
        { "@type": "Offer", name: "Starter", price: "89.00", priceCurrency: "BRL" },
        { "@type": "Offer", name: "Profissional", price: "149.00", priceCurrency: "BRL" },
        { "@type": "Offer", name: "Empresarial", price: "249.00", priceCurrency: "BRL" },
      ],
      aggregateRating: { "@type": "AggregateRating", ratingValue: "5", reviewCount: "3" },
    },
    {
      "@type": "Organization",
      name: "NextAssist",
      url: "https://www.nextassist.com.br",
      logo: "https://www.nextassist.com.br/logo.png",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "O NextAssist precisa ser instalado?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Não. É 100% web. Funciona em qualquer navegador, no celular ou computador, sem instalação.",
          },
        },
        {
          "@type": "Question",
          name: "Posso testar antes de contratar?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sim. Oferecemos 14 dias de teste gratuito sem necessidade de cartão de crédito.",
          },
        },
        {
          "@type": "Question",
          name: "O que é o plano White Label?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Entregamos o sistema com a sua marca, domínio e cores. Ideal para redes de franquias e revendedores.",
          },
        },
        {
          "@type": "Question",
          name: "Quantos usuários posso cadastrar?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Starter: 1 usuário. Profissional: até 5. Empresarial: ilimitados.",
          },
        },
        {
          "@type": "Question",
          name: "Funciona no celular?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sim. O sistema é responsivo e funciona perfeitamente em smartphones e tablets.",
          },
        },
        {
          "@type": "Question",
          name: "Posso cancelar quando quiser?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sim. Sem contrato de fidelidade. Cancele a qualquer momento sem multa.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#00b4f5" />
      </head>
      <body>{children}</body>
    </html>
  );
}
