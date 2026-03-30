import Image from "next/image";
import { TeamMember } from "@/lib/types";

export function TeamCard({ member }: { member: TeamMember }) {
  return (
    <div className="bg-white rounded-sm overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-sportac z-10" />
      <div className="aspect-[3/4] relative bg-[#ddd8d0] overflow-hidden">
        {member.image_url ? (
          <Image
            src={member.image_url}
            alt={member.name}
            fill
            className="object-cover object-top"
            sizes="(max-width: 640px) 50vw, 20vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-20">
            👤
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="font-bold text-sm text-gray-dark">{member.name}</div>
        <div className="text-xs text-gray-sub mt-0.5">
          {member.discipline ?? member.role}
        </div>
      </div>
    </div>
  );
}
