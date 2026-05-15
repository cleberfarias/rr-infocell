import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  PackagePlus,
  Printer,
  ShieldCheck,
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
import { formatBRL, formatDate } from "@/lib/formatters";
import { getAparelho } from "@/services/aparelhos";
import { getCliente } from "@/services/clientes";
import {
  getOrdemServico,
  updateOrdemServico,
  type OrdemServicoPecaInput,
} from "@/services/ordens-servico";
import { listProdutos } from "@/services/produtos";


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

  return (
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
            <Button variant="outline" onClick={handlePrintGarantia}>
              <ShieldCheck className="h-4 w-4" /> Termo de Garantia
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
              <dt className="text-muted-foreground">Peças</dt>
              <dd className="font-mono">{formatBRL(ordem.valorPecas)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Mão de obra</dt>
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
              <dd>{ordem.garantiaDias ? `${ordem.garantiaDias} dias` : "-"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Valida ate</dt>
              <dd>{formatDate(ordem.garantiaAte)}</dd>
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
                  <th className="px-4 py-3 text-right font-medium">Unitário</th>
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
              <Select
                value={pecaProdutoId}
                onValueChange={setPecaProdutoId}
                disabled={produtosQuery.isLoading}
              >
                <SelectTrigger id="os-peca-produto">
                  <SelectValue placeholder="Selecione a peça" />
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
            <h1>Comprovante de ordem de serviço</h1>
            <p>Documento simples para controle de entrada e retirada.</p>
          </div>
          <div className="print-meta">
            <strong>OS-{ordem.numero}</strong>
            <span>Status: {ordem.status.replaceAll("_", " ")}</span>
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
            <p>{aparelho?.imeiSerial ? `IMEI ${aparelho.imeiSerial}` : "-"}</p>
          </div>
          <div>
            <span>Total previsto</span>
            <strong>{formatBRL(ordem.valorTotal)}</strong>
            <p>
              Peças {formatBRL(ordem.valorPecas)} + mão de obra{" "}
              {formatBRL(ordem.valorMaoObra)}
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
            <p>OS-{ordem.numero} — emitido em {formatDate(new Date().toISOString())}</p>
          </div>
          <div className="print-meta">
            <strong>OS-{ordem.numero}</strong>
            <span>Técnico: {ordem.tecnicoResponsavel ?? "—"}</span>
            <span>Entrega: {formatDate(ordem.entregueEm ?? new Date().toISOString())}</span>
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
            <p>{aparelho?.imeiSerial ? `IMEI ${aparelho.imeiSerial}` : "—"}</p>
            <p>{aparelho?.cor ?? "—"}</p>
          </div>
          <div>
            <span>Total pago</span>
            <strong>{formatBRL(ordem.valorTotal)}</strong>
            <p>Peças: {formatBRL(ordem.valorPecas)}</p>
            <p>Mão de obra: {formatBRL(ordem.valorMaoObra)}</p>
          </div>
        </div>

        <h2>Serviço realizado</h2>
        <table className="print-table">
          <tbody>
            <tr>
              <th>Diagnóstico</th>
              <td>{ordem.diagnostico ?? "—"}</td>
            </tr>
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
          <strong>{ordem.garantiaDias ? `${ordem.garantiaDias} dias` : "—"}</strong>
          <p>Válida até {formatDate(ordem.garantiaAte)}</p>
          {ordem.garantiaObservacoes && <p>{ordem.garantiaObservacoes}</p>}
        </div>

        <div className="garantia-terms">
          <strong>Termos da garantia</strong>
          <p style={{ marginTop: 6 }}>
            A RR Infocell garante os serviços realizados e as peças substituídas pelo prazo
            acima, contado a partir da data de entrega do aparelho. A garantia cobre
            exclusivamente defeitos relacionados ao serviço descrito neste documento.
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
            Para acionar a garantia, o cliente deverá apresentar este documento na RR Infocell.
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
  );
};

export default OrdemDetalhe;
