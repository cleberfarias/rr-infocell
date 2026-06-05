import type { PlanKey } from "@/config/planModules";

export type KiwifyPlan = {
  key: PlanKey;
  name: string;
  price: number;
  priceLabel: string;
  productId: string;
  checkoutUrl: string;
  salesPageUrl: string;
  description: string;
  highlight?: boolean;
  features: string[];
};

export const kiwifyPlans: KiwifyPlan[] = [
  {
    key: "starter",
    name: "Starter",
    price: 89,
    priceLabel: "R$ 89/mês",
    productId: "e06e4d60-6127-11f1-a2c7-a3244f6b76bf",
    checkoutUrl: "https://pay.kiwify.com.br/GXfaAPz",
    salesPageUrl: "https://kiwify.app/0UO8k6T",
    description: "Para assistências que estão começando e precisam organizar atendimentos.",
    features: [
      "Dashboard",
      "Cadastro de clientes",
      "Ordens de serviço",
      "Suporte por e-mail",
    ],
  },
  {
    key: "profissional",
    name: "Profissional",
    price: 149,
    priceLabel: "R$ 149/mês",
    productId: "395b31e0-6128-11f1-822e-ef7ca5d3deca",
    checkoutUrl: "https://pay.kiwify.com.br/rZsfReN",
    salesPageUrl: "https://kiwify.app/LsGggnL",
    description: "Para assistências que precisam de controle completo do negócio.",
    highlight: true,
    features: [
      "Tudo do Starter",
      "Estoque",
      "Financeiro",
      "Relatórios",
      "Multiusuários",
      "Suporte prioritário",
    ],
  },
  {
    key: "empresarial",
    name: "Empresarial",
    price: 249,
    priceLabel: "R$ 249/mês",
    productId: "874024b0-6128-11f1-b136-99d1ab795d07",
    checkoutUrl: "https://pay.kiwify.com.br/DLAAS9J",
    salesPageUrl: "https://kiwify.app/oxMplvU",
    description: "Para redes de assistência com múltiplas unidades e white label.",
    features: [
      "Tudo do Profissional",
      "Mensagens automáticas",
      "White Label",
      "Multiunidades",
      "Suporte VIP",
    ],
  },
];

export const getKiwifyPlan = (key: PlanKey): KiwifyPlan | undefined =>
  kiwifyPlans.find((p) => p.key === key);
