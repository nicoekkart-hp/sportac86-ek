import { createAdminClient } from "@/lib/supabase-admin";
import { Sale } from "@/lib/types";
import { PackGroupForm } from "../_PackGroupForm";
import { createPackGroup } from "../actions";

export default async function NieuwPackGroepPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("sales").select("*").order("sort_order");
  const sales: Sale[] = data ?? [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Pack groep toevoegen</h1>
      </div>
      <PackGroupForm sales={sales} action={createPackGroup} />
    </div>
  );
}
