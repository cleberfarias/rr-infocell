import { db } from "../../firebase/admin.js";
import { createOrdensServicoRepository } from "../ordens-servico/ordens-servico.repository.js";
import { conexaoService } from "./conexao.service.js";

const ordensRepo = createOrdensServicoRepository(db);
const colConversas = "whatsapp_conversas";

function normalizarResposta(texto: string): string {
  return texto.trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

class BotService {
  async processarResposta(telefone: string, texto: string) {
    if (!db || !texto) return;

    const doc = await db.collection(colConversas).doc(telefone).get();
    const conversa = doc.data();

    if (!conversa?.aguardandoAprovacao || !conversa?.osIdPendente) return;

    const resposta = normalizarResposta(texto);

    if (resposta === "SIM") {
      const os = await ordensRepo.findById(conversa.osIdPendente);
      if (os) {
        await ordensRepo.update(os.id, { ...os, status: "em_manutencao" });
      }
      await conexaoService.enviarTexto(
        telefone,
        "Otimo! Servico autorizado ✅\nEntraremos em contato quando o aparelho ficar pronto.",
      );
      await db
        .collection(colConversas)
        .doc(telefone)
        .set({ aguardandoAprovacao: false, osIdPendente: null }, { merge: true });
      return;
    }

    if (resposta === "NAO" || resposta === "NÃO") {
      const os = await ordensRepo.findById(conversa.osIdPendente);
      if (os) {
        await ordensRepo.update(os.id, { ...os, status: "cancelado" });
      }
      await conexaoService.enviarTexto(
        telefone,
        "Entendido. Servico cancelado.\nSeu aparelho esta disponivel para retirada sem custo.",
      );
      await db
        .collection(colConversas)
        .doc(telefone)
        .set({ aguardandoAprovacao: false, osIdPendente: null }, { merge: true });
    }
  }
}

export const botService = new BotService();
