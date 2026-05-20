import type { ChecklistItem } from "@/services/checklists";

export const GARANTIA_DIAS_PADRAO = 90;

export const CHECKLIST_ENTRADA_ITENS: ChecklistItem[] = [
  { nome: "Tela", status: "funcionando" },
  { nome: "Touch", status: "funcionando" },
  { nome: "Câmera", status: "funcionando" },
  { nome: "Microfone", status: "funcionando" },
  { nome: "Alto-falante", status: "funcionando" },
  { nome: "Botões", status: "funcionando" },
  { nome: "Conector de carga", status: "funcionando" },
  { nome: "Wi-Fi", status: "funcionando" },
  { nome: "Bluetooth", status: "funcionando" },
  { nome: "Bateria", status: "funcionando" },
];

export const CHECKLIST_SAIDA_ITENS: ChecklistItem[] = [
  { nome: "Aparelho testado", status: "funcionando" },
  { nome: "Carga funcionando", status: "funcionando" },
  { nome: "Biometria/Face ID", status: "funcionando" },
  { nome: "Câmera", status: "funcionando" },
  { nome: "Áudio", status: "funcionando" },
  { nome: "Chip/rede", status: "funcionando" },
  { nome: "Senha removida ou confirmada", status: "funcionando" },
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
