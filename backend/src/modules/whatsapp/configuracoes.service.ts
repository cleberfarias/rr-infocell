import { db } from "../../firebase/admin.js";
import { env } from "../../config/env.js";

export type MensagemTemplate = {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  mensagem: string;
  variaveis: string[];
  tipo: "automatica" | "manual";
};

const COL = "configuracoes";
const DOC = "whatsapp_mensagens";

export const TEMPLATES_DEFAULT: MensagemTemplate[] = [
  {
    id: "abertura",
    nome: "Abertura de OS",
    descricao: "Enviada quando uma nova OS é criada para o cliente",
    ativo: true,
    tipo: "automatica",
    variaveis: ["{{numero}}", "{{aparelho}}"],
    mensagem:
      "*RR Infocell - OS #{{numero}} aberta*\nAparelho: {{aparelho}}\nRecebemos seu aparelho.\nVamos iniciar a analise tecnica e avisaremos por aqui quando houver atualizacao.",
  },
  {
    id: "status_em_analise",
    nome: "Status: Em Análise",
    descricao: "Enviada quando o status muda para Em Análise",
    ativo: true,
    tipo: "automatica",
    variaveis: ["{{numero}}", "{{aparelho}}"],
    mensagem:
      "*RR Infocell - OS #{{numero}}*\nAparelho: {{aparelho}}\nSeu aparelho entrou em analise tecnica.\nAssim que tivermos o diagnostico, avisaremos por aqui.",
  },
  {
    id: "status_aguardando_peca",
    nome: "Status: Aguardando Peça",
    descricao: "Enviada quando o status muda para Aguardando Peça",
    ativo: true,
    tipo: "automatica",
    variaveis: ["{{numero}}", "{{aparelho}}"],
    mensagem:
      "*RR Infocell - OS #{{numero}}*\nAparelho: {{aparelho}}\nSeu atendimento esta aguardando peca.\nVamos avisar assim que a manutencao puder continuar.",
  },
  {
    id: "status_em_manutencao",
    nome: "Status: Em Manutenção",
    descricao: "Enviada quando o status muda para Em Manutenção",
    ativo: true,
    tipo: "automatica",
    variaveis: ["{{numero}}", "{{aparelho}}"],
    mensagem:
      "*RR Infocell - OS #{{numero}}*\nAparelho: {{aparelho}}\nO servico foi iniciado e seu aparelho esta em manutencao.",
  },
  {
    id: "status_pronto_para_retirada",
    nome: "Status: Pronto para Retirada",
    descricao: "Enviada quando o aparelho fica pronto para retirada",
    ativo: true,
    tipo: "automatica",
    variaveis: ["{{numero}}", "{{aparelho}}", "{{valor}}", "{{pixInfo}}"],
    mensagem:
      "*RR Infocell - Aparelho pronto!*\nOS #{{numero}}\nAparelho: {{aparelho}}\nSeu aparelho ja pode ser retirado.\nValor total: {{valor}}{{pixInfo}}\nSe preferir pagar na retirada, responda: PIX, CARTAO ou DINHEIRO.\nHorario: seg-sex 9h-18h, sab 9h-13h.",
  },
  {
    id: "status_sem_conserto",
    nome: "Status: Sem Conserto",
    descricao: "Enviada quando não é possível realizar o conserto",
    ativo: true,
    tipo: "automatica",
    variaveis: ["{{numero}}", "{{aparelho}}"],
    mensagem:
      "*RR Infocell - OS #{{numero}}*\nAparelho: {{aparelho}}\nApos a analise tecnica, nao foi possivel realizar o conserto do aparelho.\nSeu aparelho esta disponivel para retirada. Se tiver duvidas, responda esta mensagem.",
  },
  {
    id: "lembrete_orcamento",
    nome: "Lembrete: Orçamento Pendente",
    descricao: "Enviada automaticamente quando o orçamento aguarda aprovação há muitas horas",
    ativo: true,
    tipo: "automatica",
    variaveis: ["{{numero}}", "{{aparelho}}"],
    mensagem:
      "*RR Infocell - Orcamento pendente*\nA OS #{{numero}} ainda aguarda sua aprovacao.\nAparelho: {{aparelho}}\nPara autorizar responda: SIM\nPara recusar responda: NAO",
  },
  {
    id: "lembrete_retirada",
    nome: "Lembrete: Retirada Pendente",
    descricao: "Enviada automaticamente quando o aparelho aguarda retirada há muitos dias",
    ativo: true,
    tipo: "automatica",
    variaveis: ["{{numero}}", "{{aparelho}}", "{{valor}}", "{{pixRetiradaInfo}}"],
    mensagem:
      "*RR Infocell - Retirada pendente*\nSua OS #{{numero}} esta pronta para retirada.\nAparelho: {{aparelho}}\nValor total: {{valor}}\n{{pixRetiradaInfo}}",
  },
  {
    id: "checklist",
    nome: "Checklist Registrado",
    descricao: "Enviada quando um checklist de entrada ou saída é registrado",
    ativo: true,
    tipo: "automatica",
    variaveis: [
      "{{numero}}",
      "{{aparelho}}",
      "{{tipoChecklist}}",
      "{{criadoPorSufixo}}",
      "{{defeitosItens}}",
      "{{fotos}}",
      "{{observacoesLinha}}",
    ],
    mensagem:
      "*RR Infocell - Checklist da OS #{{numero}}*\nAparelho: {{aparelho}}\nChecklist de {{tipoChecklist}} registrado{{criadoPorSufixo}}.\n{{defeitosItens}}\nFotos anexadas: {{fotos}}.{{observacoesLinha}}\nVamos seguir com a analise tecnica e avisaremos por aqui.",
  },
  {
    id: "acao_orcamento",
    nome: "Ação: Enviar Orçamento",
    descricao: "Enviada manualmente pelo atendente ao encaminhar orçamento para aprovação",
    ativo: true,
    tipo: "manual",
    variaveis: ["{{numero}}", "{{aparelho}}", "{{defeito}}", "{{diagnosticoLinha}}", "{{valorRaw}}"],
    mensagem:
      "*RR Infocell — Orcamento OS #{{numero}}*\nAparelho: {{aparelho}}\nDefeito: {{defeito}}\n{{diagnosticoLinha}}Valor total: R$ {{valorRaw}}\n\nPara *AUTORIZAR* responda: SIM\nPara *RECUSAR* responda: NAO",
  },
  {
    id: "acao_pronto",
    nome: "Ação: Informar Pronto",
    descricao: "Enviada manualmente pelo atendente para avisar que o aparelho está pronto",
    ativo: true,
    tipo: "manual",
    variaveis: ["{{numero}}", "{{aparelho}}", "{{valorRaw}}", "{{pixChaveLinha}}"],
    mensagem:
      "*RR Infocell — Aparelho pronto!* ✅\nOS #{{numero}}\nAparelho: {{aparelho}}\nSeu aparelho ja pode ser retirado.\nValor total: R$ {{valorRaw}}\n{{pixChaveLinha}}Se preferir pagar na retirada, responda: PIX, CARTAO ou DINHEIRO.\nHorario: seg-sex 9h-18h, sab 9h-13h.",
  },
  {
    id: "acao_pagamento",
    nome: "Ação: Confirmar Pagamento",
    descricao: "Enviada manualmente ao confirmar o pagamento e entrega do aparelho",
    ativo: true,
    tipo: "manual",
    variaveis: ["{{numero}}", "{{valorRaw}}", "{{formaPagamento}}"],
    mensagem:
      "*RR Infocell — Pagamento confirmado* ✅\nOS #{{numero}}\nValor: R$ {{valorRaw}} | {{formaPagamento}}\nObrigado pela preferencia!",
  },
  {
    id: "acao_status",
    nome: "Ação: Enviar Status",
    descricao: "Enviada manualmente pelo atendente para informar o status atual da OS",
    ativo: true,
    tipo: "manual",
    variaveis: ["{{numero}}", "{{status}}", "{{previsaoLinha}}"],
    mensagem:
      "*RR Infocell — Status da OS #{{numero}}*\nStatus: {{status}}{{previsaoLinha}}",
  },
];

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return key in vars ? vars[key] : `{{${key}}}`;
  });
}

export function buildPixInfo(): string {
  if (!env.ATENDIMENTO_PIX_CHAVE) return "";
  const linhas = ["\n\n*Pagamento via PIX*"];
  if (env.ATENDIMENTO_PIX_NOME) linhas.push(`Favorecido: ${env.ATENDIMENTO_PIX_NOME}`);
  linhas.push(`Chave PIX: ${env.ATENDIMENTO_PIX_CHAVE}`);
  return linhas.join("\n");
}

export function buildPixChaveLinha(): string {
  return env.ATENDIMENTO_PIX_CHAVE ? `Chave PIX: ${env.ATENDIMENTO_PIX_CHAVE}\n` : "";
}

export function buildPixRetiradaInfo(): string {
  return env.ATENDIMENTO_PIX_CHAVE
    ? `Chave PIX: ${env.ATENDIMENTO_PIX_CHAVE}`
    : "Voce pode confirmar a forma de pagamento por aqui.";
}

class ConfiguracoesService {
  async getTemplates(): Promise<MensagemTemplate[]> {
    if (!db) return TEMPLATES_DEFAULT;
    try {
      const snap = await db.collection(COL).doc(DOC).get();
      if (!snap.exists) return TEMPLATES_DEFAULT;
      const data = snap.data() as { templates?: MensagemTemplate[] };
      const saved = data?.templates ?? [];
      return TEMPLATES_DEFAULT.map((def) => {
        const override = saved.find((t) => t.id === def.id);
        if (!override) return def;
        return { ...def, ativo: override.ativo, mensagem: override.mensagem };
      });
    } catch {
      return TEMPLATES_DEFAULT;
    }
  }

  async getTemplate(id: string): Promise<MensagemTemplate | undefined> {
    const all = await this.getTemplates();
    return all.find((t) => t.id === id);
  }

  async saveTemplates(templates: Pick<MensagemTemplate, "id" | "ativo" | "mensagem">[]): Promise<void> {
    if (!db) throw new Error("Firestore indisponivel");
    await db.collection(COL).doc(DOC).set({ templates }, { merge: false });
  }
}

export const configuracoesService = new ConfiguracoesService();
