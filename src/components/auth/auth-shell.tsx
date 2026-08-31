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
    <section className="bg-white py-4 sm:py-8 lg:py-16">
      <div className="container-page grid overflow-hidden border-stone-200 bg-[#fffdf9] sm:rounded-2xl sm:border lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="hidden bg-black px-10 py-14 text-white lg:block lg:px-12 lg:py-16">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#fdba74]">
            Twenty-Two Parts
          </p>
          <h1 className="mt-5 max-w-md text-4xl font-semibold leading-tight xl:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-stone-300">
            {description}
          </p>

          <ul className="mt-10 grid gap-4">
            {assurances.map(({ icon: Icon, text }) => (
              <li
                className="flex items-center gap-3 text-sm text-stone-200"
                key={text}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-[#fdba74]">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </aside>

        <div className="px-1 py-3 sm:px-8 sm:py-8 lg:px-16 lg:py-14">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
          {children}
        </div>
      </div>
    </section>
  );
}
