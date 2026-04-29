export const checklistItemStatus = ["funcionando", "com_defeito", "nao_testado"] as const;

export type ChecklistItemStatus = (typeof checklistItemStatus)[number];

export type ChecklistItem = {
  nome: string;
  status: ChecklistItemStatus;
  observacao?: string;
};

export type ChecklistFoto = {
  nome: string;
  url: string;
  path: string;
  contentType?: string;
  uploadedAt: string;
};

export type Checklist = {
  id: string;
  ordemServicoId: string;
  aparelhoId: string;
  itens: ChecklistItem[];
  fotos: ChecklistFoto[];
  observacoesGerais?: string;
  criadoPor?: string;
  createdAt: string;
  updatedAt: string;
};

export type ChecklistInput = {
  ordemServicoId: string;
  aparelhoId: string;
  itens: ChecklistItem[];
  fotos?: ChecklistFoto[];
  observacoesGerais?: string;
  criadoPor?: string;
};

export const checklistItensIniciais = [
  "Tela",
  "Touch",
  "Camera",
  "Microfone",
  "Alto-falante",
  "Botoes",
  "Conector de carga",
  "Wi-Fi",
  "Bluetooth",
  "Bateria",
];
