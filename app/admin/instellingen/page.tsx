export default async function InstellingenPage() {
  return (
    <div className="p-8 max-w-xl">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Instellingen</h1>
        <p className="text-gray-sub text-sm mt-1">Configuratie</p>
      </div>
      <div className="bg-white border border-[#e8e4df] rounded-sm p-6">
        <h2 className="font-bold text-sm text-gray-dark mb-2">Stripe</h2>
        <p className="text-xs text-gray-sub leading-relaxed">
          Stripe sleutels worden beheerd via omgevingsvariabelen (<code>STRIPE_SECRET_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code>) in Vercel of <code>.env.local</code>. Ze worden hier niet getoond.
        </p>
      </div>
    </div>
  );
}
