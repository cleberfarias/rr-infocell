import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade — NextAssist",
  description: "Política de privacidade e tratamento de dados da plataforma NextAssist.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacidadePage() {
  return (
    <article className="blog-article">
      <div className="blog-article-header">
        <div className="section-center">
          <Link href="/" className="blog-back">
            ← Voltar ao site
          </Link>
          <h1>Política de Privacidade</h1>
          <div className="blog-article-meta">
            <span>Última atualização: julho de 2026</span>
          </div>
        </div>
      </div>

      <div className="blog-article-content section-center">
        <p>
          Esta Política de Privacidade descreve como o NextAssist coleta, usa e protege os dados
          pessoais tratados no site comercial e na Plataforma, em conformidade com a Lei Geral de
          Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </p>

        <h2>1. Dados que coletamos</h2>
        <p>
          Ao preencher os formulários de teste grátis ou contato neste site, coletamos nome,
          e-mail, telefone e nome da empresa. Dentro da Plataforma, coletamos os dados que você
          cadastra para operar sua assistência técnica (clientes, ordens de serviço, estoque e
          financeiro).
        </p>

        <h2>2. Como usamos os dados</h2>
        <ul>
          <li>Criar e manter sua conta e o período de teste gratuito;</li>
          <li>Responder mensagens enviadas pelo formulário de contato;</li>
          <li>Enviar comunicações sobre o funcionamento da sua conta e da Plataforma;</li>
          <li>Melhorar a segurança e a qualidade do serviço.</li>
        </ul>

        <h2>3. Compartilhamento de dados</h2>
        <p>
          Não vendemos seus dados. Compartilhamos informações apenas com prestadores de serviço
          necessários para operar a Plataforma (infraestrutura em nuvem, envio de e-mail
          transacional e processamento de pagamentos), sempre sob obrigação de confidencialidade.
        </p>

        <h2>4. Armazenamento e segurança</h2>
        <p>
          Os dados são armazenados em infraestrutura Google Cloud / Firebase, com controles de
          acesso restritos por conta (tenant). Cada assistência técnica só acessa os próprios
          dados.
        </p>

        <h2>5. Seus direitos</h2>
        <p>
          Você pode solicitar a qualquer momento a confirmação, correção, exportação ou exclusão
          dos seus dados pessoais, entrando em contato pelo e-mail abaixo.
        </p>

        <h2>6. Retenção</h2>
        <p>
          Mantemos os dados enquanto sua conta estiver ativa. Após o cancelamento, os dados podem
          ser retidos por período limitado para cumprimento de obrigações legais antes de serem
          excluídos.
        </p>

        <h2>7. Contato</h2>
        <p>
          Dúvidas sobre esta política ou solicitações relacionadas aos seus dados podem ser
          enviadas para{" "}
          <a href="mailto:cleber.fdelgado@gmail.com">cleber.fdelgado@gmail.com</a>.
        </p>
      </div>

      <div className="blog-article-footer section-center">
        <div className="blog-cta-box">
          <h3>Quer organizar sua assistência técnica?</h3>
          <p>Teste o NextAssist grátis por 7 dias. Sem cartão de crédito.</p>
          <Link href="/demo" className="btn-primary">
            Começar teste grátis →
          </Link>
        </div>
      </div>
    </article>
  );
}
