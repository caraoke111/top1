import Link from "next/link";

// Página de retorno tras el pago (redirect_url de InfinitePay).
// La confirmación real la hace el webhook; acá solo agradecemos y volvemos.
export default function Obrigado() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div className="card-hard max-w-md rounded-2xl bg-cream-200 p-8">
        <p className="text-6xl">👑</p>
        <h1 className="mt-4 font-marker text-3xl">Pagamento recebido!</h1>
        <p className="mt-3 text-[color:var(--color-ink-soft)]">
          Assim que o provedor confirmar, seu lance sobe no ranking
          automaticamente. Pode levar alguns segundos.
        </p>
        <Link
          href="/"
          className="btn-hard mt-6 inline-block rounded-xl bg-ink px-6 py-3 font-bold text-cream"
        >
          Voltar ao ranking →
        </Link>
      </div>
    </main>
  );
}
