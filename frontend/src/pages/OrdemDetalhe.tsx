import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  PackagePlus,
  Printer,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  EmptyState,
  FormField,
  PageHeader,
  SectionPanel,
} from "@/components/design-system";
import { PrintPreviewDialog } from "@/components/PrintPreviewDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatBRL, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { EMPRESA } from "@/constants/company";
import { getAparelho } from "@/services/aparelhos";
import { getCliente } from "@/services/clientes";
import {
  deleteOrdemServico,
  getOrdemServico,
  updateOrdemServico,
  type OrdemServicoPecaInput,
} from "@/services/ordens-servico";
import { listProdutos } from "@/services/produtos";

const OrdemDetalhe = () => {
  const { ordemId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [pecaProdutoId, setPecaProdutoId] = useState("");
  const [pecaQuantidade, setPecaQuantidade] = useState("1");
  const [pecaBusca, setPecaBusca] = useState("");
  const [pecaComboboxOpen, setPecaComboboxOpen] = useState(false);
  const [descontoTexto, setDescontoTexto] = useState("");
  const [pecaError, setPecaError] = useState<string | null>(null);
  const [previewOsOpen, setPreviewOsOpen] = useState(false);
  const [previewOsViaInterna, setPreviewOsViaInterna] = useState(false);
  const [previewGarantiaOpen, setPreviewGarantiaOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editTermoOpen, setEditTermoOpen] = useState(false);
  const [garantiaDiasTexto, setGarantiaDiasTexto] = useState("");
  const [garantiaObservacoesTexto, setGarantiaObservacoesTexto] = useState("");
  const [termoTexto, setTermoTexto] = useState(
    () =>
      localStorage.getItem("rr-termo-garantia") ??
      "A RR Infocell garante os serviços realizados e as peças substituídas pelo prazo acima. A garantia não cobre danos físicos, líquidos, mau uso ou intervenção de terceiros.",
  );
  const [termoOsTexto, setTermoOsTexto] = useState(
    () =>
      localStorage.getItem("rr-termo-os") ??
      "Ao assinar esta ordem de serviço, o cliente confirma as informações do aparelho, defeito relatado, acessórios entregues e condições descritas. O cliente está ciente de que deverá retirar o aparelho dentro do prazo combinado após a conclusão do serviço. A garantia cobre somente o serviço realizado e/ou a peça substituída, não se estendendo a danos causados por mau uso, queda, contato com líquido, violação por terceiros ou novos defeitos não relacionados ao reparo executado.",
  );
  const [editTermoOsOpen, setEditTermoOsOpen] = useState(false);

  const ordemQuery = useQuery({
    queryKey: ["ordem-servico", ordemId],
    queryFn: () => getOrdemServico(ordemId ?? ""),
    enabled: Boolean(ordemId),
  });

  const ordem = ordemQuery.data;

  const clienteQuery = useQuery({
    queryKey: ["cliente", ordem?.clienteId],
    queryFn: () => getCliente(ordem?.clienteId ?? ""),
    enabled: Boolean(ordem?.clienteId),
  });

  const aparelhoQuery = useQuery({
    queryKey: ["aparelho", ordem?.aparelhoId],
    queryFn: () => getAparelho(ordem?.aparelhoId ?? ""),
    enabled: Boolean(ordem?.aparelhoId),
  });

  const produtosQuery = useQuery({
    queryKey: ["produtos", "os-pecas"],
    queryFn: () => listProdutos({ ativo: true, categoria: "peca" }),
  });

  const cliente = clienteQuery.data;
  const aparelho = aparelhoQuery.data;

  useEffect(() => {
    if (ordem && searchParams.get("termoGarantia") === "1") {
      setPreviewGarantiaOpen(true);
    }
  }, [ordem, searchParams]);

  useEffect(() => {
    if (ordem) {
      setDescontoTexto(ordem.desconto ? String(ordem.desconto) : "");
    }
  }, [ordem]);

  const excluirOsMutation = useMutation({
    mutationFn: () => deleteOrdemServico(ordemId ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordens-servico"] });
      toast.success(`OS-${ordem?.numero} excluída.`);
      navigate("/app/ordens");
    },
    onError: () => toast.error("Não foi possível excluir a OS."),
  });

  const garantiaMutation = useMutation({
    mutationFn: () => {
      if (!ordem) {
        throw new Error("OS nao carregada.");
      }

      return updateOrdemServico(ordem.id, {
        clienteId: ordem.clienteId,
        aparelhoId: ordem.aparelhoId,
        checklistId: ordem.checklistId,
        defeitoRelatado: ordem.defeitoRelatado,
        diagnostico: ordem.diagnostico,
        tipoSenha: ordem.tipoSenha,
        senhaAparelho: ordem.senhaAparelho,
        padraoDeSenha: ordem.padraoDeSenha,
        status: ordem.status,
        prioridade: ordem.prioridade,
        tecnicoResponsavel: ordem.tecnicoResponsavel,
        pecasUsadas:
          ordem.pecasUsadas.length > 0
            ? ordem.pecasUsadas.map((peca) => ({
                produtoId: peca.produtoId,
                quantidade: peca.quantidade,
                valorUnitario: peca.valorUnitario,
              }))
            : undefined,
        valorMaoObra: ordem.valorMaoObra,
        maoObraInclusaNaPeca: ordem.maoObraInclusaNaPeca,
        desconto: ordem.desconto,
        entradaEm: ordem.entradaEm,
        previsaoEntregaEm: ordem.previsaoEntregaEm,
        prazoPrometidoEm: ordem.prazoPrometidoEm,
        garantiaDias:
          garantiaDiasTexto.trim() === ""
            ? undefined
            : Number(garantiaDiasTexto),
        garantiaObservacoes: garantiaObservacoesTexto.trim() || undefined,
        aprovadoPor: ordem.aprovadoPor,
        aprovadoEm: ordem.aprovadoEm,
        canalAprovacao: ordem.canalAprovacao,
        mensagemAprovacao: ordem.mensagemAprovacao,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ordem-servico", ordemId] }),
        queryClient.invalidateQueries({ queryKey: ["ordens-servico"] }),
      ]);
      setEditTermoOpen(false);
      toast.success("Prazo de garantia atualizado.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nao foi possivel atualizar a garantia.",
      );
    },
  });

  const descontoMutation = useMutation({
    mutationFn: () => {
      if (!ordem) {
        throw new Error("OS nao carregada.");
      }

      return updateOrdemServico(ordem.id, {
        clienteId: ordem.clienteId,
        aparelhoId: ordem.aparelhoId,
        checklistId: ordem.checklistId,
        defeitoRelatado: ordem.defeitoRelatado,
        diagnostico: ordem.diagnostico,
        tipoSenha: ordem.tipoSenha,
        senhaAparelho: ordem.senhaAparelho,
        padraoDeSenha: ordem.padraoDeSenha,
        status: ordem.status,
        prioridade: ordem.prioridade,
        tecnicoResponsavel: ordem.tecnicoResponsavel,
        pecasUsadas:
          ordem.pecasUsadas.length > 0
            ? ordem.pecasUsadas.map((peca) => ({
                produtoId: peca.produtoId,
                quantidade: peca.quantidade,
                valorUnitario: peca.valorUnitario,
              }))
            : undefined,
        valorMaoObra: ordem.valorMaoObra,
        maoObraInclusaNaPeca: ordem.maoObraInclusaNaPeca,
        desconto:
          descontoTexto.trim() === ""
            ? undefined
            : Number(descontoTexto.replace(",", ".")),
        entradaEm: ordem.entradaEm,
        previsaoEntregaEm: ordem.previsaoEntregaEm,
        prazoPrometidoEm: ordem.prazoPrometidoEm,
        garantiaDias: ordem.garantiaDias,
        garantiaObservacoes: ordem.garantiaObservacoes,
        aprovadoPor: ordem.aprovadoPor,
        aprovadoEm: ordem.aprovadoEm,
        canalAprovacao: ordem.canalAprovacao,
        mensagemAprovacao: ordem.mensagemAprovacao,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ordem-servico", ordemId] }),
        queryClient.invalidateQueries({ queryKey: ["ordens-servico"] }),
      ]);
      toast.success("Desconto da OS atualizado.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nao foi possivel atualizar o desconto.",
      );
    },
  });

  const openEditGarantia = () => {
    setGarantiaDiasTexto(String(ordem.garantiaDias ?? 90));
    setGarantiaObservacoesTexto(ordem.garantiaObservacoes ?? "");
    setEditTermoOpen(true);
  };

  const handlePrintGarantia = () => {
    document.body.classList.add("print-garantia");
    window.print();
    const onAfterPrint = () => {
      document.body.classList.remove("print-garantia");
      window.removeEventListener("afterprint", onAfterPrint);
    };
    window.addEventListener("afterprint", onAfterPrint);
  };

  const isLoading =
    ordemQuery.isLoading || clienteQuery.isLoading || aparelhoQuery.isLoading;
  const isError =
    ordemQuery.isError || clienteQuery.isError || aparelhoQuery.isError;

  const deviceLabel = useMemo(() => {
    if (!aparelho) {
      return "Aparelho não encontrado";
    }

    return `${aparelho.marca} ${aparelho.modelo}`;
  }, [aparelho]);

  const produtos = produtosQuery.data ?? [];
  const produtosFiltrados = useMemo(() => {
    const termo = pecaBusca.trim().toLowerCase();

    if (!termo) {
      return produtos.slice(0, 80);
    }

    return produtos
      .filter((produto) =>
        [
          produto.sku,
          produto.nome,
          produto.marca ?? "",
          produto.modelo ?? "",
          produto.codigoFornecedor ?? "",
          String(produto.precoVenda),
          formatBRL(produto.precoVenda),
        ].some((valor) => valor.toLowerCase().includes(termo)),
      )
      .slice(0, 80);
  }, [pecaBusca, produtos]);
  const selectedProduto = produtos.find(
    (produto) => produto.id === pecaProdutoId,
  );

  const updatePecasMutation = useMutation({
    mutationFn: (pecasUsadas: OrdemServicoPecaInput[]) => {
      if (!ordem) {
        throw new Error("OS nao carregada.");
      }

      return updateOrdemServico(ordem.id, {
        clienteId: ordem.clienteId,
        aparelhoId: ordem.aparelhoId,
        checklistId: ordem.checklistId,
        defeitoRelatado: ordem.defeitoRelatado,
        diagnostico: ordem.diagnostico,
        status: ordem.status,
        tecnicoResponsavel: ordem.tecnicoResponsavel,
        pecasUsadas,
        valorMaoObra: ordem.valorMaoObra,
        maoObraInclusaNaPeca: ordem.maoObraInclusaNaPeca,
        desconto: ordem.desconto,
        entradaEm: ordem.entradaEm,
        previsaoEntregaEm: ordem.previsaoEntregaEm,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ordem-servico", ordemId] }),
        queryClient.invalidateQueries({ queryKey: ["ordens-servico"] }),
        queryClient.invalidateQueries({ queryKey: ["produtos"] }),
        queryClient.invalidateQueries({ queryKey: ["movimentacoes-estoque"] }),
      ]);
      setPecaProdutoId("");
      setPecaQuantidade("1");
      setPecaError(null);
    },
    onError: (error) => {
      setPecaError(
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar a peça.",
      );
    },
  });

  const handleAddPeca = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPecaError(null);

    if (!ordem || !selectedProduto) {
      setPecaError("Selecione uma peça do estoque.");
      return;
    }

    const quantidade = Math.max(
      1,
      Math.trunc(Number(pecaQuantidade.replace(",", ".")) || 1),
    );
    const currentPecas = ordem.pecasUsadas ?? [];
    const existingPeca = currentPecas.find(
      (peca) => peca.produtoId === selectedProduto.id,
    );
    const pecasUsadas = existingPeca
      ? currentPecas.map((peca) =>
          peca.produtoId === selectedProduto.id
            ? {
                produtoId: peca.produtoId,
                quantidade: peca.quantidade + quantidade,
                valorUnitario: peca.valorUnitario,
              }
            : {
                produtoId: peca.produtoId,
                quantidade: peca.quantidade,
                valorUnitario: peca.valorUnitario,
              },
        )
      : [
          ...currentPecas.map((peca) => ({
            produtoId: peca.produtoId,
            quantidade: peca.quantidade,
            valorUnitario: peca.valorUnitario,
          })),
          {
            produtoId: selectedProduto.id,
            quantidade,
            valorUnitario: selectedProduto.precoVenda,
          },
        ];

    updatePecasMutation.mutate(pecasUsadas);
  };

  if (isLoading) {
    return (
      <Card className="surface-panel flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (isError || !ordem) {
    return (
      <Card className="surface-panel">
        <EmptyState
          icon={ClipboardList}
          title="Não foi possível carregar a OS"
          description="Verifique se o backend está rodando e tente novamente."
          actions={
            <Button asChild variant="outline">
              <Link to="/app/ordens">Voltar para ordens</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const garantiaInicioLabel = ordem.entregueEm
    ? formatDate(ordem.entregueEm)
    : "A partir da retirada";
  const garantiaValidadeLabel = ordem.garantiaAte
    ? formatDate(ordem.garantiaAte)
    : "Calculada na retirada";

  const OsPreviewContent = ({
    viaInterna = false,
  }: {
    viaInterna?: boolean;
  }) => {
    const tipoSenhaLabel: Record<string, string> = {
      sem_senha: "Sem senha",
      numerica: "Senha numérica",
      padrao: "Padrão/desenho",
      nao_informou: "Cliente não informou",
    };
    const senhaInfo = ordem.tipoSenha
      ? (tipoSenhaLabel[ordem.tipoSenha] ?? ordem.tipoSenha)
      : "Não informado";
    const senhaDetalhe = viaInterna
      ? ordem.tipoSenha === "numerica"
        ? ordem.senhaAparelho
        : ordem.tipoSenha === "padrao"
          ? ordem.padraoDeSenha
          : undefined
      : undefined;

    return (
      <>
        {/* Cabeçalho */}
        <div
          style={{
            borderBottom: "2px solid #111827",
            paddingBottom: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              {(() => {
                const logoUrl = localStorage.getItem("rr-logo-url");
                return logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    style={{
                      maxHeight: 60,
                      maxWidth: 140,
                      objectFit: "contain",
                      flexShrink: 0,
                    }}
                  />
                ) : null;
              })()}
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  {EMPRESA.nome}
                </p>
                <p style={{ margin: 0, fontSize: 10, color: "#374151" }}>
                  CNPJ: {EMPRESA.cnpj}
                </p>
                <p style={{ margin: 0, fontSize: 10, color: "#374151" }}>
                  {EMPRESA.enderecoCompleto}
                </p>
                <p style={{ margin: 0, fontSize: 10, color: "#374151" }}>
                  Tel/WhatsApp: {EMPRESA.telefone}
                </p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#0284c7",
                }}
              >
                ORDEM DE SERVIÇO
              </p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                OS-{ordem.numero}
              </p>
              <p style={{ margin: 0, fontSize: 10, color: "#374151" }}>
                {viaInterna ? "Via interna" : "Via do cliente"}
              </p>
            </div>
          </div>
        </div>

        {/* Datas */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {[
            { label: "Data de entrada", val: formatDate(ordem.entradaEm) },
            {
              label: "Previsão de entrega",
              val: ordem.previsaoEntregaEm
                ? formatDate(ordem.previsaoEntregaEm)
                : "—",
            },
            {
              label: "Técnico responsável",
              val: ordem.tecnicoResponsavel ?? EMPRESA.tecnicoPadrao,
            },
          ].map(({ label, val }) => (
            <div
              key={label}
              style={{
                border: "1px solid #d1d5db",
                borderRadius: 6,
                padding: 8,
              }}
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
                {label}
              </span>
              <strong style={{ display: "block", fontSize: 12, marginTop: 2 }}>
                {val}
              </strong>
            </div>
          ))}
        </div>

        {/* Dados do cliente e aparelho */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
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
            {cliente?.email && (
              <p style={{ margin: "2px 0 0", fontSize: 10 }}>
                E-mail: {cliente.email}
              </p>
            )}
            {cliente?.endereco && (
              <p style={{ margin: "2px 0 0", fontSize: 10 }}>
                End.: {cliente.endereco}
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
            {aparelho?.cor && (
              <p style={{ margin: "2px 0 0", fontSize: 10 }}>
                Cor: {aparelho.cor}
              </p>
            )}
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
            {aparelho?.acessorios && (
              <p style={{ margin: "2px 0 0", fontSize: 10 }}>
                Acessórios: {aparelho.acessorios}
              </p>
            )}
          </div>
        </div>

        {/* Defeito e diagnóstico */}
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
                  padding: "6px 8px",
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
                  padding: "6px 8px",
                  fontSize: 11,
                }}
              >
                {ordem.defeitoRelatado}
              </td>
            </tr>
            {ordem.diagnostico && (
              <tr>
                <th
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "6px 8px",
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
                    padding: "6px 8px",
                    fontSize: 11,
                  }}
                >
                  {ordem.diagnostico}
                </td>
              </tr>
            )}
            <tr>
              <th
                style={{
                  border: "1px solid #d1d5db",
                  padding: "6px 8px",
                  background: "#f3f4f6",
                  textAlign: "left",
                  fontSize: 10,
                  textTransform: "uppercase",
                  width: 140,
                }}
              >
                Senha do aparelho
              </th>
              <td
                style={{
                  border: "1px solid #d1d5db",
                  padding: "6px 8px",
                  fontSize: 11,
                }}
              >
                {senhaInfo}
                {senhaDetalhe && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontFamily: "monospace",
                      fontWeight: 700,
                    }}
                  >
                    — {senhaDetalhe}
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Peças usadas */}
        {(ordem.pecasUsadas ?? []).length > 0 && (
          <>
            <h2
              style={{
                margin: "0 0 6px",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Peças / serviços
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
                {ordem.pecasUsadas.map((p) => (
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
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 16,
            marginBottom: 14,
            fontSize: 11,
          }}
        >
          <span>
            Peças: <strong>{formatBRL(ordem.valorPecas)}</strong>
          </span>
          {ordem.valorMaoObra > 0 && (
            <span>
              Mão de obra: <strong>{formatBRL(ordem.valorMaoObra)}</strong>
            </span>
          )}
          {ordem.maoObraInclusaNaPeca && (
            <span>
              Mão de obra: <strong>Inclusa na peça</strong>
            </span>
          )}
          <span style={{ fontWeight: 700, fontSize: 13 }}>
            Total: <strong>{formatBRL(ordem.valorTotal)}</strong>
          </span>
        </div>

        {/* Termo */}
        <div
          style={{
            border: "1px solid #d1d5db",
            borderRadius: 4,
            padding: "8px 10px",
            marginBottom: 14,
            fontSize: 10,
            color: "#374151",
          }}
        >
          <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 11 }}>
            Termo de entrega e garantia
          </p>
          <p style={{ margin: 0 }}>
            {localStorage.getItem("rr-termo-os") ??
              "Ao assinar esta ordem de serviço, o cliente confirma as informações do aparelho, defeito relatado, acessórios entregues e condições descritas. O cliente está ciente de que deverá retirar o aparelho dentro do prazo combinado após a conclusão do serviço. A garantia cobre somente o serviço realizado e/ou a peça substituída, não se estendendo a danos causados por mau uso, queda, contato com líquido, violação por terceiros ou novos defeitos não relacionados ao reparo executado."}
          </p>
        </div>

        {/* Assinaturas */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            marginTop: 24,
          }}
        >
          {[
            "Assinatura do cliente",
            `Atendente: ${ordem.tecnicoResponsavel ?? EMPRESA.tecnicoPadrao}`,
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
      {/* Dialog: confirmar exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Excluir ordem de serviço</DialogTitle>
            <DialogDescription>
              Confirme antes de remover esta ordem de serviço.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir a{" "}
              <span className="font-semibold text-foreground">
                OS-{ordem.numero}
              </span>
              ?
              <br />
              <span className="text-destructive">
                Essa ação não poderá ser desfeita.
              </span>
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={excluirOsMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={excluirOsMutation.isPending}
                onClick={() => excluirOsMutation.mutate()}
              >
                {excluirOsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Excluir OS
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PrintPreviewDialog
        open={previewOsOpen}
        onOpenChange={setPreviewOsOpen}
        title={`OS-${ordem.numero} — Via do Cliente`}
        onPrint={window.print}
        showPdfButton
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditTermoOsOpen(true)}
          >
            Editar termo
          </Button>
        }
      >
        <OsPreviewContent viaInterna={false} />
      </PrintPreviewDialog>
      <PrintPreviewDialog
        open={previewOsViaInterna}
        onOpenChange={setPreviewOsViaInterna}
        title={`OS-${ordem.numero} — Via Interna`}
        onPrint={window.print}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditTermoOsOpen(true)}
          >
            Editar termo
          </Button>
        }
      >
        <OsPreviewContent viaInterna={true} />
      </PrintPreviewDialog>
      <PrintPreviewDialog
        open={previewGarantiaOpen}
        onOpenChange={setPreviewGarantiaOpen}
        title={`Termo de Garantia OS-${ordem.numero}`}
        onPrint={handlePrintGarantia}
        actions={
          <Button variant="outline" size="sm" onClick={openEditGarantia}>
            Editar garantia
          </Button>
        }
      >
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "2px solid #111827",
              paddingBottom: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <p
                style={{
                  color: "#0284c7",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                RR Infocell
              </p>
              <h1 style={{ margin: 0, fontSize: 22, color: "#111827" }}>
                Termo de Garantia
              </h1>
              <p style={{ margin: 0, fontSize: 11, color: "#374151" }}>
                OS-{ordem.numero} · Técnico: {ordem.tecnicoResponsavel ?? "—"}
              </p>
            </div>
          </div>
          <div
            style={{
              border: "2px solid #0284c7",
              borderRadius: 6,
              padding: "10px 14px",
              textAlign: "center",
              margin: "14px 0",
              background: "#f0f9ff",
            }}
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
              Garantia do serviço
            </span>
            <strong
              style={{
                display: "block",
                fontSize: 18,
                color: "#0284c7",
                margin: "4px 0",
              }}
            >
              {ordem.garantiaDias ? `${ordem.garantiaDias} dias` : "—"}
            </strong>
            <p style={{ margin: 0, fontSize: 10, color: "#374151" }}>
              Inicia em {garantiaInicioLabel}
            </p>
            <p style={{ margin: 0, fontSize: 10, color: "#374151" }}>
              Valida ate {garantiaValidadeLabel}
            </p>
          </div>
          <p style={{ fontSize: 10, color: "#374151" }}>{termoTexto}</p>
        </div>
      </PrintPreviewDialog>

      {/* Dialog editar termo da OS */}
      <Dialog open={editTermoOsOpen} onOpenChange={setEditTermoOsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar termo da OS</DialogTitle>
            <DialogDescription>
              Este texto aparece no rodape de todas as OS impressas. A alteracao
              fica salva no navegador.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={6}
            value={termoOsTexto}
            onChange={(e) => setTermoOsTexto(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditTermoOsOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              onClick={() => {
                localStorage.setItem("rr-termo-os", termoOsTexto);
                setEditTermoOsOpen(false);
              }}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog editar termo de garantia */}
      <Dialog open={editTermoOpen} onOpenChange={setEditTermoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar garantia</DialogTitle>
            <DialogDescription>
              Ajuste o prazo e a observacao que aparecem no Termo de Garantia
              impresso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField id="garantia-dias" label="Prazo de garantia (dias)">
              <Input
                id="garantia-dias"
                type="number"
                min="0"
                step="1"
                value={garantiaDiasTexto}
                onChange={(event) => setGarantiaDiasTexto(event.target.value)}
              />
            </FormField>
            <FormField id="garantia-observacoes" label="Observacao da garantia">
              <Textarea
                id="garantia-observacoes"
                rows={4}
                value={garantiaObservacoesTexto}
                onChange={(event) =>
                  setGarantiaObservacoesTexto(event.target.value)
                }
                placeholder="Ex.: garantia de 90 dias para tela e mao de obra"
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditTermoOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              disabled={garantiaMutation.isPending}
              onClick={() => garantiaMutation.mutate()}
            >
              {garantiaMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-5">
        <PageHeader
          eyebrow="Ordem de serviço"
          title={`OS-${ordem.numero}`}
          description="Detalhes operacionais e comprovante simples para impressao."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/app/ordens">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={`/app/checklist?ordemId=${ordem.id}`}>
                  <ClipboardCheck className="h-4 w-4" /> Checklist
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={`/app/checklist?ordemId=${ordem.id}&tipo=saida`}>
                  <ClipboardCheck className="h-4 w-4" /> Saida
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => setPreviewGarantiaOpen(true)}
              >
                <ShieldCheck className="h-4 w-4" /> Termo de Garantia
              </Button>
              <Button variant="outline" onClick={() => setPreviewOsOpen(true)}>
                <Printer className="h-4 w-4" /> Via do cliente
              </Button>
              <Button onClick={() => setPreviewOsViaInterna(true)}>
                <Printer className="h-4 w-4" /> Via interna
              </Button>
              <Button
                variant="outline"
                className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" /> Excluir OS
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="surface-panel p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="mt-2">
              <StatusBadge status={ordem.status} />
            </div>
          </Card>
          <Card className="surface-panel p-4">
            <p className="text-xs text-muted-foreground">Entrada</p>
            <p className="mt-1 font-mono text-lg">
              {formatDate(ordem.entradaEm)}
            </p>
          </Card>
          <Card className="surface-panel p-4">
            <p className="text-xs text-muted-foreground">Prazo prometido</p>
            <p className="mt-1 font-mono text-lg">
              {formatDate(ordem.prazoPrometidoEm ?? ordem.previsaoEntregaEm)}
            </p>
          </Card>
          <Card className="surface-panel p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="mt-1 font-display text-lg font-semibold">
              {formatBRL(ordem.valorTotal)}
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SectionPanel title="Cliente" className="lg:col-span-1">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Nome</dt>
                <dd className="font-medium">
                  {cliente?.nome ?? ordem.clienteId}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Telefone</dt>
                <dd className="flex items-center gap-2">
                  <span>{cliente?.telefone ?? "-"}</span>
                  {cliente?.telefone && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={`https://wa.me/55${cliente.telefone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5 fill-current"
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>Abrir WhatsApp</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Documento</dt>
                <dd>{cliente?.documento ?? "-"}</dd>
              </div>
              {cliente?.email && (
                <div>
                  <dt className="text-xs text-muted-foreground">E-mail</dt>
                  <dd className="truncate">{cliente.email}</dd>
                </div>
              )}
              {cliente?.observacoes && (
                <div>
                  <dt className="text-xs text-muted-foreground">Observações</dt>
                  <dd className="text-muted-foreground">
                    {cliente.observacoes}
                  </dd>
                </div>
              )}
            </dl>
          </SectionPanel>

          <SectionPanel title="Aparelho" className="lg:col-span-1">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Modelo</dt>
                <dd className="font-medium">{deviceLabel}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">IMEI/serial</dt>
                <dd>{aparelho?.imeiSerial ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Cor</dt>
                <dd>{aparelho?.cor ?? "-"}</dd>
              </div>
              {ordem.tipoSenha && ordem.tipoSenha !== "sem_senha" && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  <dt className="text-xs font-medium text-amber-600">
                    Senha (uso interno)
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm">
                    {ordem.tipoSenha === "numerica" && ordem.senhaAparelho
                      ? ordem.senhaAparelho
                      : ordem.tipoSenha === "padrao" && ordem.padraoDeSenha
                        ? ordem.padraoDeSenha
                        : ordem.tipoSenha === "nao_informou"
                          ? "Cliente não informou"
                          : "-"}
                  </dd>
                </div>
              )}
            </dl>
          </SectionPanel>

          <SectionPanel title="Valores" className="lg:col-span-1">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Peças</dt>
                <dd className="font-mono">{formatBRL(ordem.valorPecas)}</dd>
              </div>
              {ordem.valorMaoObra > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Mão de obra</dt>
                  <dd className="font-mono">{formatBRL(ordem.valorMaoObra)}</dd>
                </div>
              )}
              {ordem.maoObraInclusaNaPeca && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Mão de obra</dt>
                  <dd>Inclusa na peça</dd>
                </div>
              )}
              {ordem.desconto ? (
                <div className="flex justify-between gap-4 text-amber-600">
                  <dt>Desconto</dt>
                  <dd className="font-mono">- {formatBRL(ordem.desconto)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-border pt-3">
                <dt className="font-medium">Total</dt>
                <dd className="font-mono font-semibold">
                  {formatBRL(ordem.valorTotal)}
                </dd>
              </div>
              <div className="space-y-2 border-t border-border pt-3">
                <FormField id="os-desconto" label="Desconto na OS">
                  <MoneyInput
                    id="os-desconto"
                    value={descontoTexto}
                    onChange={setDescontoTexto}
                  />
                </FormField>
                <Button
                  className="w-full"
                  disabled={descontoMutation.isPending}
                  onClick={() => descontoMutation.mutate()}
                  type="button"
                  variant="outline"
                >
                  {descontoMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Salvar desconto
                </Button>
              </div>
            </dl>
          </SectionPanel>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SectionPanel title="Controle da OS" className="lg:col-span-1">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Prioridade</dt>
                <dd className="font-medium capitalize">{ordem.prioridade}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Técnico</dt>
                <dd>{ordem.tecnicoResponsavel ?? "-"}</dd>
              </div>
            </dl>
          </SectionPanel>
          <SectionPanel title="Aprovacao" className="lg:col-span-1">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Aprovado por</dt>
                <dd>{ordem.aprovadoPor ?? "-"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Canal</dt>
                <dd>{ordem.canalAprovacao ?? "-"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Data</dt>
                <dd>{formatDate(ordem.aprovadoEm)}</dd>
              </div>
            </dl>
          </SectionPanel>
          <SectionPanel title="Garantia" className="lg:col-span-1">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Prazo</dt>
                <dd>
                  {ordem.garantiaDias ? `${ordem.garantiaDias} dias` : "-"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Inicio</dt>
                <dd>{garantiaInicioLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Valida ate</dt>
                <dd>{garantiaValidadeLabel}</dd>
              </div>
            </dl>
          </SectionPanel>
        </div>

        <SectionPanel title="Defeito e diagnóstico">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Defeito relatado</p>
              <p className="mt-1 text-sm">{ordem.defeitoRelatado}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Diagnóstico</p>
              <p className="mt-1 text-sm">{ordem.diagnostico ?? "-"}</p>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Peças usadas">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Peça</th>
                    <th className="px-4 py-3 text-center font-medium">Qtd.</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Unitário
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(ordem.pecasUsadas ?? []).length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-5 text-center text-muted-foreground"
                        colSpan={4}
                      >
                        Nenhuma peça vinculada a esta OS.
                      </td>
                    </tr>
                  ) : (
                    ordem.pecasUsadas.map((peca) => (
                      <tr
                        key={peca.produtoId}
                        className="border-b border-border/40 last:border-b-0"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">{peca.nome}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {peca.sku}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {peca.quantidade}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatBRL(peca.valorUnitario)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          {formatBRL(peca.valorTotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <form className="space-y-3" onSubmit={handleAddPeca}>
              <FormField id="os-peca-produto" label="Peça do estoque">
                <Popover
                  open={pecaComboboxOpen}
                  onOpenChange={(open) => {
                    setPecaComboboxOpen(open);
                    if (!open) setPecaBusca("");
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={pecaComboboxOpen}
                      className="w-full justify-between font-normal"
                      disabled={produtosQuery.isLoading}
                    >
                      {selectedProduto
                        ? `${selectedProduto.sku} - ${selectedProduto.nome}`
                        : "Selecione a peça"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0"
                    style={{ width: "var(--radix-popover-trigger-width)" }}
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Código, nome ou valor"
                        value={pecaBusca}
                        onValueChange={setPecaBusca}
                      />
                      <CommandList>
                        <CommandEmpty>Nenhuma peça encontrada.</CommandEmpty>
                        <CommandGroup>
                          {produtosFiltrados.map((produto) => (
                            <CommandItem
                              key={produto.id}
                              value={produto.id}
                              onSelect={() => {
                                setPecaProdutoId(produto.id);
                                setPecaBusca("");
                                setPecaComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  pecaProdutoId === produto.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {produto.sku} - {produto.nome} —{" "}
                              {formatBRL(produto.precoVenda)} (
                              {produto.estoqueAtual})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </FormField>
              <FormField id="os-peca-quantidade" label="Quantidade">
                <Input
                  id="os-peca-quantidade"
                  min="1"
                  step="1"
                  type="number"
                  value={pecaQuantidade}
                  onChange={(event) => setPecaQuantidade(event.target.value)}
                />
              </FormField>
              {selectedProduto && (
                <p className="text-xs text-muted-foreground">
                  Estoque atual: {selectedProduto.estoqueAtual} - venda:{" "}
                  {formatBRL(selectedProduto.precoVenda)}
                </p>
              )}
              {pecaError && (
                <p className="text-sm text-destructive">{pecaError}</p>
              )}
              <Button
                className="w-full"
                disabled={updatePecasMutation.isPending || !pecaProdutoId}
                type="submit"
              >
                {updatePecasMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PackagePlus className="h-4 w-4" />
                )}
                Adicionar e baixar
              </Button>
            </form>
          </div>
        </SectionPanel>

        <section className="checklist-print-area">
          <header className="print-header">
            <div>
              <p className="print-kicker">RR Infocell</p>
              <h1>Comprovante de ordem de serviço</h1>
              <p>Documento simples para controle de entrada e retirada.</p>
            </div>
            <div className="print-meta">
              <strong>OS-{ordem.numero}</strong>
              <span>Status: {ordem.status.replace(/_/g, " ")}</span>
              <span>Entrada: {formatDate(ordem.entradaEm)}</span>
              <span>Previsão: {formatDate(ordem.previsaoEntregaEm)}</span>
            </div>
          </header>

          <div className="print-grid print-summary">
            <div>
              <span>Cliente</span>
              <strong>{cliente?.nome ?? ordem.clienteId}</strong>
              <p>{cliente?.telefone ?? "-"}</p>
            </div>
            <div>
              <span>Aparelho</span>
              <strong>{deviceLabel}</strong>
              <p>
                {aparelho?.imeiSerial ? `IMEI ${aparelho.imeiSerial}` : "-"}
              </p>
            </div>
            <div>
              <span>Total previsto</span>
              <strong>{formatBRL(ordem.valorTotal)}</strong>
              <p>
                Peças {formatBRL(ordem.valorPecas)}
                {ordem.valorMaoObra > 0
                  ? ` + mão de obra ${formatBRL(ordem.valorMaoObra)}`
                  : ""}
                {ordem.maoObraInclusaNaPeca
                  ? " + mão de obra inclusa na peça"
                  : ""}
              </p>
            </div>
          </div>

          <h2>Relato e diagnóstico</h2>
          <table className="print-table">
            <tbody>
              <tr>
                <th>Defeito relatado</th>
                <td>{ordem.defeitoRelatado}</td>
              </tr>
              <tr>
                <th>Diagnóstico</th>
                <td>{ordem.diagnostico ?? "-"}</td>
              </tr>
              <tr>
                <th>Técnico responsável</th>
                <td>{ordem.tecnicoResponsavel ?? "-"}</td>
              </tr>
            </tbody>
          </table>

          <h2>Peças usadas</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Peça</th>
                <th>Qtd.</th>
                <th>Unitário</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {(ordem.pecasUsadas ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4}>Nenhuma peça vinculada.</td>
                </tr>
              ) : (
                ordem.pecasUsadas.map((peca) => (
                  <tr key={peca.produtoId}>
                    <td>
                      {peca.nome} ({peca.sku})
                    </td>
                    <td>{peca.quantidade}</td>
                    <td>{formatBRL(peca.valorUnitario)}</td>
                    <td>{formatBRL(peca.valorTotal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="print-signatures">
            <div>
              <span>Cliente</span>
            </div>
            <div>
              <span>RR Infocell</span>
            </div>
          </div>
        </section>

        <section className="garantia-print-area">
          <header className="print-header">
            <div>
              <p className="print-kicker">RR Infocell</p>
              <h1>Termo de Garantia</h1>
              <p>
                OS-{ordem.numero} — emitido em{" "}
                {formatDate(new Date().toISOString())}
              </p>
            </div>
            <div className="print-meta">
              <strong>OS-{ordem.numero}</strong>
              <span>Técnico: {ordem.tecnicoResponsavel ?? "—"}</span>
              <span>Retirada: {garantiaInicioLabel}</span>
            </div>
          </header>

          <div className="print-grid print-summary">
            <div>
              <span>Cliente</span>
              <strong>{cliente?.nome ?? ordem.clienteId}</strong>
              <p>{cliente?.telefone ?? "—"}</p>
              <p>{cliente?.documento ?? "—"}</p>
            </div>
            <div>
              <span>Aparelho</span>
              <strong>{deviceLabel}</strong>
              <p>
                {aparelho?.imeiSerial ? `IMEI ${aparelho.imeiSerial}` : "—"}
              </p>
              {aparelho?.cor && <p>Cor: {aparelho.cor}</p>}
              {aparelho?.acessorios && <p>Acessórios: {aparelho.acessorios}</p>}
            </div>
            <div>
              <span>Total pago</span>
              <strong>{formatBRL(ordem.valorTotal)}</strong>
              <p>Peças: {formatBRL(ordem.valorPecas)}</p>
              {ordem.valorMaoObra > 0 && (
                <p>Mão de obra: {formatBRL(ordem.valorMaoObra)}</p>
              )}
              {ordem.maoObraInclusaNaPeca && (
                <p>Mão de obra: inclusa na peça</p>
              )}
              {ordem.formaPagamento && (
                <p>Pagamento: {ordem.formaPagamento.toUpperCase()}</p>
              )}
            </div>
          </div>

          <h2>Serviço realizado</h2>
          <table className="print-table">
            <tbody>
              <tr>
                <th>Defeito relatado</th>
                <td>{ordem.defeitoRelatado}</td>
              </tr>
              <tr>
                <th>Diagnóstico / serviço executado</th>
                <td>{ordem.diagnostico ?? "—"}</td>
              </tr>
              <tr>
                <th>Técnico responsável</th>
                <td>{ordem.tecnicoResponsavel ?? "—"}</td>
              </tr>
              {aparelho?.estadoFisico && (
                <tr>
                  <th>Estado físico na entrega</th>
                  <td>{aparelho.estadoFisico}</td>
                </tr>
              )}
            </tbody>
          </table>

          {(ordem.pecasUsadas ?? []).length > 0 && (
            <>
              <h2>Peças substituídas</h2>
              <table className="print-table">
                <thead>
                  <tr>
                    <th>Peça</th>
                    <th>Qtd.</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ordem.pecasUsadas.map((peca) => (
                    <tr key={peca.produtoId}>
                      <td>{peca.nome}</td>
                      <td>{peca.quantidade}</td>
                      <td>{formatBRL(peca.valorTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="garantia-highlight">
            <span>Garantia do serviço</span>
            <strong>
              {ordem.garantiaDias ? `${ordem.garantiaDias} dias` : "—"}
            </strong>
            <p>Inicio: {garantiaInicioLabel}</p>
            <p>Valida ate {garantiaValidadeLabel}</p>
            {ordem.garantiaObservacoes && <p>{ordem.garantiaObservacoes}</p>}
          </div>

          <div className="garantia-terms">
            <strong>Termos da garantia</strong>
            <p style={{ marginTop: 6 }}>
              A RR Infocell garante os serviços realizados e as peças
              substituídas pelo prazo acima, contado a partir da data de
              retirada do aparelho pelo cliente. A garantia cobre exclusivamente
              defeitos relacionados ao serviço descrito neste documento.
            </p>
            <p style={{ marginTop: 8 }}>
              <strong>A garantia não cobre:</strong>
            </p>
            <ul>
              <li>Danos físicos, quedas, impactos ou pressão mecânica</li>
              <li>Danos por líquidos ou umidade</li>
              <li>Mau uso ou instalação de softwares não autorizados</li>
              <li>Intervenção de terceiros após a realização do serviço</li>
              <li>Desgaste natural do equipamento</li>
            </ul>
            <p style={{ marginTop: 8 }}>
              Para acionar a garantia, o cliente deverá apresentar este
              documento na RR Infocell.
            </p>
          </div>

          <div className="print-signatures">
            <div>
              <span>Cliente — {cliente?.nome ?? "—"}</span>
            </div>
            <div>
              <span>RR Infocell</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default OrdemDetalhe;
