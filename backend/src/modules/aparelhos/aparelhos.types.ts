export type Aparelho = {
  id: string;
  clienteId: string;
  marca: string;
  modelo: string;
  cor?: string;
  imeiSerial?: string;
  estadoFisico?: string;
  acessorios?: string;
  observacoes?: string;
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
};

export type AparelhoInput = {
  clienteId: string;
  marca: string;
  modelo: string;
  cor?: string;
  imeiSerial?: string;
  estadoFisico?: string;
  acessorios?: string;
  observacoes?: string;
};
