export const ERROR_MESSAGES = {
  backend: "Verifique se o backend está rodando.",
  whatsapp: "Verifique a conexão do WhatsApp.",
  generic: "Não foi possível concluir a operação.",
  carregar: (entidade: string) => `Não foi possível carregar ${entidade}.`,
  salvar: (entidade: string) => `Não foi possível salvar ${entidade}.`,
  atualizar: (entidade: string) => `Não foi possível atualizar ${entidade}.`,
  excluir: (entidade: string) => `Não foi possível excluir ${entidade}.`,
} as const;
