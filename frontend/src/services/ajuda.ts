import { apiRequest } from "./api";

export const perguntarAI = async (pergunta: string): Promise<string> => {
  const response = await apiRequest<{ resposta: string }>("/ajuda/perguntar", {
    method: "POST",
    body: JSON.stringify({ pergunta }),
  });
  return response.resposta;
};
