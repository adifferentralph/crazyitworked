import { BadgeCheck, PackageCheck, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

const assurances = [
  { icon: ShieldCheck, text: "Secure account access" },
  { icon: BadgeCheck, text: "Clear buyer and supplier roles" },
  { icon: PackageCheck, text: "Vehicle-first parts sourcing" },
] as const;

export function AuthShell({
  children,
  eyebrow,
  title,
  description,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="bg-white py-12 sm:py-16 lg:py-20">
      <div className="container-page grid overflow-hidden rounded-2xl border border-stone-200 bg-[#fffdf9] lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="bg-black px-6 py-10 text-white sm:px-10 lg:px-12 lg:py-16">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#fdba74]">
            Twenty-Two Parts
          </p>
          <h1 className="mt-5 max-w-md text-4xl font-semibold leading-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-stone-300">{description}</p>

          <ul className="mt-10 grid gap-4">
            {assurances.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-stone-200">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-[#fdba74]">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </aside>

        <div className="px-6 py-10 sm:px-10 lg:px-16 lg:py-16">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
          {children}
        </div>
      </div>
    </section>
  );
}
