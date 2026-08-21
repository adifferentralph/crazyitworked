export default function PartLoading() {
  return <section className="min-h-[70vh] bg-white py-10 sm:py-14"><div className="container-page grid animate-pulse gap-10 lg:grid-cols-2" aria-busy="true" aria-label="Loading part"><div className="aspect-[4/3] rounded-lg bg-stone-100" /><div><div className="h-5 w-28 rounded bg-stone-200" /><div className="mt-5 h-12 rounded bg-stone-200" /><div className="mt-5 h-9 w-44 rounded bg-stone-200" /><div className="mt-8 h-48 rounded bg-stone-100" /></div></div></section>;
}
