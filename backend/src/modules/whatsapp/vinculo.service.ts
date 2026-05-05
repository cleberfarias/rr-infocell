import { db } from "../../firebase/admin.js";
import { normalizarTelefone } from "../../shared/normalizar-telefone.js";
import { createClientesRepository } from "../clientes/clientes.repository.js";
import { createOrdensServicoRepository } from "../ordens-servico/ordens-servico.repository.js";
import type { OrdemServicoStatus } from "../ordens-servico/ordens-servico.types.js";

const clientesRepo = createClientesRepository(db);
const ordensRepo = createOrdensServicoRepository(db);

const statusAtivos: OrdemServicoStatus[] = [
  "recebido",
  "em_analise",
  "aguardando_aprovacao",
  "aguardando_peca",
  "em_manutencao",
  "pronto_para_retirada",
];

export async function vincularCliente(telefoneRaw: string) {
  const telefone = normalizarTelefone(telefoneRaw);
  const cliente = await clientesRepo.findByTelefone(telefone);

  if (!cliente) return null;

  const todasOrdens = await ordensRepo.list({ clienteId: cliente.id });
  const ordensAtivas = todasOrdens.filter((os) => statusAtivos.includes(os.status));

  return { cliente, ordensAtivas };
}
