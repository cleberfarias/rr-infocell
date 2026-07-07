import { apiRequest } from "@/services/api";

export type TrialLeadOrigem = {
  utmSource: string | null;
  utmCampaign: string | null;
  utmMedium: string | null;
  paginaOrigem: string | null;
  landingPage: string | null;
  userAgent: string | null;
  ipApprox: string | null;
  registeredAt: string | null;
};

export type TrialLead = {
  id: string;
  slug: string;
  nome: string;
  email: string;
  empresa: string;
  planoTrial: string;
  status: string;
  criadoEm: string | null;
  trialEndsAt: string | null;
  diasRestantes: number;
  jaAcessou: boolean;
  ultimoAcessoEm: string | null;
  origemCadastro: TrialLeadOrigem;
};

export type TrialLeadStats = {
  total: number;
  ativos: number;
  clientesAtivos: number;
  expirados: number;
  acessaram: number;
};

export type TrialLeadsResponse = {
  data: TrialLead[];
  meta: TrialLeadStats;
};

export const listTrialLeads = () =>
  apiRequest<TrialLeadsResponse>("/tenants/trials");
