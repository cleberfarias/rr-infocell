import type { ChecklistItem } from "@/services/checklists";

export const GARANTIA_DIAS_PADRAO = 90;

export const CHECKLIST_ENTRADA_ITENS: ChecklistItem[] = [
  { nome: "Tela", status: "nao_testado" },
  { nome: "Touch", status: "nao_testado" },
  { nome: "Câmera", status: "nao_testado" },
  { nome: "Microfone", status: "nao_testado" },
  { nome: "Alto-falante", status: "nao_testado" },
  { nome: "Botões", status: "nao_testado" },
  { nome: "Conector de carga", status: "nao_testado" },
  { nome: "Wi-Fi", status: "nao_testado" },
  { nome: "Bluetooth", status: "nao_testado" },
  { nome: "Bateria", status: "nao_testado" },
];

export const CHECKLIST_SAIDA_ITENS: ChecklistItem[] = [
  { nome: "Aparelho testado", status: "nao_testado" },
  { nome: "Carga funcionando", status: "nao_testado" },
  { nome: "Biometria/Face ID", status: "nao_testado" },
  { nome: "Câmera", status: "nao_testado" },
  { nome: "Áudio", status: "nao_testado" },
  { nome: "Chip/rede", status: "nao_testado" },
  { nome: "Senha removida ou confirmada", status: "nao_testado" },
];

export const MOTIVOS_SAIDA = [
  "Venda",
  "Uso interno",
  "Perda / Avaria",
  "Devolução ao fornecedor",
  "Ajuste de estoque",
  "Amostra",
] as const;

export const MOTIVOS_ENTRADA = [
  "Compra",
  "Devolução de cliente",
  "Ajuste de estoque",
  "Produção",
  "Brinde / Amostra",
] as const;

export const MOTIVOS_AJUSTE = [
  "Inventário",
  "Correção de estoque",
  "Avaria descoberta",
  "Contagem física",
] as const;

export const WHATSAPP_EMOJIS = ["😀", "👍", "🙏", "✅", "📱", "🔧", "💰", "🧾", "⏳", "❌"] as const;

export const WHATSAPP_RESPOSTAS_RAPIDAS = [
  "Olá! Como posso ajudar?",
  "Pode nos enviar uma foto ou vídeo do aparelho?",
  "Recebemos sua mensagem e já vamos verificar.",
  "Seu aparelho está em análise técnica.",
  "Assim que houver atualização da OS, avisaremos por aqui.",
  "Obrigado pelo contato. RR Infocell agradece!",
] as const;

export const BACKEND_URL_DEV = "http://localhost:3333";

export const CATEGORIA_PADRAO = "peca";
