import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="min-h-screen bg-[#1c2b4a] flex items-center justify-center px-4">
      <div className="bg-white rounded-sm w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <span className="font-condensed font-black text-3xl text-red-sportac">S86</span>
          <p className="text-sm text-gray-sub mt-1">Admin paneel</p>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
            {error === "credentials" ? "Verkeerd e-mailadres of wachtwoord." : "Vul alle velden in."}
          </div>
        )}

        <form action={signIn} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">E-mailadres</label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Wachtwoord</label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full border border-[#e8e4df] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-red-sportac"
            />
          </div>
          <button
            type="submit"
            className="bg-red-sportac text-white font-bold py-2.5 rounded-sm hover:bg-red-600 transition-colors text-sm mt-2"
          >
            Inloggen
          </button>
        </form>
      </div>
    </div>
  );
}
