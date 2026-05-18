import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onPrint: () => void;
  children: React.ReactNode;
}

export function PrintPreviewDialog({
  open,
  onOpenChange,
  title,
  onPrint,
  children,
}: PrintPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-3 shrink-0">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              onClick={() => { onPrint(); onOpenChange(false); }}
            >
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        {/* Preview area */}
        <div className="flex-1 overflow-y-auto bg-white p-8 text-[#111827]">
          <div className="mx-auto max-w-[600px] font-[Inter,Arial,sans-serif] text-[11px] leading-[1.4]">
            {children}
          </div>
        </div>
        <div className="shrink-0 border-t border-border px-5 py-3 text-xs text-muted-foreground">
          Pré-visualização aproximada. O layout final pode variar conforme a impressora.
        </div>
      </DialogContent>
    </Dialog>
  );
}
