export type ProdutoCategoria = "peca" | "produto" | "acessorio" | "servico";

export type Produto = {
  id: string;
  sku: string;
  nome: string;
  categoria: ProdutoCategoria;
  estoqueAtual: number;
  estoqueMinimo: number;
  custo: number;
  precoVenda: number;
  ativo: boolean;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProdutoInput = {
  sku: string;
  nome: string;
  categoria: ProdutoCategoria;
  estoqueAtual: number;
  estoqueMinimo: number;
  custo: number;
  precoVenda: number;
  ativo?: boolean;
  observacoes?: string;
};
