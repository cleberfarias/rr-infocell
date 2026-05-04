import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  PackagePlus,
  Printer,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import {
  EmptyState,
  FormField,
  PageHeader,
  SectionPanel,
} from "@/components/design-system";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/data/mock";
import { getAparelho } from "@/services/aparelhos";
import { getCliente } from "@/services/clientes";
import {
  getOrdemServico,
  updateOrdemServico,
  type OrdemServicoPecaInput,
} from "@/services/ordens-servico";
import { listProdutos } from "@/services/produtos";

const formatDate = (value?: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("pt-BR");
};

const OrdemDetalhe = () => {
  const { ordemId } = useParams();
  const queryClient = useQueryClient();
  const [pecaProdutoId, setPecaProdutoId] = useState("");
  const [pecaQuantidade, setPecaQuantidade] = useState("1");
  const [pecaError, setPecaError] = useState<string | null>(null);

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

  const isLoading =
    ordemQuery.isLoading || clienteQuery.isLoading || aparelhoQuery.isLoading;
  const isError =
    ordemQuery.isError || clienteQuery.isError || aparelhoQuery.isError;

  const deviceLabel = useMemo(() => {
    if (!aparelho) {
      return "Aparelho nao encontrado";
    }

    return `${aparelho.marca} ${aparelho.modelo}`;
  }, [aparelho]);

  const produtos = produtosQuery.data ?? [];
  const selectedProduto = produtos.find((produto) => produto.id === pecaProdutoId);

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
        entradaEm: ordem.entradaEm,
        previsaoEntregaEm: ordem.previsaoEntregaEm,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ordem-servico", ordemId] }),
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
          : "Nao foi possivel adicionar a peca.",
      );
    },
  });

  const handleAddPeca = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPecaError(null);

    if (!ordem || !selectedProduto) {
      setPecaError("Selecione uma peca do estoque.");
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
          title="Nao foi possivel carregar a OS"
          description="Verifique se o backend esta rodando e tente novamente."
          actions={
            <Button asChild variant="outline">
              <Link to="/app/ordens">Voltar para ordens</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Ordem de servico"
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
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Imprimir
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
          <p className="mt-1 font-mono text-lg">{formatDate(ordem.entradaEm)}</p>
        </Card>
        <Card className="surface-panel p-4">
          <p className="text-xs text-muted-foreground">Previsao</p>
          <p className="mt-1 font-mono text-lg">
            {formatDate(ordem.previsaoEntregaEm)}
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
              <dd className="font-medium">{cliente?.nome ?? ordem.clienteId}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Telefone</dt>
              <dd>{cliente?.telefone ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Documento</dt>
              <dd>{cliente?.documento ?? "-"}</dd>
            </div>
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
          </dl>
        </SectionPanel>

        <SectionPanel title="Valores" className="lg:col-span-1">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Pecas</dt>
              <dd className="font-mono">{formatBRL(ordem.valorPecas)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Mao de obra</dt>
              <dd className="font-mono">{formatBRL(ordem.valorMaoObra)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <dt className="font-medium">Total</dt>
              <dd className="font-mono font-semibold">
                {formatBRL(ordem.valorTotal)}
              </dd>
            </div>
          </dl>
        </SectionPanel>
      </div>

      <SectionPanel title="Defeito e diagnostico">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Defeito relatado</p>
            <p className="mt-1 text-sm">{ordem.defeitoRelatado}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Diagnostico</p>
            <p className="mt-1 text-sm">{ordem.diagnostico ?? "-"}</p>
          </div>
        </div>
      </SectionPanel>

      <SectionPanel title="Pecas usadas">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Peca</th>
                  <th className="px-4 py-3 text-center font-medium">Qtd.</th>
                  <th className="px-4 py-3 text-right font-medium">Unitario</th>
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
                      Nenhuma peca vinculada a esta OS.
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
            <FormField id="os-peca-produto" label="Peca do estoque">
              <Select
                value={pecaProdutoId}
                onValueChange={setPecaProdutoId}
                disabled={produtosQuery.isLoading}
              >
                <SelectTrigger id="os-peca-produto">
                  <SelectValue placeholder="Selecione a peca" />
                </SelectTrigger>
                <SelectContent>
                  {produtos.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.nome} ({produto.estoqueAtual})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            {pecaError && <p className="text-sm text-destructive">{pecaError}</p>}
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
            <h1>Comprovante de ordem de servico</h1>
            <p>Documento simples para controle de entrada e retirada.</p>
          </div>
          <div className="print-meta">
            <strong>OS-{ordem.numero}</strong>
            <span>Status: {ordem.status.replaceAll("_", " ")}</span>
            <span>Entrada: {formatDate(ordem.entradaEm)}</span>
            <span>Previsao: {formatDate(ordem.previsaoEntregaEm)}</span>
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
            <p>{aparelho?.imeiSerial ? `IMEI ${aparelho.imeiSerial}` : "-"}</p>
          </div>
          <div>
            <span>Total previsto</span>
            <strong>{formatBRL(ordem.valorTotal)}</strong>
            <p>
              Pecas {formatBRL(ordem.valorPecas)} + mao de obra{" "}
              {formatBRL(ordem.valorMaoObra)}
            </p>
          </div>
        </div>

        <h2>Relato e diagnostico</h2>
        <table className="print-table">
          <tbody>
            <tr>
              <th>Defeito relatado</th>
              <td>{ordem.defeitoRelatado}</td>
            </tr>
            <tr>
              <th>Diagnostico</th>
              <td>{ordem.diagnostico ?? "-"}</td>
            </tr>
            <tr>
              <th>Tecnico responsavel</th>
              <td>{ordem.tecnicoResponsavel ?? "-"}</td>
            </tr>
          </tbody>
        </table>

        <h2>Pecas usadas</h2>
        <table className="print-table">
          <thead>
            <tr>
              <th>Peca</th>
              <th>Qtd.</th>
              <th>Unitario</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {(ordem.pecasUsadas ?? []).length === 0 ? (
              <tr>
                <td colSpan={4}>Nenhuma peca vinculada.</td>
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
    </div>
  );
};

export default OrdemDetalhe;
