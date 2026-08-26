import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Política de Privacidade — LanceTop",
};

export default function Privacidade() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/"
        className="font-mono text-xs text-[color:var(--color-ink-soft)] hover:text-ink"
      >
        ← Voltar ao ranking
      </Link>

      <h1 className="mt-4 font-marker text-4xl">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-[color:var(--color-ink-soft)]">
        Última atualização: 26 de agosto de 2026
      </p>

      <div className="prose-lt mt-8 space-y-6 text-[15px] leading-relaxed">
        <Section title="1. Quem somos">
          <p>
            {SITE.name} é um ranking de criadores onde a posição é definida por
            lances pagos. Este site é operado pelo responsável do projeto (o
            “Operador”). Para dúvidas sobre privacidade:{" "}
            <b>contato@[seu-domínio]</b>.
          </p>
        </Section>

        <Section title="2. Quais dados coletamos">
          <p>Coletamos o mínimo necessário para o ranking funcionar:</p>
          <ul>
            <li>
              <b>Dados de perfil que você envia</b>: seu @ (usuário), nome
              exibido, bio, foto (URL), país, categoria e links. São
              <b> públicos</b> por natureza — aparecem no ranking.
            </li>
            <li>
              <b>Valor do lance</b> e status do pagamento.
            </li>
            <li>
              <b>Identificador de sessão</b>: um código aleatório guardado no seu
              navegador para contar quantas pessoas estão online (não identifica
              você pessoalmente).
            </li>
            <li>
              <b>Eventos de clique</b> (contagem agregada), para os widgets do
              ranking.
            </li>
          </ul>
          <p>
            <b>Não</b> criamos conta, <b>não</b> pedimos senha e <b>não</b>{" "}
            armazenamos dados do seu cartão ou chave Pix.
          </p>
        </Section>

        <Section title="3. Pagamentos">
          <p>
            Os pagamentos são processados por <b>InfinitePay</b> (CloudWalk). Ao
            pagar, você é direcionado ao ambiente seguro deles, que trata os
            dados financeiros. O {SITE.name} recebe apenas a confirmação do
            pagamento (aprovado/valor) para atualizar o ranking. Consulte a
            política de privacidade da InfinitePay para o tratamento desses
            dados.
          </p>
        </Section>

        <Section title="4. Como usamos os dados">
          <ul>
            <li>Exibir e ordenar o ranking.</li>
            <li>Confirmar pagamentos e aplicar o lance.</li>
            <li>Gerar métricas públicas (mais clicado, reinado, etc.).</li>
            <li>Prevenir fraude e abuso.</li>
          </ul>
          <p>Não vendemos seus dados nem enviamos spam.</p>
        </Section>

        <Section title="5. Compartilhamento">
          <p>
            Só compartilhamos dados com o provedor de pagamento (InfinitePay) e
            a infraestrutura que hospeda o site (Vercel) e o banco de dados
            (Neon), estritamente para operar o serviço. Podemos divulgar dados
            se exigido por lei.
          </p>
        </Section>

        <Section title="6. Seus direitos (LGPD)">
          <p>
            Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você
            pode solicitar acesso, correção ou exclusão dos seus dados de
            perfil. Como o conteúdo é público, a remoção retira seu perfil do
            ranking. Envie o pedido para <b>contato@[seu-domínio]</b>.
          </p>
        </Section>

        <Section title="7. Retenção">
          <p>
            Mantemos os dados de perfil enquanto você estiver no ranking. O
            identificador de sessão expira sozinho. Registros de pagamento podem
            ser mantidos pelo prazo legal aplicável.
          </p>
        </Section>

        <Section title="8. Alterações">
          <p>
            Podemos atualizar esta política. Mudanças relevantes serão indicadas
            pela data de “última atualização” acima.
          </p>
        </Section>
      </div>

      <p className="mt-10 border-t border-line pt-4 text-xs text-[color:var(--color-ink-soft)]">
        Veja também nossa{" "}
        <Link href="/cookies" className="underline hover:text-ink">
          Política de Cookies
        </Link>
        .
      </p>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-marker text-xl">{title}</h2>
      <div className="mt-2 space-y-2 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}
