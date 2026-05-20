import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  Loader2,
  Send,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { EmptyState, FormField, PageHeader } from "@/components/design-system";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL, formatDate, formatDateTimeShort } from "@/lib/formatters";
import { OS_STATUS_LABELS } from "@/constants/status";
import { EMPRESA } from "@/constants/company";
import { PrintPreviewDialog } from "@/components/PrintPreviewDialog";
import { STALE_TIME } from "@/constants/query";
import { ROUTES } from "@/constants/routes";
import { listAparelhos } from "@/services/aparelhos";
import { listClientes } from "@/services/clientes";
import {
  listOrdensServico,
  updateOrdemServico,
  type OrdemServico,
  type OrdemServicoStatus,
} from "@/services/ordens-servico";
import {
  createOrcamento,
  listOrcamentos,
  type OrcamentoStatus,
} from "@/services/orcamentos";
import { enviarOrcamento } from "@/services/whatsapp";

const budgetStatuses: OrdemServicoStatus[] = [
  "em_analise",
  "aguardando_aprovacao",
  "aguardando_peca",
  "em_manutencao",
  "pronto_para_retirada",
];

const toPecasInput = (ordem: OrdemServico) =>
  (ordem.pecasUsadas ?? []).map((peca) => ({
    produtoId: peca.produtoId,
    quantidade: peca.quantidade,
    valorUnitario: peca.valorUnitario,
  }));

const Orcamento = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedOrdemId, setSelectedOrdemId] = useState(
    searchParams.get("ordemId") ?? "",
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [orcamentoPrintOpen, setOrcamentoPrintOpen] = useState(false);
  const [aprovadoPor, setAprovadoPor] = useState("");
  const [canalAprovacao, setCanalAprovacao] = useState<
    "balcao" | "whatsapp" | "telefone"
  >("whatsapp");
  const [mensagemAprovacao, setMensagemAprovacao] = useState("");

  const ordensQuery = useQuery({
    queryKey: ["ordens-servico"],
    queryFn: () => listOrdensServico(),
    staleTime: STALE_TIME.short,
    refetchOnWindowFocus: false,
  });

  const clientesQuery = useQuery({
    queryKey: ["clientes"],
    queryFn: () => listClientes(""),
    staleTime: STALE_TIME.medium,
    refetchOnWindowFocus: false,
  });

  const aparelhosQuery = useQuery({
    queryKey: ["aparelhos"],
    queryFn: () => listAparelhos(),
    staleTime: STALE_TIME.medium,
    refetchOnWindowFocus: false,
  });

  const orcamentosQuery = useQuery({
    queryKey: ["orcamentos", selectedOrdemId],
    queryFn: () => listOrcamentos({ ordemServicoId: selectedOrdemId }),
    enabled: Boolean(selectedOrdemId),
  });

  const ordens = useMemo(
    () =>
      (ordensQuery.data ?? []).filter((ordem) =>
        budgetStatuses.includes(ordem.status),
      ),
    [ordensQuery.data],
  );

  const clienteById = useMemo(
    () =>
      new Map(
        (clientesQuery.data ?? []).map((cliente) => [cliente.id, cliente]),
      ),
    [clientesQuery.data],
  );

  const aparelhoById = useMemo(
    () =>
      new Map(
        (aparelhosQuery.data ?? []).map((aparelho) => [aparelho.id, aparelho]),
      ),
    [aparelhosQuery.data],
  );

  const selectedOrdem = useMemo(() => {
    if (!selectedOrdemId) {
      return null;
    }

    return ordens.find((ordem) => ordem.id === selectedOrdemId) ?? null;
  }, [ordens, selectedOrdemId]);

  useEffect(() => {
    if (!selectedOrdemId && ordens[0]) {
      setSelectedOrdemId(ordens[0].id);
    }
  }, [ordens, selectedOrdemId]);

  const statusMutation = useMutation({
    mutationFn: async (status: OrdemServicoStatus) => {
      if (!selectedOrdem) {
        throw new Error("Selecione uma OS.");
      }

      const orcamentoStatus: OrcamentoStatus =
        status === "cancelado"
          ? "reprovado"
          : status === "em_manutencao"
            ? "aprovado"
            : "enviado";

      await createOrcamento({
        ordemServicoId: selectedOrdem.id,
        status: orcamentoStatus,
        aprovadoPor:
          orcamentoStatus === "aprovado" ? aprovadoPor || undefined : undefined,
        canalAprovacao:
          orcamentoStatus === "aprovado" ? canalAprovacao : undefined,
        mensagemAprovacao:
          orcamentoStatus === "aprovado"
            ? mensagemAprovacao || undefined
            : undefined,
      });

      const ordem = await updateOrdemServico(selectedOrdem.id, {
        clienteId: selectedOrdem.clienteId,
        aparelhoId: selectedOrdem.aparelhoId,
        checklistId: selectedOrdem.checklistId,
        defeitoRelatado: selectedOrdem.defeitoRelatado,
        diagnostico: selectedOrdem.diagnostico,
        status,
        prioridade: selectedOrdem.prioridade,
        tecnicoResponsavel: selectedOrdem.tecnicoResponsavel,
        pecasUsadas: toPecasInput(selectedOrdem),
        valorMaoObra: selectedOrdem.valorMaoObra,
        maoObraInclusaNaPeca: selectedOrdem.maoObraInclusaNaPeca,
        entradaEm: selectedOrdem.entradaEm,
        previsaoEntregaEm: selectedOrdem.previsaoEntregaEm,
        prazoPrometidoEm: selectedOrdem.prazoPrometidoEm,
        garantiaDias: selectedOrdem.garantiaDias,
        garantiaObservacoes: selectedOrdem.garantiaObservacoes,
        aprovadoPor:
          orcamentoStatus === "aprovado"
            ? aprovadoPor || "Cliente"
            : selectedOrdem.aprovadoPor,
        aprovadoEm:
          orcamentoStatus === "aprovado"
            ? new Date().toISOString()
            : selectedOrdem.aprovadoEm,
        canalAprovacao:
          orcamentoStatus === "aprovado"
            ? canalAprovacao
            : selectedOrdem.canalAprovacao,
        mensagemAprovacao:
          orcamentoStatus === "aprovado"
            ? mensagemAprovacao || undefined
            : selectedOrdem.mensagemAprovacao,
      });

      if (orcamentoStatus !== "enviado") {
        return { ordem, whatsappErro: null };
      }

      try {
        await enviarOrcamento(ordem.id);
        return { ordem, whatsappErro: null };
      } catch (error) {
        return {
          ordem,
          whatsappErro:
            error instanceof Error
              ? error.message
              : "Orçamento salvo, mas não foi possível enviar pelo WhatsApp.",
        };
      }
    },
    onSuccess: async ({ ordem, whatsappErro }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ordens-servico"] }),
        queryClient.invalidateQueries({
          queryKey: ["ordem-servico", ordem.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["orcamentos"] }),
        queryClient.invalidateQueries({ queryKey: ["whatsapp-conversas"] }),
        queryClient.invalidateQueries({ queryKey: ["ordem-eventos"] }),
      ]);

      if (ordem.status === "em_manutencao") {
        toast.success("Orçamento aprovado! Seguindo para manutenção.");
        navigate(ROUTES.manutencaoOS(ordem.id));
        return;
      }

      if (ordem.status === "aguardando_aprovacao") {
        toast.success("Orçamento enviado ao cliente via WhatsApp.");
      }

      if (ordem.status === "cancelado") {
        toast.success("Orçamento reprovado. OS cancelada.");
      }

      setSelectedOrdemId(ordem.id);
      setActionError(whatsappErro);
    },
    onError: (error) => {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o orçamento.",
      );
    },
  });

  const handleSelectOrdem = (ordemId: string) => {
    setSelectedOrdemId(ordemId);
    setSearchParams({ ordemId });
  };

  const cliente = selectedOrdem
    ? clienteById.get(selectedOrdem.clienteId)
    : undefined;
  const aparelho = selectedOrdem
    ? aparelhoById.get(selectedOrdem.aparelhoId)
    : undefined;
  const latestOrcamento = orcamentosQuery.data?.[0];
  const historico = useMemo(
    () =>
      (ordensQuery.data ?? [])
        .filter((ordem) =>
          ["em_manutencao", "pronto_para_retirada", "cancelado"].includes(
            ordem.status,
          ),
        )
        .slice(0, 5),
    [ordensQuery.data],
  );
  const isLoading =
    ordensQuery.isLoading ||
    clientesQuery.isLoading ||
    aparelhosQuery.isLoading;
  const isError =
    ordensQuery.isError || clientesQuery.isError || aparelhosQuery.isError;

  if (isLoading) {
    return (
      <Card className="surface-panel flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="surface-panel">
        <EmptyState
          icon={FileCheck2}
          title="Não foi possível carregar orçamentos"
          description="Verifique se o backend está rodando e tente novamente."
          actions={
            <Button variant="outline" onClick={() => ordensQuery.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      </Card>
    );
  }

  if (ordens.length === 0) {
    return (
      <Card className="surface-panel">
        <EmptyState
          icon={FileCheck2}
          title="Nenhuma OS disponível para orçamento"
          description="Mude o status de uma OS para Em análise ou superior para gerenciar o orçamento aqui."
          actions={
            <Button asChild>
              <Link to={ROUTES.ordens}>Ver ordens</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const NotaOrcamentoContent = () => {
    if (!selectedOrdem) return null;
    const logoUrl = localStorage.getItem("rr-logo-url") || null;
    return (
      <>
        {/* Cabeçalho */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            borderBottom: "2px solid #111827",
            paddingBottom: 14,
            marginBottom: 14,
          }}
        >
          <div style={{ flexShrink: 0 }}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                style={{ maxHeight: 70, maxWidth: 160, objectFit: "contain" }}
              />
            ) : (
              <div
                style={{
                  background: "#0284c7",
                  color: "#fff",
                  padding: "10px 16px",
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                {EMPRESA.nome}
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>
              {EMPRESA.nome}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: "#374151" }}>
              CNPJ: {EMPRESA.cnpj}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: "#374151" }}>
              {EMPRESA.enderecoCompleto}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: "#374151" }}>
              Tel/WhatsApp: {EMPRESA.telefone}
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p
              style={{
                margin: 0,
                color: "#0284c7",
                fontWeight: 700,
                fontSize: 13,
                textTransform: "uppercase",
              }}
            >
              Nota de Orçamento
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700 }}>
              OS-{selectedOrdem.numero}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: "#374151" }}>
              Emitido em: {formatDate(new Date().toISOString())}
            </p>
          </div>
        </div>

        {/* Cliente e Aparelho */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div
            style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: 8 }}
          >
            <p
              style={{
                margin: "0 0 4px",
                color: "#6b7280",
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Cliente
            </p>
            <strong style={{ fontSize: 12 }}>{cliente?.nome ?? "—"}</strong>
            {cliente?.telefone && (
              <p style={{ margin: "2px 0 0", fontSize: 10 }}>
                Tel: {cliente.telefone}
              </p>
            )}
            {cliente?.documento && (
              <p style={{ margin: "2px 0 0", fontSize: 10 }}>
                CPF/CNPJ: {cliente.documento}
              </p>
            )}
          </div>
          <div
            style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: 8 }}
          >
            <p
              style={{
                margin: "0 0 4px",
                color: "#6b7280",
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Aparelho
            </p>
            <strong style={{ fontSize: 12 }}>
              {aparelho ? `${aparelho.marca} ${aparelho.modelo}` : "—"}
            </strong>
            {aparelho?.imeiSerial && (
              <p style={{ margin: "2px 0 0", fontSize: 10 }}>
                IMEI/Série: {aparelho.imeiSerial}
              </p>
            )}
            {aparelho?.estadoFisico && (
              <p style={{ margin: "2px 0 0", fontSize: 10 }}>
                Estado: {aparelho.estadoFisico}
              </p>
            )}
          </div>
        </div>

        {/* Defeito */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 14,
          }}
        >
          <tbody>
            <tr>
              <th
                style={{
                  border: "1px solid #d1d5db",
                  padding: "5px 8px",
                  background: "#f3f4f6",
                  textAlign: "left",
                  fontSize: 10,
                  textTransform: "uppercase",
                  width: 140,
                }}
              >
                Defeito relatado
              </th>
              <td
                style={{
                  border: "1px solid #d1d5db",
                  padding: "5px 8px",
                  fontSize: 11,
                }}
              >
                {selectedOrdem.defeitoRelatado}
              </td>
            </tr>
            {selectedOrdem.diagnostico && (
              <tr>
                <th
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "5px 8px",
                    background: "#f3f4f6",
                    textAlign: "left",
                    fontSize: 10,
                    textTransform: "uppercase",
                    width: 140,
                  }}
                >
                  Diagnóstico
                </th>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "5px 8px",
                    fontSize: 11,
                  }}
                >
                  {selectedOrdem.diagnostico}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Peças e Serviços */}
        {(selectedOrdem.pecasUsadas ?? []).length > 0 && (
          <>
            <h2
              style={{
                margin: "0 0 6px",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Peças previstas / Serviços
            </h2>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: 14,
              }}
            >
              <thead>
                <tr>
                  {["Descrição", "Qtd.", "Unitário", "Total"].map((h) => (
                    <th
                      key={h}
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "5px 7px",
                        background: "#f3f4f6",
                        fontSize: 10,
                        textTransform: "uppercase",
                        textAlign: "left",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedOrdem.pecasUsadas.map((p) => (
                  <tr key={p.produtoId}>
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "5px 7px",
                      }}
                    >
                      {p.nome}
                    </td>
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "5px 7px",
                      }}
                    >
                      {p.quantidade}
                    </td>
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "5px 7px",
                      }}
                    >
                      {formatBRL(p.valorUnitario)}
                    </td>
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "5px 7px",
                      }}
                    >
                      {formatBRL(p.valorTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Totais */}
        <table
          style={{
            width: "50%",
            marginLeft: "auto",
            borderCollapse: "collapse",
            marginBottom: 14,
          }}
        >
          <tbody>
            {selectedOrdem.valorMaoObra > 0 && (
              <tr>
                <th
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "5px 8px",
                    background: "#f3f4f6",
                    textAlign: "left",
                    fontSize: 11,
                  }}
                >
                  Mão de obra
                </th>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "5px 8px",
                    textAlign: "right",
                  }}
                >
                  {formatBRL(selectedOrdem.valorMaoObra)}
                </td>
              </tr>
            )}
            {selectedOrdem.maoObraInclusaNaPeca && (
              <tr>
                <th
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "5px 8px",
                    background: "#f3f4f6",
                    textAlign: "left",
                    fontSize: 11,
                  }}
                >
                  Mão de obra
                </th>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "5px 8px",
                    textAlign: "right",
                  }}
                >
                  Inclusa na peça
                </td>
              </tr>
            )}
            <tr>
              <th
                style={{
                  border: "1px solid #d1d5db",
                  padding: "5px 8px",
                  background: "#f3f4f6",
                  textAlign: "left",
                  fontSize: 11,
                }}
              >
                Peças
              </th>
              <td
                style={{
                  border: "1px solid #d1d5db",
                  padding: "5px 8px",
                  textAlign: "right",
                }}
              >
                {formatBRL(selectedOrdem.valorPecas)}
              </td>
            </tr>
            <tr style={{ fontWeight: 700 }}>
              <th
                style={{
                  border: "1px solid #d1d5db",
                  padding: "5px 8px",
                  background: "#eff6ff",
                  textAlign: "left",
                  fontSize: 12,
                  color: "#0284c7",
                }}
              >
                TOTAL
              </th>
              <td
                style={{
                  border: "1px solid #d1d5db",
                  padding: "5px 8px",
                  textAlign: "right",
                  color: "#0284c7",
                  fontSize: 14,
                }}
              >
                {formatBRL(selectedOrdem.valorTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Validade e Técnico */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 14,
            fontSize: 11,
          }}
        >
          <div
            style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: 8 }}
          >
            <span
              style={{
                display: "block",
                color: "#6b7280",
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Prazo de validade do orçamento
            </span>
            <strong>7 dias a partir da emissão</strong>
          </div>
          <div
            style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: 8 }}
          >
            <span
              style={{
                display: "block",
                color: "#6b7280",
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Técnico responsável
            </span>
            <strong>
              {selectedOrdem.tecnicoResponsavel ?? EMPRESA.tecnicoPadrao}
            </strong>
          </div>
        </div>

        {/* Assinatura */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            marginTop: 24,
          }}
        >
          {[
            "Aprovação do cliente",
            `${EMPRESA.nome} — ${selectedOrdem.tecnicoResponsavel ?? EMPRESA.tecnicoPadrao}`,
          ].map((label) => (
            <div
              key={label}
              style={{
                borderTop: "1px solid #111827",
                paddingTop: 6,
                textAlign: "center",
                minHeight: 48,
              }}
            >
              <span style={{ fontSize: 10, color: "#6b7280" }}>{label}</span>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <>
      {selectedOrdem && (
        <PrintPreviewDialog
          open={orcamentoPrintOpen}
          onOpenChange={setOrcamentoPrintOpen}
          title={`Nota de Orçamento — OS-${selectedOrdem.numero}`}
          onPrint={window.print}
        >
          <NotaOrcamentoContent />
        </PrintPreviewDialog>
      )}
      <div className="space-y-5">
        <PageHeader
          eyebrow="Orçamentos"
          title={selectedOrdem ? `OS-${selectedOrdem.numero}` : "Orçamento"}
          description="Preencha peças e mão de obra após o diagnóstico, depois envie, aprove ou reprove o orçamento com o cliente."
          actions={
            <div className="flex flex-wrap gap-2">
              {selectedOrdem && (
                <>
                  <Button asChild variant="outline">
                    <Link to={ROUTES.ordemDetalhe(selectedOrdem.id)}>
                      <Eye className="h-4 w-4" /> Detalhe
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={ROUTES.manutencaoOS(selectedOrdem.id)}>
                      Manutenção
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setOrcamentoPrintOpen(true)}
                  >
                    <Eye className="h-4 w-4" /> Imprimir orçamento
                  </Button>
                </>
              )}
            </div>
          }
        />

        <Card className="surface-panel flex flex-wrap items-end gap-3 p-4">
          <FormField
            id="orcamento-os"
            label="Ordem de serviço"
            className="flex-1"
          >
            <Select value={selectedOrdemId} onValueChange={handleSelectOrdem}>
              <SelectTrigger id="orcamento-os">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ordens.map((ordem) => {
                  const rowCliente = clienteById.get(ordem.clienteId);
                  const rowAparelho = aparelhoById.get(ordem.aparelhoId);

                  return (
                    <SelectItem key={ordem.id} value={ordem.id}>
                      OS-{ordem.numero} - {rowCliente?.nome ?? ordem.clienteId}{" "}
                      -{" "}
                      {rowAparelho
                        ? `${rowAparelho.marca} ${rowAparelho.modelo}`
                        : ordem.aparelhoId}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </FormField>
          {selectedOrdem && <StatusBadge status={selectedOrdem.status} />}
        </Card>

        {selectedOrdem && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <Card className="surface-panel p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-primary">
                      // Orçamento OS-{selectedOrdem.numero}
                    </p>
                    <h2 className="font-display text-2xl font-bold">
                      {cliente?.nome ?? selectedOrdem.clienteId}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {aparelho
                        ? `${aparelho.marca} ${aparelho.modelo}`
                        : selectedOrdem.aparelhoId}
                      {aparelho?.imeiSerial ? (
                        <>
                          {" "}
                          - IMEI{" "}
                          <span className="font-mono">
                            {aparelho.imeiSerial}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning">
                    <Clock className="h-3.5 w-3.5" />
                    {latestOrcamento
                      ? `Orçamento ${latestOrcamento.status}`
                      : OS_STATUS_LABELS[selectedOrdem.status]}
                  </div>
                </div>

                <div className="mt-5 rounded-md border border-border bg-secondary/30 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Defeito e diagnóstico
                  </p>
                  <p className="mt-1 text-sm">
                    {selectedOrdem.defeitoRelatado}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedOrdem.diagnostico ??
                      "Diagnóstico não informado — preencha na tela de manutenção antes de enviar ao cliente."}
                  </p>
                  {latestOrcamento && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Último orçamento: {latestOrcamento.status} em{" "}
                      {formatDateTimeShort(latestOrcamento.updatedAt)}
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Peças
                  </h3>
                  <div className="space-y-2">
                    {(selectedOrdem.pecasUsadas ?? []).length === 0 ? (
                      <div className="rounded-md border border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground">
                        Nenhuma peça vinculada a esta OS.
                      </div>
                    ) : (
                      selectedOrdem.pecasUsadas.map((peca) => (
                        <div
                          key={peca.produtoId}
                          className="flex items-center justify-between rounded-md border border-border bg-card/50 px-4 py-3"
                        >
                          <div>
                            <p className="font-medium">{peca.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {peca.quantidade} x{" "}
                              {formatBRL(peca.valorUnitario)}
                            </p>
                          </div>
                          <p className="font-mono font-semibold">
                            {formatBRL(peca.valorTotal)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {(selectedOrdem.valorMaoObra > 0 ||
                    selectedOrdem.maoObraInclusaNaPeca) && (
                    <>
                      <h3 className="mb-3 mt-6 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Serviços
                      </h3>
                      <div className="flex items-center justify-between rounded-md border border-border bg-card/50 px-4 py-3">
                        <div>
                          <p className="font-medium">Mão de obra técnica</p>
                          <p className="text-xs text-muted-foreground">
                            Responsável:{" "}
                            {selectedOrdem.tecnicoResponsavel ?? "não definido"}
                          </p>
                        </div>
                        <p className="font-mono font-semibold">
                          {selectedOrdem.valorMaoObra > 0
                            ? formatBRL(selectedOrdem.valorMaoObra)
                            : "Inclusa na peça"}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Total a aprovar
                    </p>
                    <p className="font-display text-3xl font-bold text-primary glow-text">
                      {formatBRL(selectedOrdem.valorTotal)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="border-destructive/40 text-destructive hover:bg-destructive/10"
                          disabled={statusMutation.isPending}
                        >
                          <X className="h-4 w-4" /> Reprovar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Reprovar orçamento?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            A OS será marcada como cancelada. Essa ação não pode
                            ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => statusMutation.mutate("cancelado")}
                          >
                            Confirmar reprovação
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      className="bg-success text-success-foreground hover:bg-success/90"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate("em_manutencao")}
                    >
                      <Check className="h-4 w-4" /> Aprovar
                    </Button>
                    <Button
                      className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate("aguardando_aprovacao")
                      }
                    >
                      {statusMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Enviado ao cliente
                    </Button>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <FormField id="orcamento-aprovado-por" label="Quem aprovou">
                    <input
                      id="orcamento-aprovado-por"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={aprovadoPor}
                      onChange={(event) => setAprovadoPor(event.target.value)}
                      placeholder="Nome do cliente"
                    />
                  </FormField>
                  <FormField id="orcamento-canal" label="Canal">
                    <Select
                      value={canalAprovacao}
                      onValueChange={(value) =>
                        setCanalAprovacao(value as typeof canalAprovacao)
                      }
                    >
                      <SelectTrigger id="orcamento-canal">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="balcao">Balcão</SelectItem>
                        <SelectItem value="telefone">Telefone</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField id="orcamento-mensagem" label="Mensagem/resposta">
                    <input
                      id="orcamento-mensagem"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={mensagemAprovacao}
                      onChange={(event) =>
                        setMensagemAprovacao(event.target.value)
                      }
                      placeholder="Ex.: Cliente respondeu SIM"
                    />
                  </FormField>
                </div>
                {actionError && (
                  <p className="mt-3 text-sm text-destructive">{actionError}</p>
                )}
              </Card>
            </div>

            <Card className="surface-panel p-5">
              <h3 className="mb-1 font-display text-base font-semibold">
                Histórico recente
              </h3>
              <p className="mb-4 text-xs text-muted-foreground">
                Últimas decisões registradas por status da OS.
              </p>
              <ul className="space-y-3">
                {historico.length === 0 ? (
                  <li className="rounded-md border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
                    Nenhuma decisão registrada ainda.
                  </li>
                ) : (
                  historico.map((ordem) => {
                    const rowCliente = clienteById.get(ordem.clienteId);
                    const approved = ordem.status !== "cancelado";

                    return (
                      <li
                        key={ordem.id}
                        className="flex gap-3 rounded-md border border-border bg-secondary/30 p-3"
                      >
                        <div
                          className={
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md " +
                            (approved
                              ? "bg-success/15 text-success"
                              : "bg-destructive/15 text-destructive")
                          }
                        >
                          {approved ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <X className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            OS-{ordem.numero} -{" "}
                            {formatDateTimeShort(ordem.updatedAt)}
                          </p>
                          <p className="truncate text-sm font-medium">
                            {rowCliente?.nome ?? ordem.clienteId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {OS_STATUS_LABELS[ordem.status]} -{" "}
                            {formatBRL(ordem.valorTotal)}
                          </p>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </Card>
          </div>
        )}
      </div>
    </>
  );
};

export default Orcamento;
