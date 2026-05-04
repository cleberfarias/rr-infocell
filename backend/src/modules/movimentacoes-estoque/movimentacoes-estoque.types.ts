export type MovimentacaoEstoqueTipo = "entrada" | "saida" | "ajuste";

export type MovimentacaoEstoqueOrigem = "manual" | "ordem_servico";

export type MovimentacaoEstoque = {
  id: string;
  produtoId: string;
  produtoNome: string;
  produtoSku: string;
  tipo: MovimentacaoEstoqueTipo;
  quantidade: number;
  estoqueAnterior: number;
  estoquePosterior: number;
  motivo?: string;
  origem: MovimentacaoEstoqueOrigem;
  ordemServicoId?: string;
  criadoPor?: string;
  createdAt: string;
};

export type MovimentacaoEstoqueInput =
  | {
      produtoId: string;
      tipo: "entrada" | "saida";
      quantidade: number;
      motivo?: string;
      origem?: MovimentacaoEstoqueOrigem;
      ordemServicoId?: string;
      criadoPor?: string;
    }
  | {
      produtoId: string;
      tipo: "ajuste";
      estoqueFinal: number;
      motivo?: string;
      origem?: MovimentacaoEstoqueOrigem;
      ordemServicoId?: string;
      criadoPor?: string;
    };
