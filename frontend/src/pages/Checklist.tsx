import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Camera, PenLine, Upload, Save } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const items = [
  { key: "liga",        label: "Aparelho liga",          critical: false },
  { key: "tela",        label: "Tela quebrada",          critical: true },
  { key: "tampa",       label: "Tampa quebrada",         critical: true },
  { key: "camera",      label: "Câmera funcionando",     critical: false },
  { key: "botoes",      label: "Botões funcionando",     critical: false },
  { key: "audio",       label: "Áudio funcionando",      critical: false },
  { key: "conector",    label: "Conector funcionando",   critical: false },
  { key: "chip",        label: "Chip presente",          critical: false },
  { key: "memoria",     label: "Cartão de memória",      critical: false },
  { key: "pelicula",    label: "Película",               critical: false },
  { key: "capinha",     label: "Capinha",                critical: false },
  { key: "bateria",     label: "Bateria original",       critical: false },
  { key: "marcas",      label: "Marcas de uso",          critical: true },
  { key: "oxidacao",    label: "Oxidação",               critical: true },
  { key: "outros",      label: "Outros itens",           critical: false },
];

const Checklist = () => {
  const [checked, setChecked] = useState<Record<string, boolean>>({ liga: true, camera: true, botoes: true, audio: true, conector: true, chip: true, pelicula: true, tela: true });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">// OS-2034 • Marcos Almeida</p>
          <h2 className="font-display text-2xl font-bold">Checklist de entrada</h2>
          <p className="text-sm text-muted-foreground">Registre o estado físico e funcional do aparelho antes do diagnóstico.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Imprimir</Button>
          <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Link to="/app/manutencao"><Save className="h-4 w-4" /> Salvar checklist</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="surface-panel p-6 lg:col-span-2">
          <h3 className="mb-4 font-display text-base font-semibold">Inspeção do aparelho</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {items.map((it) => {
              const isChecked = !!checked[it.key];
              return (
                <label
                  key={it.key}
                  className={
                    "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-all " +
                    (isChecked
                      ? it.critical
                        ? "border-destructive/40 bg-destructive/10"
                        : "border-primary/40 bg-primary/10"
                      : "border-border bg-secondary/30 hover:border-border/80")
                  }
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(v) => setChecked((s) => ({ ...s, [it.key]: !!v }))}
                  />
                  <span className="font-medium">{it.label}</span>
                </label>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Observações do estado</Label>
              <Textarea rows={3} placeholder="Riscos na lateral direita, marcas leves de uso na traseira..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Acessórios entregues</Label>
              <Textarea rows={3} placeholder="Capa silicone preta, película de vidro, cabo lightning..." />
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="surface-panel p-6">
            <h3 className="mb-1 font-display text-base font-semibold">Fotos do aparelho</h3>
            <p className="mb-4 text-xs text-muted-foreground">Registre 4 ângulos: frente, verso e laterais.</p>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <button key={i} className="group relative flex aspect-square flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-secondary/30 transition-colors hover:border-primary/50 hover:bg-secondary/50">
                  <Camera className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">Foto {i}</span>
                </button>
              ))}
            </div>
            <Button variant="outline" className="mt-3 w-full"><Upload className="h-4 w-4" /> Anexar arquivo</Button>
          </Card>

          <Card className="surface-panel p-6">
            <h3 className="mb-3 font-display text-base font-semibold">Assinaturas</h3>
            <div className="space-y-3">
              {["Cliente", "Atendente"].map((p) => (
                <div key={p}>
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{p}</Label>
                  <div className="mt-1 flex h-20 items-center justify-center rounded-md border border-dashed border-border bg-secondary/30 text-xs text-muted-foreground">
                    <PenLine className="mr-2 h-4 w-4" /> Assinar com o dedo / mouse
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checklist;
