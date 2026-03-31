import { TeamForm } from "../_TeamForm";
import { createTeamMember } from "../actions";

export default function NieuwTeamlidPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-condensed font-black italic text-4xl text-gray-dark">Teamlid toevoegen</h1>
      </div>
      <TeamForm action={createTeamMember} />
    </div>
  );
}
