import type { ReactNode } from "react";

export function SellerShell({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="min-h-[70vh] bg-stone-50 py-8 sm:py-12">
      <div className="container-page">
        <div className="border-b border-stone-200 pb-7">
          <h1 className="text-3xl font-semibold text-stone-950 sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">{description}</p>
        </div>
        <div className="py-7">{children}</div>
      </div>
    </section>
  );
}