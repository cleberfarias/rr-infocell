import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Ordens from "./pages/Ordens";
import NovaOS from "./pages/NovaOS";
import Checklist from "./pages/Checklist";
import Manutencao from "./pages/Manutencao";
import Orcamento from "./pages/Orcamento";
import Estoque from "./pages/Estoque";
import PDV from "./pages/PDV";
import Financeiro from "./pages/Financeiro";
import Despesas from "./pages/Despesas";
import Clientes from "./pages/Clientes";
import Aparelhos from "./pages/Aparelhos";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="ordens" element={<Ordens />} />
              <Route path="ordens/nova" element={<NovaOS />} />
              <Route path="checklist" element={<Checklist />} />
              <Route path="manutencao" element={<Manutencao />} />
              <Route path="orcamento" element={<Orcamento />} />
              <Route path="estoque" element={<Estoque />} />
              <Route path="pdv" element={<PDV />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="despesas" element={<Despesas />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="aparelhos" element={<Aparelhos />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
