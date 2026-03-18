import type { RelationshipHealth } from "@/lib/relationship-status";

const colorMap: Record<RelationshipHealth["state"], string> = {
  overdue: "bg-[#f8d2ca] text-[#7c291d]",
  "due-soon": "bg-[#f4e1af] text-[#7b5a10]",
  "on-track": "bg-[#cfe6d9] text-[#214c35]",
};

export function StatusPill({ health }: Readonly<{ health: RelationshipHealth }>) {
  return (
    <div className={`inline-flex rounded-full px-3 py-2 text-sm font-semibold ${colorMap[health.state]}`}>
      {health.label}
    </div>
  );
}