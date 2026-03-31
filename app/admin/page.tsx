import Link from "next/link";
import { createAdminClient } from "@/lib/supabase-admin";

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  const [
    { count: eventCount },
    { count: registrationCount },
    { count: orderCount },
    { count: donationCount },
    { count: newOrderCount },
    { count: sponsorRequestCount },
  ] = await Promise.all([
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase.from("registrations").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("donations").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("sponsor_requests").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Evenementen", value: eventCount ?? 0, href: "/admin/evenementen", color: "text-red-sportac" },
    { label: "Inschrijvingen", value: registrationCount ?? 0, href: "/admin/inschrijvingen", color: "text-red-sportac" },
    { label: "Bestellingen", value: orderCount ?? 0, href: "/admin/bestellingen", color: "text-red-sportac", badge: newOrderCount ? `${newOrderCount} nieuw` : undefined },
    { label: "Donaties", value: donationCount ?? 0, href: "/admin/donaties", color: "text-red-sportac" },
    { label: "Sponsor-aanvragen", value: sponsorRequestCount ?? 0, href: "/admin/sponsor-aanvragen", color: "text-red-sportac" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Dashboard</h1>
        <p className="text-gray-sub text-sm mt-1">Overzicht van alle campagneactiviteit</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-sm border border-[#e8e4df] p-5 hover:border-red-sportac transition-colors group"
          >
            <div className={`font-condensed font-black text-4xl ${stat.color} leading-none mb-1`}>
              {stat.value}
            </div>
            <div className="text-sm text-gray-sub">{stat.label}</div>
            {stat.badge && (
              <div className="mt-2 text-[11px] font-bold bg-red-sportac/10 text-red-sportac px-2 py-0.5 rounded-sm inline-block">
                {stat.badge}
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-bold text-sm text-gray-sub uppercase tracking-wider mb-3">Snelle acties</h2>
        <div className="flex gap-3 flex-wrap">
          <Link href="/admin/evenementen/nieuw" className="bg-red-sportac text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-red-600 transition-colors">
            + Evenement aanmaken
          </Link>
          <Link href="/admin/team/nieuw" className="bg-gray-dark text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-black transition-colors">
            + Teamlid toevoegen
          </Link>
          <Link href="/admin/sponsors/nieuw" className="bg-gray-dark text-white font-bold text-sm px-5 py-2.5 rounded-sm hover:bg-black transition-colors">
            + Sponsor toevoegen
          </Link>
        </div>
      </div>
    </div>
  );
}
