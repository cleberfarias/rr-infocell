import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({ credential: applicationDefault(), projectId: "rr-infocell" });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const now = new Date().toISOString();

const post = {
  titulo: "Como Organizar Ordens de Serviço na Assistência Técnica (Guia 2025)",
  slug: "como-organizar-ordens-de-servico-assistencia-tecnica",
  resumo:
    "Aprenda como organizar as ordens de serviço da sua assistência técnica de celular de forma simples, sem planilhas, sem papelada e sem perder nenhum aparelho.",
  tags: ["ordem de serviço", "gestão", "assistência técnica", "celular", "organização", "OS"],
  autor: "NextAssist",
  imagemCapa: undefined,
  publicado: true,
  publicadoEm: now,
  criadoEm: now,
  atualizadoEm: now,
  metaTitle: "Como Organizar Ordens de Serviço na Assistência Técnica — Guia Completo",
  metaDescription:
    "Descubra como sair das planilhas e cadernos e organizar suas ordens de serviço de forma profissional. Guia prático para técnicos e donos de assistência técnica de celular.",
  conteudo: `
<h2>Por que as planilhas e cadernos travam o crescimento da sua assistência?</h2>

<p>Se você ainda usa caderno, WhatsApp ou planilha para controlar os aparelhos que entram na sua assistência técnica, provavelmente já passou por alguma dessas situações:</p>

<ul>
  <li>Cliente ligou perguntando do aparelho e você não lembrava o status</li>
  <li>Peça comprada ficou parada porque ninguém anotou para qual OS era</li>
  <li>Aparelho pronto há dias, mas o cliente não foi avisado</li>
  <li>Dois técnicos trabalhando no mesmo aparelho sem saber</li>
  <li>Fechou o mês sem saber quantas OS foram abertas, finalizadas ou canceladas</li>
</ul>

<p>Esses problemas não acontecem porque você é desorganizado — acontecem porque <strong>caderno e planilha não foram feitos para gerenciar ordens de serviço</strong>. Eles não avisam ninguém, não atualizam status e não geram relatórios. E quanto mais a assistência cresce, mais essas falhas custam dinheiro.</p>

<h2>O que é uma ordem de serviço e para que serve?</h2>

<p>A ordem de serviço (OS) é o documento que registra tudo sobre o atendimento de um aparelho: quem é o cliente, qual o problema relatado, o que foi feito, quanto custou e quando foi entregue.</p>

<p>Na prática, a OS é o contrato entre você e o cliente. Ela protege o técnico em caso de reclamação, organiza o fluxo da loja e permite acompanhar cada aparelho do momento em que entra até a hora da entrega.</p>

<p>Sem uma OS bem feita, sua assistência opera no escuro: você não sabe quantos aparelhos estão em andamento, quais estão esperando peça, quais já foram aprovados e quais ainda precisam de orçamento.</p>

<h2>Quais informações uma boa OS deve ter?</h2>

<p>Uma ordem de serviço completa para assistência técnica de celular precisa conter pelo menos:</p>

<ul>
  <li><strong>Dados do cliente:</strong> nome, telefone, CPF (opcional)</li>
  <li><strong>Dados do aparelho:</strong> marca, modelo, IMEI, cor, senha do aparelho</li>
  <li><strong>Problema relatado:</strong> o que o cliente descreveu na chegada</li>
  <li><strong>Checklist de entrada:</strong> estado da tela, bateria, botões, câmera — para evitar reclamações depois</li>
  <li><strong>Diagnóstico técnico:</strong> o que realmente foi encontrado</li>
  <li><strong>Orçamento:</strong> valor das peças + mão de obra</li>
  <li><strong>Status:</strong> aguardando orçamento, aprovado, em andamento, pronto, entregue</li>
  <li><strong>Observações:</strong> qualquer detalhe relevante (ex: "cliente pediu pra guardar a tela original")</li>
  <li><strong>Data de entrada e prazo estimado</strong></li>
</ul>

<p>Se sua OS atual não tem todos esses campos, você está deixando brechas que podem virar problema com o cliente ou prejuízo para o negócio.</p>

<h2>Como organizar OS na prática: passo a passo</h2>

<h3>1. Registre a entrada do aparelho</h3>

<p>O primeiro passo é criar a OS no momento em que o cliente entrega o aparelho. Nada de "depois eu anoto". O registro imediato evita esquecimento e já deixa o aparelho rastreável.</p>

<p>Na entrada, preencha os dados do cliente, do aparelho, o problema relatado e faça o checklist de entrada. Se possível, <strong>tire fotos do estado do aparelho</strong> — isso evita 90% das reclamações de "meu celular não tinha esse risco".</p>

<h3>2. Defina o diagnóstico e orçamento</h3>

<p>Após a triagem, o técnico registra o diagnóstico real e monta o orçamento. A OS muda para o status "aguardando aprovação" e o cliente é notificado — idealmente por WhatsApp, que é o canal mais rápido.</p>

<p>O orçamento precisa ser claro: descreva o serviço, o valor da peça e da mão de obra separadamente. Isso transmite profissionalismo e reduz negociação.</p>

<h3>3. Acompanhe o status em tempo real</h3>

<p>Depois que o cliente aprova, a OS passa para "em andamento". Cada etapa deve ser registrada: peça encomendada, peça chegou, serviço iniciado, serviço concluído.</p>

<p>Isso não é burocracia — é controle. Quando alguém perguntar "como está o aparelho do Fulano?", a resposta precisa estar a um clique de distância, não na memória do técnico.</p>

<h3>4. Comunique o cliente sobre o andamento</h3>

<p>O maior motivo de reclamação em assistência técnica não é demora — é <strong>falta de comunicação</strong>. O cliente não sabe se o aparelho está sendo consertado, se falta peça ou se já está pronto.</p>

<p>O ideal é enviar uma mensagem automática por WhatsApp a cada mudança de status. Assim o cliente fica tranquilo e você não perde tempo respondendo "e meu celular?".</p>

<h3>5. Feche a OS e faça a entrega</h3>

<p>Quando o serviço estiver concluído, a OS deve ser finalizada com o registro do que foi feito, o valor cobrado e a forma de pagamento. Na entrega, peça a assinatura do cliente (digital ou física) e entregue o comprovante — pode ser um recibo impresso ou um PDF enviado por WhatsApp.</p>

<p>Esse fechamento protege tanto você quanto o cliente e cria um histórico de atendimento que pode ser consultado no futuro.</p>

<h2>Como o NextAssist automatiza tudo isso</h2>

<p>O <strong>NextAssist</strong> é um sistema de gestão feito especificamente para assistências técnicas de celular. Ele centraliza ordens de serviço, estoque de peças, PDV e financeiro em uma única plataforma web — tudo sem precisar instalar nada.</p>

<p>Com o NextAssist, você consegue: abrir uma OS em segundos, registrar fotos do aparelho, enviar notificação via WhatsApp para o cliente a cada mudança de status, imprimir recibo térmico e acompanhar todas as OS abertas em um dashboard em tempo real.</p>

<p>O plano Starter custa R$89/mês e inclui OS ilimitadas — menos do que uma peça de reposição. E você pode testar 7 dias grátis, sem precisar de cartão de crédito.</p>

<p><strong><a href="https://www.nextassist-app.com.br">Comece seu teste gratuito agora e veja como é organizar sua assistência técnica com o NextAssist.</a></strong></p>

<h2>Conclusão</h2>

<p>Organizar as ordens de serviço da sua assistência técnica não precisa ser complicado — mas precisa ser feito com um processo bem definido ou com o apoio de um sistema como o NextAssist, o importante é transformar cada atendimento em uma operação previsível, profissional e escalável.</p>

<p>Quanto antes você estruturar esse processo, mais rápido sua assistência vai crescer sem depender da sua memória para funcionar.</p>
`.trim(),
};

const ref = await db.collection("blog-posts").add(post);
console.log("Artigo publicado! ID:", ref.id);
console.log("URL:", `https://www.nextassist-app.com.br/blog/${post.slug}`);

process.exit(0);
