export type OrdemEventoTipo =
  | "comentario"
  | "diagnostico"
  | "status"
  | "orcamento"
  | "venda";

export type OrdemEvento = {
  id: string;
  ordemServicoId: string;
  tipo: OrdemEventoTipo;
  titulo: string;
  descricao?: string;
  criadoPor?: string;
  createdAt: string;
};

export type OrdemEventoInput = {
  ordemServicoId: string;
  tipo?: OrdemEventoTipo;
  titulo: string;
  descricao?: string;
  criadoPor?: string;
};
