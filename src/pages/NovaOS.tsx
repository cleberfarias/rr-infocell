import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, Save, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const NovaOS = () => {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">// Etapa 1 de 3</p>
          <h2 className="font-display text-2xl font-bold">Nova ordem de serviço</h2>
          <p className="text-sm text-muted-foreground">Cadastre o cliente e o aparelho recebido na bancada.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs">
          <span className="rounded-md bg-primary/15 px-3 py-1.5 font-mono text-primary">1. Cadastro</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="rounded-md bg-secondary px-3 py-1.5 font-mono text-muted-foreground">2. Checklist</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="rounded-md bg-secondary px-3 py-1.5 font-mono text-muted-foreground">3. Diagnóstico</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="surface-panel p-6">
            <h3 className="mb-4 font-display text-base font-semibold">Dados do cliente</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Nome do cliente"><Input placeholder="Nome completo" /></Field>
              <Field label="Telefone / WhatsApp"><Input placeholder="(00) 00000-0000" /></Field>
              <Field label="CPF (opcional)"><Input placeholder="000.000.000-00" /></Field>
              <Field label="E-mail (opcional)"><Input placeholder="cliente@email.com" /></Field>
            </div>
          </Card>

          <Card className="surface-panel p-6">
            <h3 className="mb-4 font-display text-base font-semibold">Aparelho recebido</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Marca">
                <Select><SelectTrigger><SelectValue placeholder="Selecione a marca" /></SelectTrigger>
                  <SelectContent>{["Apple", "Samsung", "Xiaomi", "Motorola", "Realme", "Outros"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Modelo"><Input placeholder="Ex: iPhone 13 Pro" /></Field>
              <Field label="IMEI / Serial"><Input placeholder="15 dígitos" className="font-mono" /></Field>
              <Field label="Cor"><Input placeholder="Ex: Grafite" /></Field>
              <Field label="Senha / Padrão" hint="Apenas se o cliente fornecer voluntariamente">
                <Input placeholder="Opcional" />
              </Field>
              <Field label="Acessórios entregues"><Input placeholder="Capa, película, chip..." /></Field>
            </div>
          </Card>

          <Card className="surface-panel p-6">
            <h3 className="mb-4 font-display text-base font-semibold">Defeito e observações</h3>
            <div className="space-y-4">
              <Field label="Defeito relatado pelo cliente">
                <Textarea rows={3} placeholder="Descreva o problema conforme relato do cliente..." />
              </Field>
              <Field label="Observações gerais">
                <Textarea rows={2} placeholder="Notas internas, riscos, condições especiais..." />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="surface-panel p-6">
            <h3 className="mb-4 font-display text-base font-semibold">Operação</h3>
            <div className="space-y-4">
              <Field label="Data de entrada"><Input type="date" defaultValue="2025-04-17" /></Field>
              <Field label="Previsão de entrega"><Input type="date" defaultValue="2025-04-20" /></Field>
              <Field label="Técnico responsável">
                <Select><SelectTrigger><SelectValue placeholder="Atribuir técnico" /></SelectTrigger>
                  <SelectContent>{["Rafael S.", "Diego M.", "Bruno T."].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Status inicial">
                <Select defaultValue="recebido">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recebido">Recebido</SelectItem>
                    <SelectItem value="em_analise">Em análise</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Card>

          <Card className="surface-panel p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Próximo passo</p>
            <h3 className="mt-1 font-display text-base font-semibold">Checklist do aparelho</h3>
            <p className="mt-1 text-xs text-muted-foreground">Após salvar, registre o estado físico e funcional do aparelho.</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                <Link to="/app/checklist"><Save className="h-4 w-4" /> Salvar e ir ao checklist</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app/checklist"><ClipboardCheck className="h-4 w-4" /> Pular para checklist</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NovaOS;
