export const designSystem = {
  brand: {
    name: "RR Infocell",
    product: "Sistema de Gestão",
    tone: "operacional, técnico e direto",
  },
  colors: {
    background: "hsl(var(--background))",
    foreground: "hsl(var(--foreground))",
    primary: "hsl(var(--primary))",
    secondary: "hsl(var(--secondary))",
    success: "hsl(var(--success))",
    warning: "hsl(var(--warning))",
    destructive: "hsl(var(--destructive))",
    muted: "hsl(var(--muted))",
    border: "hsl(var(--border))",
  },
  typography: {
    display: "Space Grotesk",
    body: "Inter",
    mono: "JetBrains Mono",
  },
  radius: {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
  },
  spacing: {
    page: "p-4 md:p-8",
    panel: "p-5 md:p-6",
    stack: "space-y-6",
  },
  elevation: {
    panel: "surface-panel",
    glow: "shadow-glow",
    elevated: "shadow-elevated",
  },
  statusIntent: {
    neutral: "bg-muted text-muted-foreground border-border",
    info: "bg-info/10 text-info border-info/30",
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/30",
    primary: "bg-primary/10 text-primary border-primary/30",
  },
} as const;

export type DesignSystem = typeof designSystem;
export type StatusIntent = keyof typeof designSystem.statusIntent;
