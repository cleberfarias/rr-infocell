export type OrdemEventoTipo =
  | "comentario"
  | "diagnostico"
  | "status"
  | "orcamento"
  | "venda"
  | "checklist"
  | "peca"
  | "garantia"
  | "entrega";

export type OrdemEvento = {
  id: string;
  ordemServicoId: string;
  tipo: OrdemEventoTipo;
  titulo: string;
  descricao?: string;
  criadoPor?: string;
  tenantId?: string;
  createdAt: string;
};

export type OrdemEventoInput = {
  ordemServicoId: string;
  tipo?: OrdemEventoTipo;
  titulo: string;
  descricao?: string;
  criadoPor?: string;
};
