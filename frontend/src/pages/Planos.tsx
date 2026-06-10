import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { kiwifyPlans } from "@/config/kiwifyPlans";
import { cn } from "@/lib/utils";

export default function Planos() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="mb-12 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            NextAssist
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold glow-text">
            Planos e Preços
          </h1>
          <p className="mt-3 text-muted-foreground">
            Escolha o plano ideal para sua assistência técnica.
            Sem fidelidade — cancele quando quiser.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {kiwifyPlans.map((plan) => (
            <Card
              key={plan.key}
              className={cn(
                "surface-panel relative flex flex-col p-6",
                plan.highlight && "border-primary/60 shadow-glow",
              )}
            >
              {plan.highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-primary-foreground shadow-glow">
                  Mais popular
                </Badge>
              )}

              <div className="mb-6">
                <h2 className="font-display text-xl font-semibold">
                  {plan.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.description}
                </p>
                <p className="mt-4 font-display text-3xl font-bold text-foreground">
                  {plan.priceLabel}
                </p>
              </div>

              <ul className="mb-8 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={cn(
                  "w-full",
                  plan.highlight
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "variant-outline",
                )}
                variant={plan.highlight ? "default" : "outline"}
              >
                <a href={plan.checkoutUrl} target="_blank" rel="noopener noreferrer">
                  Assinar {plan.name}
                </a>
              </Button>
            </Card>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Pagamento processado com segurança pela{" "}
          <span className="font-medium text-foreground">Kiwify</span>. Acesso
          liberado imediatamente após a confirmação do pagamento.
        </p>
      </div>
    </div>
  );
}
