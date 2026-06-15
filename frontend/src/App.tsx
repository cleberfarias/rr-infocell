import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { TenantProvider } from "@/contexts/TenantContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Ordens from "./pages/Ordens";
import OrdemDetalhe from "./pages/OrdemDetalhe";
import NovaOS from "./pages/NovaOS";
import Checklist from "./pages/Checklist";
import Manutencao from "./pages/Manutencao";
import Orcamento from "./pages/Orcamento";
import Estoque from "./pages/Estoque";
import Movimentacoes from "./pages/Movimentacoes";
import PDV from "./pages/PDV";
import Financeiro from "./pages/Financeiro";
import Despesas from "./pages/Despesas";
import Clientes from "./pages/Clientes";
import Aparelhos from "./pages/Aparelhos";
import Usuarios from "./pages/Usuarios";
import Atendimento from "./pages/Atendimento";
import Treinamento from "./pages/Treinamento";
import Observabilidade from "./pages/Observabilidade";
import TenantSettings from "./pages/TenantSettings";
import ConfiguracoesMensagens from "./pages/ConfiguracoesMensagens";
import Planos from "./pages/Planos";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <TenantProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/planos" element={<Planos />} />
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="ordens" element={<Ordens />} />
                <Route path="ordens/:ordemId" element={<OrdemDetalhe />} />
                <Route path="ordens/nova" element={<NovaOS />} />
                <Route path="checklist" element={<Checklist />} />
                <Route path="manutencao" element={<Manutencao />} />
                <Route path="orcamento" element={<Orcamento />} />
                <Route path="estoque" element={<Estoque />} />
                <Route path="movimentacoes" element={<Movimentacoes />} />
                <Route path="pdv" element={<PDV />} />
                <Route path="financeiro" element={<Financeiro />} />
                <Route path="despesas" element={<Despesas />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="aparelhos" element={<Aparelhos />} />
                <Route path="usuarios" element={<Usuarios />} />
                <Route path="atendimento" element={<Atendimento />} />
                <Route path="observabilidade" element={<Observabilidade />} />
                <Route path="treinamento" element={<Treinamento />} />
                <Route path="configuracoes" element={<TenantSettings />} />
                <Route path="configuracoes/mensagens" element={<ConfiguracoesMensagens />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TenantProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
