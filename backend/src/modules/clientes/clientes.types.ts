export type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  documento?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
  receberMensagemAutomatica?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClienteInput = {
  nome: string;
  telefone: string;
  documento?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
  receberMensagemAutomatica?: boolean;
};
