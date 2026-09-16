import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export function AccountMenuRow({
  description,
  href,
  icon: Icon,
  label,
}: {
  description?: string;
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      className="flex min-h-16 items-center gap-4 border-b border-stone-200 px-4 last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      href={href}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-stone-100 text-primary">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-stone-950">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-5 text-stone-500">
            {description}
          </span>
        ) : null}
      </span>
      <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-stone-400" />
    </Link>
  );
}
