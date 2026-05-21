import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  FileDown,
  Loader2,
  Minus,
  Plus,
  Printer,
  QrCode,
  Receipt,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { EmptyState, FormField, PageHeader } from "@/components/design-system";
import { PrintPreviewDialog } from "@/components/PrintPreviewDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/formatters";
import { EMPRESA } from "@/constants/company";
import { MoneyInput } from "@/components/ui/money-input";
import { listAparelhos } from "@/services/aparelhos";
import { listClientes } from "@/services/clientes";
import {
  listOrdensServico,
  type OrdemServico,
  type OrdemServicoFormaPagamento,
} from "@/services/ordens-servico";
import { listProdutos, type Produto } from "@/services/produtos";
import { createVenda, listVendas, type Venda } from "@/services/vendas";
import {
  createTerceirizado,
  type TerceirizadoInput,
} from "@/services/terceirizados";
import { toast } from "@/components/ui/sonner";

// ── Tipos para terceirizado ───────────────────────────────────────────────────
type TerceirizadoInfo = {
  responsavel: string;
  descricao: string;
  valorRepasse: string;
  statusRepasse: "pendente" | "pago";
  observacoes: string;
};

type TerceirizadoFinalizado = {
  id: string;
  clienteNome?: string;
  responsavel?: string;
  descricao?: string;
  valorCobrado: number;
  valorRepasse: number;
  lucro: number;
  statusRepasse: "pendente" | "pago";
  observacoes?: string;
  createdAt: string;
};

const emptyTerceirizado: TerceirizadoInfo = {
  responsavel: "",
  descricao: "",
  valorRepasse: "",
  statusRepasse: "pendente",
  observacoes: "",
};

// ── Opções de pagamento ───────────────────────────────────────────────────────
const paymentOptions: Array<{
  key: OrdemServicoFormaPagamento;
  label: string;
  icon: typeof QrCode;
}> = [
  { key: "pix", label: "PIX", icon: QrCode },
  { key: "cartao", label: "Cartão", icon: CreditCard },
  { key: "dinheiro", label: "Dinheiro", icon: Banknote },
  { key: "terceirizado", label: "Terceirizado", icon: Users },
];

const PDV = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedOrdemId, setSelectedOrdemId] = useState(
    searchParams.get("ordemId") ?? "",
  );
  const [formaPagamento, setFormaPagamento] =
    useState<OrdemServicoFormaPagamento>("pix");
  const [valorRecebido, setValorRecebido] = useState("");
  const [desconto, setDesconto] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [modoVenda, setModoVenda] = useState<"os" | "direta">("os");
  const [clienteVendaDireta, setClienteVendaDireta] = useState("");
  const [carrinho, setCarrinho] = useState<
    Array<Produto & { quantidadeVenda: number }>
  >([]);
  const [ordemFinalizada, setOrdemFinalizada] = useState<OrdemServico | null>(
    null,
  );
  const [vendaFinalizada, setVendaFinalizada] = useState<Venda | null>(null);
  const [cupomOpen, setCupomOpen] = useState(false);
  const [larguraCupom, setLarguraCupom] = useState<"58mm" | "80mm">(
    () =>
      (localStorage.getItem("rr-cupom-largura") as "58mm" | "80mm") ?? "80mm",
  );

  // ── Busca de produto ──────────────────────────────────────────────────────
  const [buscaProduto, setBuscaProduto] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);

  // ── Terceirizado ──────────────────────────────────────────────────────────
  const [terceirizadoInfo, setTerceirizadoInfo] =
    useState<TerceirizadoInfo>(emptyTerceirizado);
  const [terceirizadoFinalizado, setTerceirizadoFinalizado] =
    useState<TerceirizadoFinalizado | null>(null);
  const [tercErrors, setTercErrors] = useState<Record<string, string>>({});

  const ordensQuery = useQuery({
    queryKey: ["ordens-servico", "pdv"],
    queryFn: () => listOrdensServico(),
  });

  const clientesQuery = useQuery({
    queryKey: ["clientes", "pdv"],
    queryFn: () => listClientes(""),
  });

  const aparelhosQuery = useQuery({
    queryKey: ["aparelhos", "pdv"],
    queryFn: () => listAparelhos(),
  });

  const vendasQuery = useQuery({
    queryKey: ["vendas", "pdv"],
    queryFn: () => listVendas(),
  });

  const produtosQuery = useQuery({
    queryKey: ["produtos", "pdv-direto"],
    queryFn: () => listProdutos({ ativo: true }),
  });

  const ordens = useMemo(
    () =>
      (ordensQuery.data ?? []).filter(
        (ordem) => ordem.status === "pronto_para_retirada",
      ),
    [ordensQuery.data],
  );

  const clienteById = useMemo(
    () => new Map((clientesQuery.data ?? []).map((c) => [c.id, c])),
    [clientesQuery.data],
  );

  const aparelhoById = useMemo(
    () => new Map((aparelhosQuery.data ?? []).map((a) => [a.id, a])),
    [aparelhosQuery.data],
  );

  const produtosVenda = useMemo(
    () =>
      (produtosQuery.data ?? []).filter(
        (p) => p.estoqueAtual > 0 || p.categoria === "servico",
      ),
    [produtosQuery.data],
  );

  // ── Busca filtrada de produtos ────────────────────────────────────────────
  const produtosBusca = useMemo(() => {
    const q = buscaProduto.trim().toLowerCase();
    if (!q) return [];
    return produtosVenda
      .filter((p) =>
        [
          p.nome,
          p.sku,
          p.marca ?? "",
          p.modelo ?? "",
          p.categoria,
          p.fornecedor ?? "",
          p.codigoFornecedor ?? "",
        ].some((v) => v.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [buscaProduto, produtosVenda]);

  const totalDireto = carrinho.reduce(
    (total, item) => total + item.precoVenda * item.quantidadeVenda,
    0,
  );

  const selectedOrdemPronta = useMemo(() => {
    if (!selectedOrdemId) return null;
    return ordens.find((o) => o.id === selectedOrdemId) ?? null;
  }, [ordens, selectedOrdemId]);

  const selectedOrdem = selectedOrdemPronta ?? ordemFinalizada;

  // ── Cálculo lucro terceirizado ────────────────────────────────────────────
  const lucroTerceirizado = useMemo(() => {
    if (formaPagamento !== "terceirizado") return null;
    const cobrado = Number(valorRecebido.replace(",", ".")) || 0;
    const repasse =
      Number(terceirizadoInfo.valorRepasse.replace(",", ".")) || 0;
    if (!cobrado && !repasse) return null;
    return cobrado - repasse;
  }, [formaPagamento, valorRecebido, terceirizadoInfo.valorRepasse]);

  useEffect(() => {
    if (!selectedOrdemId && ordens[0]) {
      setSelectedOrdemId(ordens[0].id);
    }
  }, [ordens, selectedOrdemId]);

  useEffect(() => {
    if (modoVenda === "os" && selectedOrdemPronta) {
      setValorRecebido(String(selectedOrdemPronta.valorTotal));
    }
  }, [modoVenda, selectedOrdemPronta]);

  const descontoNum = Number(desconto.replace(",", ".")) || 0;
  const totalDiretoComDesconto = Math.max(0, totalDireto - descontoNum);

  useEffect(() => {
    if (modoVenda === "direta" && formaPagamento !== "terceirizado") {
      setValorRecebido(String(totalDiretoComDesconto));
    }
  }, [modoVenda, totalDiretoComDesconto, formaPagamento]);

  const alterarQuantidade = (id: string, delta: number) => {
    setCarrinho((current) =>
      current.flatMap((item) => {
        if (item.id !== id) return [item];
        const novaQtd = item.quantidadeVenda + delta;
        if (novaQtd <= 0) return [];
        const limite = item.categoria === "servico" ? 999 : item.estoqueAtual;
        return [{ ...item, quantidadeVenda: Math.min(novaQtd, limite) }];
      }),
    );
  };

  const removerItem = (item: Produto & { quantidadeVenda: number }) => {
    setCarrinho((c) => c.filter((row) => row.id !== item.id));
    toast(`"${item.nome}" removido do carrinho`, {
      action: {
        label: "Desfazer",
        onClick: () => setCarrinho((c) => [...c, item]),
      },
    });
  };

  const adicionarProdutoById = (produtoId: string) => {
    const produto = produtosVenda.find((p) => p.id === produtoId);
    if (!produto) return;
    setCarrinho((current) => {
      if (
        produto.categoria.startsWith("celular_") &&
        current.some((item) => item.id === produto.id)
      ) {
        return current;
      }
      const existing = current.find((item) => item.id === produto.id);
      if (existing && !produto.categoria.startsWith("celular_")) {
        const limite =
          produto.categoria === "servico"
            ? existing.quantidadeVenda + 1
            : produto.estoqueAtual;
        return current.map((item) =>
          item.id === produto.id
            ? {
                ...item,
                quantidadeVenda: Math.min(item.quantidadeVenda + 1, limite),
              }
            : item,
        );
      }
      return [...current, { ...produto, quantidadeVenda: 1 }];
    });
  };

  const finalizarMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrdemPronta) {
        throw new Error("Selecione uma OS.");
      }
      const desc = Number(desconto.replace(",", ".")) || 0;
      const totalFinal = Math.max(0, selectedOrdemPronta.valorTotal - desc);

      if (formaPagamento === "terceirizado") {
        const errs: Record<string, string> = {};
        if (!terceirizadoInfo.responsavel.trim())
          errs.responsavel = "Informe o responsável.";
        if (Object.keys(errs).length > 0) {
          setTercErrors(errs);
          throw new Error("Preencha os dados do terceirizado.");
        }
        const venda = await createVenda({
          ordemServicoId: selectedOrdemPronta.id,
          formaPagamento: "terceirizado",
          valorRecebido: totalFinal,
          desconto: desc > 0 ? desc : undefined,
        });
        const cliente = clienteById.get(selectedOrdemPronta.clienteId);
        await createTerceirizado({
          clienteNome: cliente?.nome,
          responsavel: terceirizadoInfo.responsavel || undefined,
          descricao: terceirizadoInfo.descricao || undefined,
          valorCobrado: totalFinal,
          valorRepasse:
            Number(terceirizadoInfo.valorRepasse.replace(",", ".")) || 0,
          statusRepasse: terceirizadoInfo.statusRepasse,
          observacoes: terceirizadoInfo.observacoes || undefined,
        });
        return { ordem: selectedOrdemPronta, venda };
      }

      const recebido = Number(valorRecebido.replace(",", ".")) || 0;
      const adiantadoOS = selectedOrdemPronta.valorAdiantado ?? 0;
      const saldoFinal = Math.max(0, totalFinal - adiantadoOS);
      if (recebido < saldoFinal) {
        throw new Error("Valor recebido menor que o saldo devedor da OS.");
      }
      const venda = await createVenda({
        ordemServicoId: selectedOrdemPronta.id,
        formaPagamento,
        valorRecebido: recebido,
        desconto: desc > 0 ? desc : undefined,
      });
      return { ordem: selectedOrdemPronta, venda };
    },
    onSuccess: async ({ ordem, venda }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ordens-servico"] }),
        queryClient.invalidateQueries({
          queryKey: ["ordem-servico", venda.ordemServicoId],
        }),
        queryClient.invalidateQueries({ queryKey: ["vendas"] }),
        queryClient.invalidateQueries({ queryKey: ["ordem-eventos"] }),
        queryClient.invalidateQueries({ queryKey: ["terceirizados"] }),
      ]);
      setOrdemFinalizada({
        ...ordem,
        status: "entregue",
        formaPagamento: venda.formaPagamento,
        valorRecebido: venda.valorRecebido,
        troco: venda.troco,
      });
      setVendaFinalizada(venda);
      setDesconto("");
      setTerceirizadoInfo(emptyTerceirizado);
      setTercErrors({});
      setFormError(null);
    },
    onError: (error) => {
      setFormError(
        error instanceof Error
          ? error.message
          : "Não foi possível finalizar a venda.",
      );
    },
  });

  const vendaDiretaMutation = useMutation({
    mutationFn: async () => {
      if (carrinho.length === 0) throw new Error("Adicione ao menos um item.");
      const recebido = Number(valorRecebido.replace(",", ".")) || 0;
      const desc = Number(desconto.replace(",", ".")) || 0;
      const totalFinal = Math.max(0, totalDireto - desc);
      if (recebido < totalFinal)
        throw new Error("Valor recebido menor que o total da venda.");
      return createVenda({
        clienteNome: clienteVendaDireta || undefined,
        formaPagamento,
        valorRecebido: recebido,
        desconto: desc > 0 ? desc : undefined,
        itens: carrinho.map((item) => ({
          produtoId: item.id,
          quantidade: item.quantidadeVenda,
          valorUnitario: item.precoVenda,
          garantiaDias: item.garantiaDias,
        })),
      });
    },
    onSuccess: async (venda) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["produtos"] }),
        queryClient.invalidateQueries({ queryKey: ["movimentacoes-estoque"] }),
        queryClient.invalidateQueries({ queryKey: ["vendas"] }),
      ]);
      setVendaFinalizada(venda);
      setCarrinho([]);
      setBuscaProduto("");
      setClienteVendaDireta("");
      setDesconto("");
      setFormError(null);
    },
    onError: (error) => {
      setFormError(
        error instanceof Error
          ? error.message
          : "Não foi possível finalizar a venda.",
      );
    },
  });

  const finalizarTerceirizadoMutation = useMutation({
    mutationFn: async () => {
      const cobrado = Number(valorRecebido.replace(",", ".")) || 0;
      const repasse =
        Number(terceirizadoInfo.valorRepasse.replace(",", ".")) || 0;
      const input: TerceirizadoInput = {
        clienteNome: clienteVendaDireta || undefined,
        responsavel: terceirizadoInfo.responsavel || undefined,
        descricao: terceirizadoInfo.descricao || undefined,
        valorCobrado: cobrado,
        valorRepasse: repasse,
        statusRepasse: terceirizadoInfo.statusRepasse,
        observacoes: terceirizadoInfo.observacoes || undefined,
      };
      const terceirizado = await createTerceirizado(input);
      return {
        id: terceirizado.id,
        clienteNome: terceirizado.clienteNome ?? undefined,
        responsavel: terceirizado.responsavel ?? undefined,
        descricao: terceirizado.descricao ?? undefined,
        valorCobrado: terceirizado.valorCobrado,
        valorRepasse: terceirizado.valorRepasse,
        lucro: terceirizado.lucro,
        statusRepasse: terceirizado.statusRepasse,
        observacoes: terceirizado.observacoes ?? undefined,
        createdAt: terceirizado.criadoEm,
      } satisfies TerceirizadoFinalizado;
    },
    onSuccess: (entry) => {
      setTerceirizadoFinalizado(entry);
      setCarrinho([]);
      setBuscaProduto("");
      setClienteVendaDireta("");
      setFormError(null);
    },
    onError: (error) => {
      setFormError(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar lançamento.",
      );
    },
  });

  const handleSelectOrdem = (ordemId: string) => {
    setSelectedOrdemId(ordemId);
    setSearchParams({ ordemId });
    setOrdemFinalizada(null);
    setVendaFinalizada(null);
    setFormError(null);
  };

  const handleNovaVenda = () => {
    if (modoVenda === "direta") {
      setVendaFinalizada(null);
      setTerceirizadoFinalizado(null);
      setCarrinho([]);
      setBuscaProduto("");
      setClienteVendaDireta("");
      setValorRecebido("");
      setDesconto("");
      setTerceirizadoInfo(emptyTerceirizado);
      setFormaPagamento("pix");
      setFormError(null);
      return;
    }
    const proximaOrdem = ordens.find((o) => o.id !== ordemFinalizada?.id);
    setOrdemFinalizada(null);
    setVendaFinalizada(null);
    setFormError(null);
    if (proximaOrdem) {
      setSelectedOrdemId(proximaOrdem.id);
      setSearchParams({ ordemId: proximaOrdem.id });
      return;
    }
    setSelectedOrdemId("");
    setSearchParams({});
  };

  const handleImprimirRecibo = () => {
    document.body.classList.add("print-recibo");
    window.print();
    const onAfterPrint = () => {
      document.body.classList.remove("print-recibo");
      window.removeEventListener("afterprint", onAfterPrint);
    };
    window.addEventListener("afterprint", onAfterPrint);
  };

  const recebido = Number(valorRecebido.replace(",", ".")) || 0;
  const totalComDesconto = selectedOrdem
    ? Math.max(0, selectedOrdem.valorTotal - descontoNum)
    : 0;
  const adiantado = selectedOrdem?.valorAdiantado ?? 0;
  const saldo = Math.max(0, totalComDesconto - adiantado);
  const troco = selectedOrdem ? Math.max(0, recebido - saldo) : 0;
  const cliente = selectedOrdem
    ? clienteById.get(selectedOrdem.clienteId)
    : undefined;
  const aparelho = selectedOrdem
    ? aparelhoById.get(selectedOrdem.aparelhoId)
    : undefined;

  const isLoading =
    ordensQuery.isLoading ||
    clientesQuery.isLoading ||
    aparelhosQuery.isLoading ||
    vendasQuery.isLoading;
  const isDirectLoading = produtosQuery.isLoading;
  const isError =
    ordensQuery.isError ||
    clientesQuery.isError ||
    aparelhosQuery.isError ||
    vendasQuery.isError;

  const historicoVendas = useMemo(
    () =>
      [...(vendasQuery.data ?? [])]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 10),
    [vendasQuery.data],
  );

  // Dados do recibo para impressão
  const reciboVenda = vendaFinalizada;
  const reciboTerceirizado = terceirizadoFinalizado;

  const buildCupomHtml = () => {
    const venda = vendaFinalizada;
    if (!venda) return "";

    const cols = larguraCupom === "58mm" ? 32 : 42;
    const sep = "-".repeat(cols);
    const now = new Date().toLocaleString("pt-BR");
    const clienteNome = (
      venda.clienteNome ??
      (venda.clienteId ? clienteById.get(venda.clienteId)?.nome : undefined) ??
      "AO CONSUMIDOR"
    ).toUpperCase();
    const atendente = EMPRESA.tecnicoPadrao.toUpperCase();
    const formaPgto = (venda.formaPagamento ?? "dinheiro").toUpperCase();

    const center = (str: string) => {
      const pad = Math.max(0, Math.floor((cols - str.length) / 2));
      return " ".repeat(pad) + str;
    };
    const rAlign = (left: string, right: string) => {
      const spaces = Math.max(1, cols - left.length - right.length);
      return left + " ".repeat(spaces) + right;
    };
    const fBRL = (v: number) =>
      v.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    let itensHtml = "";
    if (venda.itens.length > 0) {
      for (const item of venda.itens) {
        const sku = item.sku ?? "";
        const nome = item.nome.toUpperCase();
        const unitStr = fBRL(item.valorUnitario);
        const totalStr = fBRL(item.valorTotal);
        const qtdLine = rAlign(
          `               ${item.quantidade}   UN  ${unitStr}`,
          totalStr,
        );
        itensHtml += `
<div>${sku}</div>
<div>${nome}${item.imei ? " - " + item.imei : ""}</div>
<div>${qtdLine}</div>`;
      }
    } else {
      const totalStr = fBRL(venda.valorTotal);
      itensHtml = `
<div>SERVICOS</div>
<div>${rAlign("               1   UN  " + fBRL(venda.valorTotal), totalStr)}</div>`;
    }

    const subtotal = fBRL(venda.valorTotal);
    const total = fBRL(venda.valorTotal);
    const recebido = fBRL(venda.valorRecebido);
    const troco =
      venda.troco > 0
        ? `\n<div>${rAlign("TROCO:", fBRL(venda.troco))}</div>`
        : "";

    const pgWidth = larguraCupom === "58mm" ? "58mm" : "80mm";

    const logoUrl = localStorage.getItem("rr-logo-url");
    const logoHtml = logoUrl
      ? `<div class="center" style="margin-bottom:4px"><img src="${logoUrl}" style="max-height:50px;max-width:${larguraCupom === "58mm" ? "120px" : "160px"};object-fit:contain" /></div>`
      : "";

    return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"/>
<title>Cupom Não Fiscal</title>
<style>
  @page { size: ${pgWidth} auto; margin: 2mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${larguraCupom === "58mm" ? "11px" : "12px"};
    line-height: 1.35;
    color: #000;
    background: #fff;
    width: ${pgWidth};
  }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .small { font-size: 10px; }
  .sep { border: none; border-top: 1px dashed #000; margin: 2px 0; }
</style>
</head><body>
${logoHtml}<div class="center">${EMPRESA.cnpj} ${EMPRESA.nome.toUpperCase()}</div>
<div class="center">${EMPRESA.endereco.toUpperCase()} - SALA</div>
<div class="center">${EMPRESA.bairro.toUpperCase()} - ${EMPRESA.cidade.toUpperCase()}/${EMPRESA.uf}</div>
<div class="center">TELEFONE: ${EMPRESA.telefone.replace(/\D/g, "")}</div>
<div class="center">CNPJ: ${EMPRESA.cnpj}</div>
<div class="center">IE:</div>
<div>${sep}</div>
<div>DATA: ${now}</div>
<div class="small">COD: ${venda.id}</div>
<div>${sep}</div>
<div class="center bold">CUPOM NAO FISCAL</div>
<div>${sep}</div>
<div>CPF:</div>
<div>CLIENTE: ${clienteNome}</div>
<div>ATENDENTE/VENDEDOR: ${atendente}</div>
<div>${sep}</div>
<div>DESCRICAO${" ".repeat(Math.max(1, cols - 8 - 3 - 3 - 7 - 8))}QTD  UN  UNIT(RS)  TOTAL</div>
<div>${sep}</div>
${itensHtml}
<div>${sep}</div>
<div>${rAlign("SUBTOTAL: R$", subtotal)}</div>
<div class="bold">${rAlign("TOTAL: R$", total)}</div>
<div>${sep}</div>
<div class="bold">PAGAMENTO</div>
<div>${rAlign(formaPgto + ": R$", recebido)}</div>
${troco}
<div>${sep}</div>
<div class="center">${EMPRESA.mensagemFinal}</div>
<div>${sep}</div>
<div class="center small">${EMPRESA.rodape}</div>
<script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body></html>`;
  };

  const CupomTermicoContent = () => {
    const venda = vendaFinalizada;
    if (!venda) return null;
    const cols = larguraCupom === "58mm" ? 32 : 42;
    const sep = "-".repeat(cols);
    const now = new Date().toLocaleString("pt-BR");
    const clienteNome = (
      venda.clienteNome ??
      (venda.clienteId ? clienteById.get(venda.clienteId)?.nome : undefined) ??
      "AO CONSUMIDOR"
    ).toUpperCase();
    const atendente = EMPRESA.tecnicoPadrao.toUpperCase();
    const formaPgto = (venda.formaPagamento ?? "dinheiro").toUpperCase();
    const fBRL = (v: number) =>
      v.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    const rAlign = (left: string, right: string) => {
      const spaces = Math.max(1, cols - left.length - right.length);
      return left + " ".repeat(spaces) + right;
    };

    return (
      <div
        style={{
          fontFamily: "Courier New, Courier, monospace",
          fontSize: larguraCupom === "58mm" ? 11 : 12,
          lineHeight: 1.35,
          width: larguraCupom === "58mm" ? 220 : 300,
          margin: "0 auto",
          color: "#111",
          whiteSpace: "pre",
        }}
      >
        <div style={{ textAlign: "center" }}>
          {EMPRESA.cnpj} {EMPRESA.nome.toUpperCase()}
        </div>
        <div style={{ textAlign: "center" }}>
          {EMPRESA.endereco.toUpperCase()}
        </div>
        <div style={{ textAlign: "center" }}>
          {EMPRESA.bairro.toUpperCase()} - {EMPRESA.cidade.toUpperCase()}/
          {EMPRESA.uf}
        </div>
        <div style={{ textAlign: "center" }}>
          TELEFONE: {EMPRESA.telefone.replace(/\D/g, "")}
        </div>
        <div style={{ textAlign: "center" }}>CNPJ: {EMPRESA.cnpj}</div>
        <div style={{ textAlign: "center" }}>IE:</div>
        <div>{sep}</div>
        <div>DATA: {now}</div>
        <div style={{ fontSize: 10 }}>COD: {venda.id}</div>
        <div>{sep}</div>
        <div style={{ textAlign: "center", fontWeight: 700 }}>
          CUPOM NAO FISCAL
        </div>
        <div>{sep}</div>
        <div>CPF:</div>
        <div>CLIENTE: {clienteNome}</div>
        <div>ATENDENTE/VENDEDOR: {atendente}</div>
        <div>{sep}</div>
        <div style={{ fontWeight: 700 }}>
          DESCRICAO{" ".repeat(Math.max(1, cols - 38))}QTD UN UNIT(RS) TOTAL
        </div>
        <div>{sep}</div>
        {venda.itens.length > 0 ? (
          venda.itens.map((item) => (
            <div key={`${item.produtoId}-${item.imei ?? item.nome}`}>
              <div>{item.sku ?? ""}</div>
              <div>
                {item.nome.toUpperCase()}
                {item.imei ? " - " + item.imei : ""}
              </div>
              <div>
                {rAlign(
                  `               ${item.quantidade}   UN  ${fBRL(item.valorUnitario)}`,
                  fBRL(item.valorTotal),
                )}
              </div>
            </div>
          ))
        ) : (
          <div>
            <div>SERVICOS</div>
            <div>
              {rAlign(
                `               1   UN  ${fBRL(venda.valorTotal)}`,
                fBRL(venda.valorTotal),
              )}
            </div>
          </div>
        )}
        <div>{sep}</div>
        <div>{rAlign("SUBTOTAL: R$", fBRL(venda.valorTotal))}</div>
        <div style={{ fontWeight: 700 }}>
          {rAlign("TOTAL: R$", fBRL(venda.valorTotal))}
        </div>
        <div>{sep}</div>
        <div style={{ fontWeight: 700 }}>PAGAMENTO</div>
        <div>{rAlign(formaPgto + ": R$", fBRL(venda.valorRecebido))}</div>
        {venda.troco > 0 && <div>{rAlign("TROCO:", fBRL(venda.troco))}</div>}
        <div>{sep}</div>
        <div style={{ textAlign: "center" }}>{EMPRESA.mensagemFinal}</div>
        <div>{sep}</div>
        <div style={{ textAlign: "center", fontSize: 10 }}>
          {EMPRESA.rodape}
        </div>
      </div>
    );
  };

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
          icon={Receipt}
          title="Não foi possível carregar o caixa"
          description="Verifique se o backend esta rodando e tente novamente."
          actions={
            <Button variant="outline" onClick={() => ordensQuery.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      </Card>
    );
  }

  const handleImprimirCupom = () => {
    const html = buildCupomHtml();
    if (!html) return;
    const win = window.open("", "_blank", "width=400,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const handleSalvarReciboPdf = () => {
    const venda = vendaFinalizada;
    if (!venda) return;
    const logoUrl = localStorage.getItem("rr-logo-url");
    const cliente = venda.clienteNome ?? (venda.clienteId ? clienteById.get(venda.clienteId)?.nome : undefined) ?? "Consumidor";
    const fBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const now = new Date().toLocaleString("pt-BR");
    const logoHtml = logoUrl ? `<img src="${logoUrl}" style="max-height:60px;max-width:160px;object-fit:contain;display:block;margin-bottom:8px"/>` : "";
    const itensHtml = venda.itens.length > 0
      ? venda.itens.map((i) => `<tr><td>${i.nome}${i.imei ? ` — ${i.imei}` : ""}</td><td style="text-align:center">${i.quantidade}</td><td style="text-align:right">${fBRL(i.valorUnitario)}</td><td style="text-align:right">${fBRL(i.valorTotal)}</td></tr>`).join("")
      : `<tr><td colspan="4">Serviço técnico</td></tr>`;
    const win = window.open("", "_blank", "width=800,height=1000");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"/><title>Recibo — ${EMPRESA.nome}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; }
  h1 { font-size: 20px; margin-bottom: 2px; }
  h2 { font-size: 13px; color: #0284c7; margin-bottom: 12px; }
  .header { border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
  .empresa p { margin: 2px 0; font-size: 11px; color: #374151; }
  .info { margin-bottom: 12px; font-size: 11px; }
  .info span { display: inline-block; margin-right: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #f3f4f6; padding: 6px 8px; text-align: left; font-size: 11px; border: 1px solid #d1d5db; }
  td { padding: 6px 8px; border: 1px solid #d1d5db; font-size: 11px; }
  .totais { text-align: right; margin-bottom: 16px; }
  .totais p { margin: 3px 0; }
  .totais strong { font-size: 14px; }
  .rodape { border-top: 1px solid #d1d5db; padding-top: 10px; text-align: center; font-size: 10px; color: #6b7280; }
</style>
</head><body>
<div class="header">
  <div class="empresa">
    ${logoHtml}
    <h1>${EMPRESA.nome}</h1>
    <p>CNPJ: ${EMPRESA.cnpj}</p>
    <p>${EMPRESA.enderecoCompleto}</p>
    <p>Tel: ${EMPRESA.telefone}</p>
  </div>
  <div style="text-align:right">
    <h2>RECIBO NÃO FISCAL</h2>
    <p style="font-size:11px;color:#374151">${now}</p>
    ${venda.numeroOs ? `<p style="font-size:11px;color:#374151">OS-${venda.numeroOs}</p>` : ""}
  </div>
</div>
<div class="info">
  <span><strong>Cliente:</strong> ${cliente}</span>
  <span><strong>Pagamento:</strong> ${(venda.formaPagamento ?? "").toUpperCase()}</span>
</div>
<table>
  <thead><tr><th>Descrição</th><th style="text-align:center">Qtd</th><th style="text-align:right">Unitário</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${itensHtml}</tbody>
</table>
<div class="totais">
  <p>Total: <strong>${fBRL(venda.valorTotal)}</strong></p>
  <p>Recebido: ${fBRL(venda.valorRecebido)}</p>
  ${venda.troco > 0 ? `<p>Troco: ${fBRL(venda.troco)}</p>` : ""}
</div>
<div class="rodape"><p>${EMPRESA.mensagemFinal ?? ""}</p></div>
<script>window.onload = () => { window.print(); }<\/script>
</body></html>`);
    win.document.close();
  };

  return (
    <>
      {/* Dialog: cupom térmico */}
      {vendaFinalizada && (
        <PrintPreviewDialog
          open={cupomOpen}
          onOpenChange={setCupomOpen}
          title="Cupom Não Fiscal Térmico"
          onPrint={handleImprimirCupom}
          actions={
            <Button variant="outline" size="sm" onClick={handleSalvarReciboPdf}>
              <FileDown className="h-4 w-4" /> Salvar PDF
            </Button>
          }
        >
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Largura do cupom:</span>
              {(["58mm", "80mm"] as const).map((w) => (
                <label
                  key={w}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1 text-xs transition-colors ${larguraCupom === w ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                >
                  <input
                    type="radio"
                    name="largura-cupom"
                    value={w}
                    checked={larguraCupom === w}
                    onChange={() => {
                      setLarguraCupom(w);
                      localStorage.setItem("rr-cupom-largura", w);
                    }}
                    className="sr-only"
                  />
                  {w}
                </label>
              ))}
            </div>
          </div>
          <CupomTermicoContent />
        </PrintPreviewDialog>
      )}
      <div className="space-y-5">
        {/* ── Área de impressão de recibo (oculta na tela, visível ao imprimir) ── */}
        <section className="recibo-print-area">
          <header className="print-header">
            <div>
              <p className="print-kicker">RR Infocell</p>
              <h1>
                {reciboTerceirizado
                  ? "Comprovante de Lançamento"
                  : "Recibo de Venda"}
              </h1>
              <p>Emitido em {new Date().toLocaleString("pt-BR")}</p>
            </div>
            <div className="print-meta">
              <strong>
                {reciboTerceirizado
                  ? "Terceirizado"
                  : reciboVenda?.numeroOs
                    ? `OS-${reciboVenda.numeroOs}`
                    : "Venda direta"}
              </strong>
              <span>
                Pagamento:{" "}
                {(reciboTerceirizado
                  ? "Terceirizado"
                  : (reciboVenda?.formaPagamento ?? "—")
                ).toUpperCase()}
              </span>
            </div>
          </header>

          {/* ── Recibo de venda regular ── */}
          {reciboVenda && (
            <>
              <div className="print-grid print-summary">
                <div>
                  <span>Cliente</span>
                  <strong>
                    {reciboVenda.clienteNome ??
                      (reciboVenda.clienteId
                        ? clienteById.get(reciboVenda.clienteId)?.nome
                        : undefined) ??
                      "Balcão"}
                  </strong>
                </div>
                {reciboVenda.numeroOs ? (
                  <div>
                    <span>Ordem de Serviço</span>
                    <strong>OS-{reciboVenda.numeroOs}</strong>
                  </div>
                ) : (
                  <div>
                    <span>Tipo</span>
                    <strong>Venda direta</strong>
                  </div>
                )}
                <div>
                  <span>Pagamento</span>
                  <strong style={{ textTransform: "uppercase" }}>
                    {reciboVenda.formaPagamento}
                  </strong>
                  <p>Recebido: {formatBRL(reciboVenda.valorRecebido)}</p>
                  {reciboVenda.troco > 0 && (
                    <p>Troco: {formatBRL(reciboVenda.troco)}</p>
                  )}
                </div>
              </div>

              {reciboVenda.itens.length > 0 ? (
                <>
                  <h2>Itens vendidos</h2>
                  <table className="print-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>Item</th>
                        <th style={{ textAlign: "center" }}>Qtd.</th>
                        <th style={{ textAlign: "right" }}>Unitário</th>
                        <th style={{ textAlign: "right" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reciboVenda.itens.map((item) => (
                        <tr key={`${item.produtoId}-${item.imei ?? item.nome}`}>
                          <td>
                            {item.nome}
                            {item.imei ? ` — IMEI ${item.imei}` : ""}
                            {item.garantiaDias
                              ? ` (Garantia: ${item.garantiaDias} dias)`
                              : ""}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {item.quantidade}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {formatBRL(item.valorUnitario)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {formatBRL(item.valorTotal)}
                          </td>
                        </tr>
                      ))}
                      <tr
                        style={{
                          borderTop: "2px solid #111827",
                          fontWeight: 700,
                        }}
                      >
                        <td
                          colSpan={3}
                          style={{ textAlign: "right", paddingTop: 6 }}
                        >
                          Total
                        </td>
                        <td style={{ textAlign: "right", paddingTop: 6 }}>
                          {formatBRL(reciboVenda.valorTotal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              ) : (
                <>
                  <h2>Resumo financeiro</h2>
                  <table className="print-table">
                    <tbody>
                      {reciboVenda.valorTotal > 0 && (
                        <tr>
                          <th>Total</th>
                          <td style={{ textAlign: "right" }}>
                            {formatBRL(reciboVenda.valorTotal)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}

          {/* ── Comprovante de lançamento terceirizado ── */}
          {reciboTerceirizado && (
            <>
              <div className="print-grid print-summary">
                <div>
                  <span>Cliente</span>
                  <strong>{reciboTerceirizado.clienteNome ?? "Balcão"}</strong>
                </div>
                <div>
                  <span>Responsável / Terceiro</span>
                  <strong>{reciboTerceirizado.responsavel ?? "—"}</strong>
                  {reciboTerceirizado.descricao && (
                    <p>{reciboTerceirizado.descricao}</p>
                  )}
                </div>
                <div>
                  <span>Status do repasse</span>
                  <strong>
                    {reciboTerceirizado.statusRepasse === "pago"
                      ? "PAGO"
                      : "PENDENTE"}
                  </strong>
                </div>
              </div>

              <h2>Valores</h2>
              <table className="print-table">
                <tbody>
                  <tr>
                    <th>Valor cobrado do cliente</th>
                    <td style={{ textAlign: "right" }}>
                      {formatBRL(reciboTerceirizado.valorCobrado)}
                    </td>
                  </tr>
                  <tr>
                    <th>Repasse / custo</th>
                    <td style={{ textAlign: "right" }}>
                      {formatBRL(reciboTerceirizado.valorRepasse)}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: 700 }}>
                    <th>Lucro líquido</th>
                    <td style={{ textAlign: "right" }}>
                      {formatBRL(reciboTerceirizado.lucro)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {reciboTerceirizado.observacoes && (
                <p style={{ marginTop: 8, fontSize: 10, color: "#374151" }}>
                  <strong>Observações:</strong> {reciboTerceirizado.observacoes}
                </p>
              )}
            </>
          )}

          <div className="print-signatures">
            <div>
              <span>Cliente</span>
            </div>
            <div>
              <span>RR Infocell</span>
            </div>
          </div>
        </section>

        {/* ── Conteúdo principal ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <PageHeader
              eyebrow="PDV / Caixa"
              title={modoVenda === "os" ? "Fechamento de OS" : "Venda direta"}
              description="Registre pagamento de OS, celular, acessórios ou serviços avulsos."
            />

            <Card className="surface-panel flex gap-2 p-3">
              <Button
                type="button"
                variant={modoVenda === "os" ? "default" : "outline"}
                onClick={() => {
                  setModoVenda("os");
                  setVendaFinalizada(null);
                  setTerceirizadoFinalizado(null);
                  setCarrinho([]);
                  setBuscaProduto("");
                  setClienteVendaDireta("");
                  setDesconto("");
                  setValorRecebido("");
                }}
              >
                Fechar OS
              </Button>
              <Button
                type="button"
                variant={modoVenda === "direta" ? "default" : "outline"}
                onClick={() => {
                  setModoVenda("direta");
                  setVendaFinalizada(null);
                  setOrdemFinalizada(null);
                  setTerceirizadoFinalizado(null);
                  setSelectedOrdemId("");
                  setDesconto("");
                  setValorRecebido("");
                  setSearchParams({});
                }}
              >
                Venda direta
              </Button>
            </Card>

            {modoVenda === "direta" ? (
              <Card className="surface-panel p-6 space-y-4">
                <FormField id="pdv-cliente-direto" label="Cliente">
                  <Input
                    id="pdv-cliente-direto"
                    value={clienteVendaDireta}
                    onChange={(e) => setClienteVendaDireta(e.target.value)}
                    placeholder="Nome do cliente ou venda balcão"
                  />
                </FormField>

                {/* ── Busca de produto ── */}
                <FormField id="pdv-busca-produto" label="Buscar produto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      id="pdv-busca-produto"
                      className="pl-9"
                      value={buscaProduto}
                      onChange={(e) => {
                        setBuscaProduto(e.target.value);
                        setBuscaAberta(true);
                      }}
                      onFocus={() => setBuscaAberta(true)}
                      onBlur={() =>
                        setTimeout(() => setBuscaAberta(false), 180)
                      }
                      placeholder={
                        isDirectLoading
                          ? "Carregando produtos..."
                          : "Nome, SKU, marca ou fornecedor..."
                      }
                      disabled={isDirectLoading}
                      autoComplete="off"
                    />
                    {buscaAberta && produtosBusca.length > 0 && (
                      <div className="absolute z-20 w-full top-full mt-1 rounded-md border border-border bg-card shadow-lg overflow-hidden">
                        {produtosBusca.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-4 py-2.5 hover:bg-secondary/60 text-sm border-b border-border/40 last:border-0 flex items-center justify-between gap-3"
                            onMouseDown={() => {
                              adicionarProdutoById(p.id);
                              setBuscaProduto("");
                              setBuscaAberta(false);
                              searchInputRef.current?.focus();
                            }}
                          >
                            <div>
                              <span className="font-medium">{p.nome}</span>
                              <span className="ml-2 font-mono text-xs text-muted-foreground">
                                {p.sku}
                              </span>
                              {p.marca && (
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  · {p.marca}
                                </span>
                              )}
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                · Estoque: {p.estoqueAtual}
                              </span>
                            </div>
                            <span className="font-mono text-xs font-semibold text-primary shrink-0">
                              {formatBRL(p.precoVenda)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {buscaAberta &&
                      buscaProduto.trim().length > 0 &&
                      produtosBusca.length === 0 && (
                        <div className="absolute z-20 w-full top-full mt-1 rounded-md border border-border bg-card shadow-lg px-4 py-3 text-sm text-muted-foreground">
                          Nenhum produto encontrado.
                        </div>
                      )}
                  </div>
                </FormField>

                {/* ── Carrinho ── */}
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3 text-left font-medium">
                          Item
                        </th>
                        <th className="px-4 py-3 text-center font-medium">
                          Quantidade
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Unitário
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Total
                        </th>
                        <th className="px-4 py-2 text-right font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {carrinho.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-muted-foreground"
                          >
                            Busque um produto acima para adicioná-lo ao
                            carrinho.
                          </td>
                        </tr>
                      ) : (
                        carrinho.map((item) => {
                          const limite =
                            item.categoria === "servico"
                              ? 999
                              : item.estoqueAtual;
                          return (
                            <tr
                              key={item.id}
                              className="border-b border-border/40 last:border-0"
                            >
                              <td className="px-4 py-3">
                                <div className="font-medium">{item.nome}</div>
                                <div className="font-mono text-xs text-muted-foreground">
                                  {item.sku}
                                  {item.imei ? ` · IMEI ${item.imei}` : ""}
                                  {item.garantiaDias
                                    ? ` · garantia ${item.garantiaDias}d`
                                    : ""}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    type="button"
                                    className="h-7 w-7 shrink-0"
                                    onClick={() =>
                                      alterarQuantidade(item.id, -1)
                                    }
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="min-w-[2rem] text-center font-mono text-sm font-semibold">
                                    {item.quantidadeVenda}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    type="button"
                                    className="h-7 w-7 shrink-0"
                                    disabled={item.quantidadeVenda >= limite}
                                    onClick={() =>
                                      alterarQuantidade(item.id, 1)
                                    }
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                                {formatBRL(item.precoVenda)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-semibold">
                                {formatBRL(
                                  item.precoVenda * item.quantidadeVenda,
                                )}
                              </td>
                              <td className="px-4 py-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  type="button"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => removerItem(item)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm uppercase tracking-wide text-muted-foreground">
                      Subtotal
                    </span>
                    <strong className="font-mono text-lg">
                      {formatBRL(totalDireto)}
                    </strong>
                  </div>
                  {descontoNum > 0 && (
                    <div className="flex items-center justify-between text-amber-600">
                      <span className="font-display text-sm uppercase tracking-wide">
                        Desconto
                      </span>
                      <strong className="font-mono text-lg">
                        - {formatBRL(descontoNum)}
                      </strong>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm uppercase tracking-wide text-muted-foreground">
                      Total da venda
                    </span>
                    <strong className="font-display text-4xl text-primary">
                      {formatBRL(totalDiretoComDesconto)}
                    </strong>
                  </div>
                </div>
              </Card>
            ) : ordens.length === 0 && !ordemFinalizada ? (
              <Card className="surface-panel">
                <EmptyState
                  icon={Receipt}
                  title="Nenhuma OS pronta para caixa"
                  description="Finalize a manutenção de uma OS para liberar o fechamento no PDV."
                  actions={
                    <Button asChild>
                      <Link to="/app/manutencao">Ir para manutenção</Link>
                    </Button>
                  }
                />
              </Card>
            ) : (
              <Card className="surface-panel flex flex-wrap items-end gap-3 p-4">
                <FormField
                  id="pdv-os"
                  label="Ordem de serviço"
                  className="flex-1"
                >
                  <Select
                    value={selectedOrdemId}
                    onValueChange={handleSelectOrdem}
                  >
                    <SelectTrigger id="pdv-os">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ordemFinalizada &&
                        !ordens.some((o) => o.id === ordemFinalizada.id) && (
                          <SelectItem value={ordemFinalizada.id}>
                            OS-{ordemFinalizada.numero} - venda finalizada
                          </SelectItem>
                        )}
                      {ordens.map((ordem) => {
                        const rowCliente = clienteById.get(ordem.clienteId);
                        const rowAparelho = aparelhoById.get(ordem.aparelhoId);
                        return (
                          <SelectItem key={ordem.id} value={ordem.id}>
                            OS-{ordem.numero} -{" "}
                            {rowCliente?.nome ?? ordem.clienteId} -{" "}
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
            )}

            {modoVenda === "os" && selectedOrdem && (
              <Card className="surface-panel p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-primary">
                      // Fechamento OS-{selectedOrdem.numero}
                    </p>
                    <h2 className="font-display text-2xl font-bold">
                      {cliente?.nome ?? selectedOrdem.clienteId}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {cliente?.telefone ?? "-"} -{" "}
                      {aparelho
                        ? `${aparelho.marca} ${aparelho.modelo}`
                        : selectedOrdem.aparelhoId}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {vendaFinalizada
                      ? "Venda finalizada"
                      : "OS pronta para entrega"}
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {(selectedOrdem.pecasUsadas ?? []).map((peca) => (
                    <div
                      key={peca.produtoId}
                      className="flex items-center justify-between rounded-md border border-border bg-card/50 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{peca.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Peça - {peca.quantidade}x
                        </p>
                      </div>
                      <p className="font-mono font-semibold">
                        {formatBRL(peca.valorTotal)}
                      </p>
                    </div>
                  ))}
                  {selectedOrdem.valorMaoObra > 0 ? (
                    <div className="flex items-center justify-between rounded-md border border-border bg-card/50 px-4 py-3">
                      <div>
                        <p className="font-medium">Mão de obra</p>
                        <p className="text-xs text-muted-foreground">
                          Serviço técnico
                        </p>
                      </div>
                      <p className="font-mono font-semibold">
                        {formatBRL(selectedOrdem.valorMaoObra)}
                      </p>
                    </div>
                  ) : selectedOrdem.maoObraInclusaNaPeca ? (
                    <div className="rounded-md border border-border bg-card/50 px-4 py-3">
                      <p className="font-medium">Mão de obra inclusa na peça</p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                  <p className="font-display text-sm uppercase tracking-wide text-muted-foreground">
                    Total a pagar
                  </p>
                  <p className="font-display text-4xl font-bold text-primary glow-text">
                    {formatBRL(selectedOrdem.valorTotal)}
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* ── Painel de pagamento / sucesso ─────────────────────────────────── */}
          {vendaFinalizada ? (
            <Card className="surface-panel p-6">
              <div className="mb-4 flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="font-display text-base font-semibold">
                  Pagamento finalizado
                </h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Origem</span>
                  <strong>
                    {vendaFinalizada.numeroOs
                      ? `OS-${vendaFinalizada.numeroOs}`
                      : "Venda direta"}
                  </strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Forma</span>
                  <strong className="uppercase">
                    {vendaFinalizada.formaPagamento}
                  </strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Total</span>
                  <strong>{formatBRL(vendaFinalizada.valorTotal)}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Recebido</span>
                  <strong>{formatBRL(vendaFinalizada.valorRecebido)}</strong>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-3">
                  <span className="text-muted-foreground">Troco</span>
                  <strong className="text-success">
                    {formatBRL(vendaFinalizada.troco)}
                  </strong>
                </div>
              </div>
              {vendaFinalizada.itens.length > 0 && (
                <div className="mt-4 rounded-md border border-border bg-secondary/30 p-3 text-xs">
                  <p className="mb-2 font-medium">Itens e garantia</p>
                  <div className="space-y-2">
                    {vendaFinalizada.itens.map((item) => (
                      <div
                        key={`${item.produtoId}-${item.imei ?? item.nome}`}
                        className="flex justify-between gap-3"
                      >
                        <span>
                          {item.nome}
                          {item.imei ? ` - IMEI ${item.imei}` : ""}
                        </span>
                        <strong>
                          {item.garantiaDias
                            ? `Garantia até ${new Date(item.garantiaAte ?? "").toLocaleDateString("pt-BR")}`
                            : "Sem garantia"}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-5 space-y-2">
                <Button
                  className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
                  type="button"
                  onClick={() => setCupomOpen(true)}
                >
                  <Printer className="h-4 w-4" /> Imprimir cupom térmico
                </Button>
                {(vendaFinalizada.ordemServicoId || ordemFinalizada?.id) && (
                  <Button
                    className="w-full"
                    variant="outline"
                    type="button"
                    asChild
                  >
                    <Link
                      to={`/app/ordens/${vendaFinalizada.ordemServicoId ?? ordemFinalizada?.id}?termoGarantia=1`}
                    >
                      <ShieldCheck className="h-4 w-4" /> Imprimir termo de
                      garantia
                    </Link>
                  </Button>
                )}
                <Button
                  className="w-full"
                  variant="outline"
                  type="button"
                  onClick={handleImprimirRecibo}
                >
                  <Printer className="h-4 w-4" /> Imprimir comprovante
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  type="button"
                  onClick={handleNovaVenda}
                >
                  {modoVenda === "direta"
                    ? "Nova venda direta"
                    : "Fechar outra OS"}
                </Button>
              </div>
            </Card>
          ) : terceirizadoFinalizado ? (
            <Card className="surface-panel p-6">
              <div className="mb-4 flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="font-display text-base font-semibold">
                  Lançamento registrado
                </h3>
              </div>
              <div className="space-y-3 text-sm">
                {terceirizadoFinalizado.responsavel && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Responsável</span>
                    <strong>{terceirizadoFinalizado.responsavel}</strong>
                  </div>
                )}
                {terceirizadoFinalizado.descricao && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Serviço/Peça</span>
                    <strong>{terceirizadoFinalizado.descricao}</strong>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Cobrado</span>
                  <strong>
                    {formatBRL(terceirizadoFinalizado.valorCobrado)}
                  </strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Repasse</span>
                  <strong>
                    {formatBRL(terceirizadoFinalizado.valorRepasse)}
                  </strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Status repasse</span>
                  <strong
                    className={
                      terceirizadoFinalizado.statusRepasse === "pago"
                        ? "text-success"
                        : "text-amber-500"
                    }
                  >
                    {terceirizadoFinalizado.statusRepasse === "pago"
                      ? "✓ Pago"
                      : "⏳ Pendente"}
                  </strong>
                </div>
                <div
                  className={cn(
                    "flex justify-between gap-4 border-t border-border pt-3",
                  )}
                >
                  <span className="text-muted-foreground">Lucro líquido</span>
                  <strong
                    className={
                      terceirizadoFinalizado.lucro >= 0
                        ? "text-success"
                        : "text-destructive"
                    }
                  >
                    {formatBRL(terceirizadoFinalizado.lucro)}
                  </strong>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <Button
                  className="w-full"
                  type="button"
                  onClick={handleImprimirRecibo}
                >
                  <Printer className="h-4 w-4" /> Imprimir comprovante
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  type="button"
                  onClick={handleNovaVenda}
                >
                  Novo lançamento
                </Button>
              </div>
            </Card>
          ) : modoVenda === "direta" ? (
            <Card className="surface-panel p-6">
              <h3 className="mb-1 font-display text-base font-semibold">
                Pagamento
              </h3>
              <p className="mb-4 text-xs text-muted-foreground">
                Finalize a venda direta do carrinho.
              </p>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:col-span-4">
                {paymentOptions.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    className={
                      "flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-xs font-medium transition-all " +
                      (formaPagamento === key
                        ? "border-primary bg-primary/10 text-primary shadow-glow"
                        : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground")
                    }
                    type="button"
                    onClick={() => setFormaPagamento(key)}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Campos extras para Terceirizado ── */}
              {formaPagamento === "terceirizado" && (
                <div className="mt-4 rounded-md border border-border bg-secondary/20 p-3 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Dados do terceirizado
                  </p>
                  <FormField
                    id="pdv-terc-responsavel"
                    label="Nome / responsável"
                  >
                    <Input
                      value={terceirizadoInfo.responsavel}
                      onChange={(e) =>
                        setTerceirizadoInfo((p) => ({
                          ...p,
                          responsavel: e.target.value,
                        }))
                      }
                      placeholder="Ex.: João Silva"
                    />
                  </FormField>
                  <FormField id="pdv-terc-descricao" label="Serviço ou peça">
                    <Input
                      value={terceirizadoInfo.descricao}
                      onChange={(e) =>
                        setTerceirizadoInfo((p) => ({
                          ...p,
                          descricao: e.target.value,
                        }))
                      }
                      placeholder="Ex.: Troca de tela Samsung A32"
                    />
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      id="pdv-terc-cobrado"
                      label="Valor cobrado (R$)"
                      error={tercErrors.valorCobrado}
                    >
                      <MoneyInput
                        id="pdv-terc-cobrado"
                        value={valorRecebido}
                        onChange={(v) => {
                          setValorRecebido(v);
                          setTercErrors((e) => {
                            const n = { ...e };
                            delete n.valorCobrado;
                            return n;
                          });
                        }}
                        className={
                          tercErrors.valorCobrado ? "border-destructive" : ""
                        }
                      />
                    </FormField>
                    <FormField
                      id="pdv-terc-repasse"
                      label="Repasse / custo (R$)"
                    >
                      <MoneyInput
                        id="pdv-terc-repasse"
                        value={terceirizadoInfo.valorRepasse}
                        onChange={(v) =>
                          setTerceirizadoInfo((p) => ({
                            ...p,
                            valorRepasse: v,
                          }))
                        }
                      />
                    </FormField>
                  </div>
                  {lucroTerceirizado !== null && (
                    <div
                      className={cn(
                        "flex items-center justify-between rounded-md border px-3 py-2",
                        lucroTerceirizado >= 0
                          ? "border-success/30 bg-success/10"
                          : "border-destructive/30 bg-destructive/10",
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs uppercase tracking-wide font-medium",
                          lucroTerceirizado >= 0
                            ? "text-success"
                            : "text-destructive",
                        )}
                      >
                        Lucro líquido
                      </span>
                      <span
                        className={cn(
                          "font-mono text-lg font-semibold",
                          lucroTerceirizado >= 0
                            ? "text-success"
                            : "text-destructive",
                        )}
                      >
                        {formatBRL(lucroTerceirizado)}
                      </span>
                    </div>
                  )}
                  <FormField id="pdv-terc-status" label="Status do repasse">
                    <div className="flex gap-2">
                      {(["pendente", "pago"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={cn(
                            "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-all",
                            terceirizadoInfo.statusRepasse === s
                              ? s === "pendente"
                                ? "border-amber-500/60 bg-amber-500/10 text-amber-500"
                                : "border-success/60 bg-success/10 text-success"
                              : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                          )}
                          onClick={() =>
                            setTerceirizadoInfo((p) => ({
                              ...p,
                              statusRepasse: s,
                            }))
                          }
                        >
                          {s === "pendente" ? "⏳ Pendente" : "✓ Pago"}
                        </button>
                      ))}
                    </div>
                  </FormField>
                  <FormField id="pdv-terc-obs" label="Observações">
                    <Textarea
                      value={terceirizadoInfo.observacoes}
                      onChange={(e) =>
                        setTerceirizadoInfo((p) => ({
                          ...p,
                          observacoes: e.target.value,
                        }))
                      }
                      rows={2}
                      placeholder="Notas opcionais..."
                    />
                  </FormField>
                </div>
              )}

              {formaPagamento !== "terceirizado" && (
                <div className="mt-5 space-y-3">
                  <FormField
                    id="pdv-direto-desconto"
                    label="Desconto (opcional)"
                  >
                    <MoneyInput
                      id="pdv-direto-desconto"
                      value={desconto}
                      onChange={setDesconto}
                    />
                  </FormField>
                  {descontoNum > 0 && (
                    <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                      <span className="text-xs uppercase tracking-wide text-amber-600">
                        Total com desconto
                      </span>
                      <span className="font-mono text-lg font-semibold text-amber-600">
                        {formatBRL(totalDiretoComDesconto)}
                      </span>
                    </div>
                  )}
                  <FormField id="pdv-direto-recebido" label="Valor recebido">
                    <MoneyInput
                      id="pdv-direto-recebido"
                      value={valorRecebido}
                      onChange={setValorRecebido}
                      className="text-lg"
                    />
                  </FormField>
                  <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Troco
                    </span>
                    <span className="font-mono text-lg font-semibold text-success">
                      {formatBRL(
                        Math.max(
                          0,
                          (Number(valorRecebido.replace(",", ".")) || 0) -
                            totalDiretoComDesconto,
                        ),
                      )}
                    </span>
                  </div>
                </div>
              )}

              {formError && (
                <p className="mt-3 text-sm text-destructive">{formError}</p>
              )}

              <Button
                className="mt-4 w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                disabled={
                  formaPagamento === "terceirizado"
                    ? finalizarTerceirizadoMutation.isPending
                    : vendaDiretaMutation.isPending || carrinho.length === 0
                }
                onClick={() => {
                  if (formaPagamento === "terceirizado") {
                    const errs: Record<string, string> = {};
                    const cobrado =
                      parseFloat(valorRecebido.replace(",", ".")) || 0;
                    if (cobrado <= 0)
                      errs.valorCobrado = "Informe o valor cobrado do cliente.";
                    if (Object.keys(errs).length > 0) {
                      setTercErrors(errs);
                      return;
                    }
                    setTercErrors({});
                    finalizarTerceirizadoMutation.mutate();
                  } else {
                    vendaDiretaMutation.mutate();
                  }
                }}
              >
                {vendaDiretaMutation.isPending ||
                finalizarTerceirizadoMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Receipt className="h-4 w-4" />
                )}
                {formaPagamento === "terceirizado"
                  ? "Registrar lançamento"
                  : "Finalizar venda direta"}
              </Button>
            </Card>
          ) : selectedOrdemPronta ? (
            <Card className="surface-panel p-6">
              <h3 className="mb-1 font-display text-base font-semibold">
                Pagamento
              </h3>
              <p className="mb-4 text-xs text-muted-foreground">
                Selecione a forma e finalize a entrega.
              </p>

              <div className="grid grid-cols-4 gap-2">
                {paymentOptions.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    className={
                      "flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-xs font-medium transition-all " +
                      (formaPagamento === key
                        ? "border-primary bg-primary/10 text-primary shadow-glow"
                        : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground")
                    }
                    type="button"
                    onClick={() => setFormaPagamento(key)}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Dados terceirizado (OS) ── */}
              {formaPagamento === "terceirizado" && (
                <div className="mt-4 rounded-md border border-border bg-secondary/20 p-3 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Dados do terceirizado
                  </p>
                  <FormField
                    id="os-terc-responsavel"
                    label="Nome / responsável"
                    error={tercErrors.responsavel}
                  >
                    <Input
                      value={terceirizadoInfo.responsavel}
                      onChange={(e) => {
                        setTerceirizadoInfo((p) => ({
                          ...p,
                          responsavel: e.target.value,
                        }));
                        setTercErrors((e2) => {
                          const n = { ...e2 };
                          delete n.responsavel;
                          return n;
                        });
                      }}
                      placeholder="Ex.: João Silva"
                      className={
                        tercErrors.responsavel ? "border-destructive" : ""
                      }
                    />
                  </FormField>
                  <FormField id="os-terc-descricao" label="Serviço / peça">
                    <Input
                      value={terceirizadoInfo.descricao}
                      onChange={(e) =>
                        setTerceirizadoInfo((p) => ({
                          ...p,
                          descricao: e.target.value,
                        }))
                      }
                      placeholder="Ex.: Troca de tela"
                    />
                  </FormField>
                  <FormField id="os-terc-repasse" label="Repasse / custo (R$)">
                    <MoneyInput
                      id="os-terc-repasse"
                      value={terceirizadoInfo.valorRepasse}
                      onChange={(v) =>
                        setTerceirizadoInfo((p) => ({ ...p, valorRepasse: v }))
                      }
                    />
                  </FormField>
                  <FormField id="os-terc-status" label="Status do repasse">
                    <div className="flex gap-2">
                      {(["pendente", "pago"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={cn(
                            "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-all",
                            terceirizadoInfo.statusRepasse === s
                              ? s === "pendente"
                                ? "border-amber-500/60 bg-amber-500/10 text-amber-500"
                                : "border-success/60 bg-success/10 text-success"
                              : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
                          )}
                          onClick={() =>
                            setTerceirizadoInfo((p) => ({
                              ...p,
                              statusRepasse: s,
                            }))
                          }
                        >
                          {s === "pendente" ? "⏳ Pendente" : "✓ Pago"}
                        </button>
                      ))}
                    </div>
                  </FormField>
                </div>
              )}

              <div className="mt-5 space-y-3">
                {adiantado > 0 && (
                  <div className="flex flex-col gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wide text-blue-600">
                        Adiantado ({(selectedOrdem?.formaPagamentoAdiantamento ?? "").toUpperCase() || "—"})
                      </span>
                      <span className="font-mono text-sm font-semibold text-blue-600">
                        {formatBRL(adiantado)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wide text-blue-600">
                        Saldo devedor
                      </span>
                      <span className="font-mono text-lg font-bold text-blue-600">
                        {formatBRL(saldo)}
                      </span>
                    </div>
                  </div>
                )}
                <FormField id="pdv-desconto" label="Desconto (opcional)">
                  <MoneyInput
                    id="pdv-desconto"
                    value={desconto}
                    onChange={setDesconto}
                  />
                </FormField>
                {(descontoNum > 0 || formaPagamento === "terceirizado") && (
                  <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <span className="text-xs uppercase tracking-wide text-amber-600">
                      {formaPagamento === "terceirizado"
                        ? "Valor cobrado (cliente)"
                        : "Total com desconto"}
                    </span>
                    <span className="font-mono text-lg font-semibold text-amber-600">
                      {formatBRL(totalComDesconto)}
                    </span>
                  </div>
                )}
                {formaPagamento !== "terceirizado" && (
                  <>
                    <FormField id="pdv-recebido" label="Valor recebido">
                      <MoneyInput
                        id="pdv-recebido"
                        value={valorRecebido}
                        onChange={setValorRecebido}
                        className="text-lg"
                      />
                    </FormField>
                    <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Troco
                      </span>
                      <span className="font-mono text-lg font-semibold text-success">
                        {formatBRL(troco)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between rounded-md border border-success/30 bg-success/10 px-3 py-2">
                  <span className="text-xs uppercase tracking-wide text-success">
                    Status
                  </span>
                  <span className="text-xs font-semibold uppercase text-success">
                    Pronto para finalizar
                  </span>
                </div>
                {formError && (
                  <p className="text-sm text-destructive">{formError}</p>
                )}
                <Button
                  className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                  disabled={finalizarMutation.isPending}
                  onClick={() => finalizarMutation.mutate()}
                >
                  {finalizarMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Receipt className="h-4 w-4" />
                  )}
                  {formaPagamento === "terceirizado"
                    ? "Registrar e fechar OS"
                    : "Finalizar venda"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  onClick={handleImprimirRecibo}
                >
                  <Printer className="h-4 w-4" /> Imprimir comprovante
                </Button>
              </div>
            </Card>
          ) : null}
        </div>

        {/* ── Histórico ──────────────────────────────────────────────────────── */}
        <Card className="surface-panel p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-semibold">
                Histórico de pagamentos
              </h3>
              <p className="text-xs text-muted-foreground">
                Últimas OS fechadas no caixa.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/financeiro">Ver relatório</Link>
            </Button>
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">OS</th>
                  <th className="px-4 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Forma</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Recebido</th>
                  <th className="px-4 py-3 text-right font-medium">Troco</th>
                </tr>
              </thead>
              <tbody>
                {historicoVendas.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-8 text-center text-muted-foreground"
                      colSpan={7}
                    >
                      Nenhum pagamento finalizado ainda.
                    </td>
                  </tr>
                ) : (
                  historicoVendas.map((venda) => {
                    const rowCliente = venda.clienteId
                      ? clienteById.get(venda.clienteId)
                      : undefined;
                    return (
                      <tr key={venda.id} className="border-b border-border/40">
                        <td className="px-4 py-3 font-medium">
                          {venda.ordemServicoId ? (
                            <Link
                              className="text-primary hover:underline"
                              to={`/app/ordens/${venda.ordemServicoId}`}
                            >
                              OS-{venda.numeroOs}
                            </Link>
                          ) : (
                            "Venda direta"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {rowCliente?.nome ??
                            venda.clienteNome ??
                            venda.clienteId ??
                            "Balcão"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {new Date(venda.createdAt).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 uppercase">
                          {venda.formaPagamento}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatBRL(venda.valorTotal)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatBRL(venda.valorRecebido)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatBRL(venda.troco)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
};

export default PDV;
