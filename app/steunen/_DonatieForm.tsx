"use client";

export function DonatieForm() {
  return (
    <form action="/api/checkout/donatie" method="POST" className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-semibold mb-2">Bedrag</label>
        <div className="flex gap-2 flex-wrap mb-2">
          {[5, 10, 25, 50].map((amount) => (
            <button
              key={amount}
              type="button"
              className="border border-[#e8e4df] rounded-sm px-4 py-2 text-sm font-semibold hover:border-red-sportac hover:text-red-sportac transition-colors"
              onClick={(e) => {
                const form = (e.currentTarget as HTMLElement).closest("form")!;
                (form.querySelector('input[name="amount_euros"]') as HTMLInputElement).value = String(amount);
              }}
            >
              €{amount}
            </button>
          ))}
        </div>
        <input
          type="number"
          name="amount_euros"
          required
          min={1}
          step={1}
          className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
          placeholder="Of vul zelf een bedrag in (€)"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Naam</label>
        <input type="text" name="name" required className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" placeholder="Jouw naam" />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">E-mailadres</label>
        <input type="email" name="email" required className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac" placeholder="jouw@email.be" />
      </div>
      <button type="submit" className="bg-red-sportac text-white font-bold py-3 rounded-sm hover:bg-red-600 transition-colors text-sm">
        Betaal veilig via Stripe
      </button>
    </form>
  );
}
