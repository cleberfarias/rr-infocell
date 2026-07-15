import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CreditCard, ExternalLink, FileCheck2, Save, TestTube2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/design-system/FormField";
import { getIntegrationSettings, listMercadoPagoTerminals, saveFiscalSettings, savePaymentSettings, startMercadoPagoOAuth, testIntegration, type FiscalSettings, type PaymentSettings } from "@/services/integracoes";

type FiscalForm = FiscalSettings & { certificadoPfxBase64: string; senhaCertificado: string; csc: string; cscId: string; municipio: string; provedorNfse: string };
type PaymentForm = PaymentSettings & { clientId: string; clientSecret: string; merchantId: string; accessToken: string; terminalId: string };
const emptyFiscal: FiscalForm = { uf: "", ambiente: "homologacao", regimeTributario: "simples_nacional", emiteNfce: true, emiteNfse: true, municipio: "", provedorNfse: "", serieNfce: 1, proximoNumeroNfce: 1, certificadoPfxBase64: "", senhaCertificado: "", csc: "", cscId: "" };
const emptyPayment: PaymentForm = { provider: "stone", mode: "api", clientId: "", clientSecret: "", merchantId: "", accessToken: "", terminalId: "" };

export default function Integracoes() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["integration-settings"], queryFn: getIntegrationSettings });
  const terminals = useQuery({ queryKey: ["mercado-pago-terminals"], queryFn: listMercadoPagoTerminals, enabled: Boolean(settings.data?.payment?.provider === "mercado_pago" && settings.data?.payment?.oauthConnected) });
  const [fiscal, setFiscal] = useState<FiscalForm>(emptyFiscal);
  const [payment, setPayment] = useState<PaymentForm>(emptyPayment);
  useEffect(() => { if (settings.data?.fiscal) setFiscal((v) => ({ ...v, ...settings.data!.fiscal })); if (settings.data?.payment) setPayment((v) => ({ ...v, ...settings.data!.payment })); }, [settings.data]);
  useEffect(() => { const status = new URLSearchParams(window.location.search).get("mercadoPago"); if (!status) return; if (status === "connected") toast.success("Conta Mercado Pago conectada."); else toast.error("A conexão com Mercado Pago não foi autorizada."); window.history.replaceState({}, "", window.location.pathname); void queryClient.invalidateQueries({ queryKey: ["integration-settings"] }); }, [queryClient]);

  const saved = async (message: string) => { await queryClient.invalidateQueries({ queryKey: ["integration-settings"] }); toast.success(message); };
  const fiscalMutation = useMutation({ mutationFn: saveFiscalSettings, onSuccess: () => saved("Configuração fiscal salva."), onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar.") });
  const paymentMutation = useMutation({ mutationFn: savePaymentSettings, onSuccess: () => saved("Configuração de pagamentos salva."), onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar.") });
  const oauthMutation = useMutation({ mutationFn: startMercadoPagoOAuth, onSuccess: ({ authorizationUrl }) => window.location.assign(authorizationUrl), onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível iniciar a conexão.") });
  const testMutation = useMutation({ mutationFn: () => testIntegration("payment"), onSuccess: (result) => result.ok ? toast.success(result.message) : toast.error(result.message), onError: (e) => toast.error(e instanceof Error ? e.message : "Falha no teste.") });
  const readPfx = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => setFiscal((v) => ({ ...v, certificadoPfxBase64: String(reader.result).split(",")[1] ?? "" })); reader.readAsDataURL(file); };
  const submitFiscal = (e: FormEvent) => { e.preventDefault(); fiscalMutation.mutate(fiscal); };
  const submitPayment = (e: FormEvent) => { e.preventDefault(); paymentMutation.mutate(payment); };

  return <div className="space-y-5">
    <div><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Configuração por tenant</p><h1 className="font-display text-2xl font-semibold glow-text">Fiscal e Pagamentos</h1><p className="mt-1 text-sm text-muted-foreground">Prepare NFC-e, NFS-e e adquirentes. Segredos salvos nunca são exibidos novamente.</p></div>
    <Card className="surface-panel p-5"><form onSubmit={submitFiscal} className="space-y-5">
      <div className="flex items-center gap-3"><FileCheck2 className="text-primary"/><div><h2 className="font-display text-lg font-semibold">Módulo Fiscal</h2><p className="text-sm text-muted-foreground">Comece em homologação e valide tudo com a contabilidade.</p></div></div>
      <div className="grid gap-4 md:grid-cols-3">
        <FormField id="uf" label="UF"><Input id="uf" required maxLength={2} value={fiscal.uf} onChange={(e) => setFiscal({ ...fiscal, uf: e.target.value.toUpperCase() })}/></FormField>
        <FormField id="ambiente" label="Ambiente"><select id="ambiente" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={fiscal.ambiente} onChange={(e) => setFiscal({ ...fiscal, ambiente: e.target.value as typeof fiscal.ambiente })}><option value="homologacao">Homologação</option><option value="producao">Produção</option></select></FormField>
        <FormField id="regime" label="Regime tributário"><select id="regime" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={fiscal.regimeTributario} onChange={(e) => setFiscal({ ...fiscal, regimeTributario: e.target.value as typeof fiscal.regimeTributario })}><option value="simples_nacional">Simples Nacional</option><option value="simples_excesso">Simples - excesso</option><option value="regime_normal">Regime normal</option></select></FormField>
      </div>
      <div className="flex gap-6"><label className="flex gap-2 text-sm"><input type="checkbox" checked={fiscal.emiteNfce} onChange={(e) => setFiscal({ ...fiscal, emiteNfce: e.target.checked })}/> Emitir NFC-e</label><label className="flex gap-2 text-sm"><input type="checkbox" checked={fiscal.emiteNfse} onChange={(e) => setFiscal({ ...fiscal, emiteNfse: e.target.checked })}/> Emitir NFS-e</label></div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField id="pfx" label="Certificado A1 (.pfx/.p12)"><Input id="pfx" type="file" accept=".pfx,.p12" onChange={(e) => readPfx(e.target.files?.[0])}/></FormField>
        <FormField id="pfx-password" label="Senha do certificado"><Input id="pfx-password" type="password" value={fiscal.senhaCertificado} onChange={(e) => setFiscal({ ...fiscal, senhaCertificado: e.target.value })} placeholder="Deixe vazio para manter a atual"/></FormField>
        <FormField id="csc" label="CSC"><Input id="csc" type="password" value={fiscal.csc} onChange={(e) => setFiscal({ ...fiscal, csc: e.target.value })}/></FormField>
        <FormField id="csc-id" label="ID Token do CSC"><Input id="csc-id" value={fiscal.cscId} onChange={(e) => setFiscal({ ...fiscal, cscId: e.target.value })}/></FormField>
        <FormField id="municipio" label="Município"><Input id="municipio" value={fiscal.municipio} onChange={(e) => setFiscal({ ...fiscal, municipio: e.target.value })}/></FormField>
        <FormField id="nfse-provider" label="Provedor da prefeitura"><Input id="nfse-provider" value={fiscal.provedorNfse} onChange={(e) => setFiscal({ ...fiscal, provedorNfse: e.target.value })} placeholder="Ex.: padrão nacional, Betha, IPM"/></FormField>
      </div>
      {settings.data?.fiscal?.secretsConfigured?.length ? <p className="flex items-center gap-2 text-sm text-emerald-400"><BadgeCheck className="h-4 w-4"/> Credenciais fiscais protegidas no backend.</p> : null}
      <Button disabled={fiscalMutation.isPending} className="bg-gradient-primary text-primary-foreground shadow-glow"><Save className="h-4 w-4"/> Salvar fiscal</Button>
    </form></Card>
    <Card className="surface-panel p-5"><form onSubmit={submitPayment} className="space-y-5">
      <div className="flex items-center gap-3"><CreditCard className="text-primary"/><div><h2 className="font-display text-lg font-semibold">Módulo de Pagamentos</h2><p className="text-sm text-muted-foreground">A primeira versão suporta configuração API; SmartPOS e TEF ficam preparados para fases futuras.</p></div></div>
      <div className="grid gap-4 md:grid-cols-2"><FormField id="provider" label="Adquirente"><select id="provider" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={payment.provider} onChange={(e) => setPayment({ ...payment, provider: e.target.value as typeof payment.provider })}><option value="stone">Stone</option><option value="mercado_pago">Mercado Pago</option><option value="pagbank">PagBank</option><option value="cielo">Cielo</option><option value="rede">Rede</option></select></FormField><FormField id="mode" label="Tipo"><select id="mode" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={payment.mode} onChange={(e) => setPayment({ ...payment, mode: e.target.value as typeof payment.mode })}><option value="api">API</option><option value="smartpos">SmartPOS (futuro)</option><option value="tef">TEF (futuro)</option></select></FormField></div>
      {payment.provider !== "mercado_pago" && <div className="grid gap-4 md:grid-cols-2"><FormField id="client-id" label="Client ID"><Input id="client-id" value={payment.clientId} onChange={(e) => setPayment({ ...payment, clientId: e.target.value })}/></FormField><FormField id="client-secret" label="Client Secret"><Input id="client-secret" type="password" value={payment.clientSecret} onChange={(e) => setPayment({ ...payment, clientSecret: e.target.value })}/></FormField><FormField id="merchant-id" label="Merchant ID"><Input id="merchant-id" value={payment.merchantId} onChange={(e) => setPayment({ ...payment, merchantId: e.target.value })}/></FormField><FormField id="access-token" label="Access Token"><Input id="access-token" type="password" value={payment.accessToken} onChange={(e) => setPayment({ ...payment, accessToken: e.target.value })}/></FormField></div>}
      {payment.provider === "mercado_pago" && <div className="rounded-md border border-border bg-secondary/20 p-4 space-y-3"><div><p className="font-medium">Mercado Pago OAuth</p><p className="text-xs text-muted-foreground">O cliente autoriza o NextAssist sem copiar tokens manualmente.</p></div><div className="flex flex-wrap gap-2"><Button type="button" onClick={() => oauthMutation.mutate()} disabled={oauthMutation.isPending} className="bg-gradient-primary text-primary-foreground shadow-glow"><ExternalLink className="h-4 w-4"/>{settings.data?.payment?.oauthConnected ? "Reconectar Mercado Pago" : "Conectar Mercado Pago"}</Button>{settings.data?.payment?.oauthConnected && <Button type="button" variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}><TestTube2 className="h-4 w-4"/>Testar conexão</Button>}</div>{settings.data?.payment?.oauthConnected && <p className="text-sm text-emerald-400">Conta conectada · usuário {settings.data.payment.mercadoPagoUserId} · {settings.data.payment.liveMode ? "produção" : "teste"}</p>}{terminals.data?.terminals?.length ? <FormField id="point-terminal" label="Terminal usado pelo PDV"><select id="point-terminal" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={payment.terminalId} onChange={(event) => setPayment({ ...payment, terminalId: event.target.value })}><option value="">Selecione o terminal</option>{terminals.data.terminals.map((terminal) => <option key={terminal.id} value={terminal.id}>{terminal.id} · {terminal.operating_mode ?? "modo não informado"}</option>)}</select></FormField> : settings.data?.payment?.oauthConnected ? <p className="text-xs text-muted-foreground">Nenhum terminal Point retornado para esta conta.</p> : null}</div>}
      {settings.data?.payment?.secretsConfigured?.length ? <p className="flex items-center gap-2 text-sm text-emerald-400"><BadgeCheck className="h-4 w-4"/> Credenciais de pagamento protegidas no backend.</p> : null}
      <Button disabled={paymentMutation.isPending} className="bg-gradient-primary text-primary-foreground shadow-glow"><Save className="h-4 w-4"/> Salvar pagamentos</Button>
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><TestTube2 className="h-4 w-4"/> O teste externo será ativado por provedor após credenciamento e homologação.</p>
    </form></Card>
  </div>;
}
