import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Política de Cookies — EgoTop",
};

export default function Cookies() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/"
        className="font-mono text-xs text-[color:var(--color-ink-soft)] hover:text-ink"
      >
        ← Voltar ao ranking
      </Link>

      <h1 className="mt-4 font-marker text-4xl">Política de Cookies</h1>
      <p className="mt-2 text-sm text-[color:var(--color-ink-soft)]">
        Última atualização: 26 de agosto de 2026
      </p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
        <section>
          <h2 className="font-marker text-xl">O que usamos</h2>
          <p className="mt-2">
            O {SITE.name} usa o mínimo de armazenamento no seu navegador. Não
            usamos cookies de publicidade nem rastreamento de terceiros.
          </p>
        </section>

        <section>
          <h2 className="font-marker text-xl">Armazenamento essencial</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-ink text-left font-mono text-[11px] uppercase">
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2">Para quê</th>
                </tr>
              </thead>
              <tbody className="align-top">
                <tr className="border-b border-line">
                  <td className="py-2 pr-3 font-mono">lt_sid</td>
                  <td className="py-2 pr-3">localStorage</td>
                  <td className="py-2">
                    Código aleatório para contar quantas pessoas estão online
                    (“ao vivo”). Não identifica você.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            Esse item é <b>essencial</b> para uma função do site e não requer
            consentimento. Se você limpar os dados do navegador, ele é recriado
            na próxima visita.
          </p>
        </section>

        <section>
          <h2 className="font-marker text-xl">Terceiros</h2>
          <p className="mt-2">
            Ao ir para o pagamento, você acessa o ambiente da{" "}
            <b>InfinitePay</b>, que pode usar seus próprios cookies conforme a
            política dela. A hospedagem (Vercel) pode registrar dados técnicos
            de acesso para segurança e funcionamento.
          </p>
        </section>

        <section>
          <h2 className="font-marker text-xl">Como controlar</h2>
          <p className="mt-2">
            Você pode apagar o armazenamento local a qualquer momento nas
            configurações do seu navegador. Como usamos apenas o essencial, não
            há banner de consentimento a gerenciar.
          </p>
        </section>
      </div>

      <p className="mt-10 border-t border-line pt-4 text-xs text-[color:var(--color-ink-soft)]">
        Veja também nossa{" "}
        <Link href="/privacidade" className="underline hover:text-ink">
          Política de Privacidade
        </Link>
        .
      </p>
    </main>
  );
}
