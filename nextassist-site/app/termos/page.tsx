import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso — NextAssist",
  description: "Termos de uso da plataforma NextAssist.",
  alternates: { canonical: "/termos" },
};

export default function TermosPage() {
  return (
    <article className="blog-article">
      <div className="blog-article-header">
        <div className="section-center">
          <Link href="/" className="blog-back">
            ← Voltar ao site
          </Link>
          <h1>Termos de Uso</h1>
          <div className="blog-article-meta">
            <span>Última atualização: julho de 2026</span>
          </div>
        </div>
      </div>

      <div className="blog-article-content section-center">
        <p>
          Estes Termos de Uso regem o acesso e a utilização da plataforma NextAssist
          (&quot;Plataforma&quot;), um sistema de gestão para assistências técnicas de celular
          oferecido no modelo SaaS (Software as a Service). Ao criar uma conta ou utilizar a
          Plataforma, você concorda com estes termos.
        </p>

        <h2>1. Cadastro e conta</h2>
        <p>
          Para usar o NextAssist é necessário criar uma conta com dados verdadeiros e mantê-los
          atualizados. Você é responsável por manter a confidencialidade da sua senha e por toda
          atividade realizada na sua conta.
        </p>

        <h2>2. Período de teste gratuito</h2>
        <p>
          Novas contas têm direito a 7 dias de teste gratuito, sem necessidade de cartão de
          crédito. Ao final do período de teste, a continuidade do uso está condicionada à
          contratação de um dos planos pagos.
        </p>

        <h2>3. Planos e pagamento</h2>
        <p>
          Os planos, preços e recursos disponíveis estão descritos na página de Planos do site.
          O pagamento é processado por parceiro de pagamentos e cobrado de forma recorrente,
          conforme o plano escolhido. Você pode cancelar a assinatura a qualquer momento, sem
          multa, e o acesso permanece ativo até o fim do período já pago.
        </p>

        <h2>4. Uso permitido</h2>
        <p>
          A Plataforma deve ser usada apenas para fins lícitos relacionados à gestão da sua
          assistência técnica. É proibido tentar acessar dados de outros clientes (tenants),
          realizar engenharia reversa da Plataforma ou utilizá-la para fins fraudulentos.
        </p>

        <h2>5. Disponibilidade e suporte</h2>
        <p>
          Buscamos manter a Plataforma disponível de forma contínua, mas não garantimos
          disponibilidade ininterrupta. Manutenções programadas podem ocasionar indisponibilidade
          temporária, com aviso prévio quando possível.
        </p>

        <h2>6. Dados e propriedade</h2>
        <p>
          Os dados inseridos por você na Plataforma (clientes, ordens de serviço, estoque,
          financeiro) são de sua propriedade. Tratamos esses dados conforme nossa{" "}
          <Link href="/privacidade">Política de Privacidade</Link>.
        </p>

        <h2>7. Alterações destes termos</h2>
        <p>
          Podemos atualizar estes Termos de Uso periodicamente. Alterações relevantes serão
          comunicadas por e-mail ou aviso na Plataforma.
        </p>

        <h2>8. Contato</h2>
        <p>
          Dúvidas sobre estes termos podem ser enviadas para{" "}
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
