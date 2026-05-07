export type ProdutoCategoria =
  | "peca"
  | "produto"
  | "acessorio"
  | "servico"
  | "celular_novo"
  | "celular_seminovo"
  | "celular_restaurado";

export type ProdutoOrigem = "compra" | "troca" | "consignado";

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
  marca?: string;
  modelo?: string;
  imei?: string;
  cor?: string;
  capacidade?: string;
  estadoConservacao?: string;
  saudeBateria?: number;
  origem?: ProdutoOrigem;
  garantiaDias?: number;
  laudoEntrada?: string;
  custoRestauracao?: number;
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
  marca?: string;
  modelo?: string;
  imei?: string;
  cor?: string;
  capacidade?: string;
  estadoConservacao?: string;
  saudeBateria?: number;
  origem?: ProdutoOrigem;
  garantiaDias?: number;
  laudoEntrada?: string;
  custoRestauracao?: number;
  observacoes?: string;
};
