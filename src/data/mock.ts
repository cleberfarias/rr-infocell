import type { StatusKey } from "@/components/StatusBadge";

export type OrdemServico = {
  id: string;
  cliente: string;
  telefone: string;
  cpf?: string;
  marca: string;
  modelo: string;
  imei: string;
  cor: string;
  defeito: string;
  tecnico: string;
  status: StatusKey;
  entrada: string;
  previsao: string;
  valorPecas: number;
  valorMaoObra: number;
  pecas: { nome: string; qtd: number; custo: number; venda: number }[];
};

export const ordens: OrdemServico[] = [
  { id: "OS-2034", cliente: "Marcos Almeida",    telefone: "(11) 98432-1290", marca: "Apple",    modelo: "iPhone 13 Pro",    imei: "356789012345678", cor: "Grafite",      defeito: "Tela trincada após queda",                tecnico: "Rafael S.",  status: "em_manutencao",        entrada: "14/04",  previsao: "17/04", valorPecas: 480, valorMaoObra: 180, pecas: [{ nome: "Tela OLED iPhone 13 Pro", qtd: 1, custo: 380, venda: 480 }] },
  { id: "OS-2033", cliente: "Juliana Ramos",     telefone: "(11) 99102-5511", marca: "Samsung",  modelo: "Galaxy S23",       imei: "352145896325478", cor: "Preto",        defeito: "Não carrega — conector com mau contato",  tecnico: "Diego M.",   status: "aguardando_aprovacao", entrada: "14/04",  previsao: "16/04", valorPecas: 90,  valorMaoObra: 120, pecas: [{ nome: "Flex de carga S23", qtd: 1, custo: 55, venda: 90 }] },
  { id: "OS-2032", cliente: "Carlos Henrique",   telefone: "(11) 97511-3340", marca: "Xiaomi",   modelo: "Redmi Note 12",    imei: "865412302145896", cor: "Azul",         defeito: "Bateria viciada, descarrega rápido",      tecnico: "Rafael S.",  status: "finalizado",           entrada: "12/04",  previsao: "15/04", valorPecas: 110, valorMaoObra: 80,  pecas: [{ nome: "Bateria Note 12", qtd: 1, custo: 70, venda: 110 }] },
  { id: "OS-2031", cliente: "Fernanda Lima",     telefone: "(11) 98855-2210", marca: "Apple",    modelo: "iPhone 11",        imei: "359875412365478", cor: "Branco",       defeito: "Câmera traseira embaçada",                tecnico: "Diego M.",   status: "em_analise",           entrada: "14/04",  previsao: "18/04", valorPecas: 0,   valorMaoObra: 0,   pecas: [] },
  { id: "OS-2030", cliente: "Roberto Tavares",   telefone: "(11) 99623-1180", marca: "Motorola", modelo: "Moto G84",         imei: "356987412563214", cor: "Verde",        defeito: "Tampa traseira solta + microfone falhando", tecnico: "Rafael S.", status: "atrasado",             entrada: "10/04",  previsao: "13/04", valorPecas: 65,  valorMaoObra: 100, pecas: [{ nome: "Microfone G84", qtd: 1, custo: 35, venda: 65 }] },
  { id: "OS-2029", cliente: "Patrícia Oliveira", telefone: "(11) 98112-7740", marca: "Apple",    modelo: "iPhone 14",        imei: "354896521478963", cor: "Estelar",      defeito: "Face ID não reconhece",                   tecnico: "Diego M.",   status: "entregue",             entrada: "08/04",  previsao: "12/04", valorPecas: 250, valorMaoObra: 200, pecas: [{ nome: "Módulo Face ID", qtd: 1, custo: 180, venda: 250 }] },
  { id: "OS-2028", cliente: "André Souza",       telefone: "(11) 99701-3322", marca: "Samsung",  modelo: "A54",              imei: "354123698745632", cor: "Lilás",        defeito: "Tela com manchas",                        tecnico: "Rafael S.",  status: "recebido",             entrada: "15/04",  previsao: "19/04", valorPecas: 0,   valorMaoObra: 0,   pecas: [] },
];

export const pecasEstoque = [
  { sku: "TLA-IP13P", nome: "Tela OLED iPhone 13 Pro", estoque: 4,  minimo: 2, custo: 380, venda: 480 },
  { sku: "TLA-S23",   nome: "Tela AMOLED Galaxy S23",  estoque: 2,  minimo: 2, custo: 420, venda: 560 },
  { sku: "BAT-RN12",  nome: "Bateria Redmi Note 12",   estoque: 12, minimo: 5, custo: 70,  venda: 110 },
  { sku: "FLX-S23",   nome: "Flex de carga S23",       estoque: 6,  minimo: 4, custo: 55,  venda: 90 },
  { sku: "MIC-G84",   nome: "Microfone Moto G84",      estoque: 8,  minimo: 4, custo: 35,  venda: 65 },
  { sku: "FID-IP14",  nome: "Módulo Face ID iPhone 14",estoque: 1,  minimo: 1, custo: 180, venda: 250 },
  { sku: "CAM-IP11",  nome: "Câmera traseira iPhone 11", estoque: 3, minimo: 2, custo: 95, venda: 160 },
];

export const clientes = [
  { id: 1, nome: "Marcos Almeida",    telefone: "(11) 98432-1290", aparelhos: 3, ultimo: "iPhone 13 Pro", total: 1240 },
  { id: 2, nome: "Juliana Ramos",     telefone: "(11) 99102-5511", aparelhos: 2, ultimo: "Galaxy S23",    total: 480 },
  { id: 3, nome: "Carlos Henrique",   telefone: "(11) 97511-3340", aparelhos: 5, ultimo: "Redmi Note 12", total: 980 },
  { id: 4, nome: "Fernanda Lima",     telefone: "(11) 98855-2210", aparelhos: 1, ultimo: "iPhone 11",     total: 320 },
  { id: 5, nome: "Roberto Tavares",   telefone: "(11) 99623-1180", aparelhos: 4, ultimo: "Moto G84",      total: 760 },
  { id: 6, nome: "Patrícia Oliveira", telefone: "(11) 98112-7740", aparelhos: 2, ultimo: "iPhone 14",     total: 1100 },
  { id: 7, nome: "André Souza",       telefone: "(11) 99701-3322", aparelhos: 1, ultimo: "Galaxy A54",    total: 220 },
];

export const faturamentoSemanal = [
  { dia: "Seg", servicos: 1240, produtos: 480 },
  { dia: "Ter", servicos: 980,  produtos: 720 },
  { dia: "Qua", servicos: 1480, produtos: 320 },
  { dia: "Qui", servicos: 1620, produtos: 580 },
  { dia: "Sex", servicos: 2150, produtos: 1100 },
  { dia: "Sáb", servicos: 2480, produtos: 1340 },
  { dia: "Dom", servicos: 540,  produtos: 220 },
];

export const pecasMaisUsadas = [
  { nome: "Tela iPhone 13 Pro", qtd: 14 },
  { nome: "Bateria Redmi Note 12", qtd: 11 },
  { nome: "Flex de carga S23", qtd: 9 },
  { nome: "Tela Galaxy S23", qtd: 7 },
  { nome: "Microfone G84", qtd: 5 },
];

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
