export default function MarketplaceLoading() {
  return (
    <div className="container-page min-h-[70vh] animate-pulse py-10" aria-label="Loading marketplace">
      <div className="h-4 w-40 rounded bg-stone-200" />
      <div className="mt-4 h-12 max-w-2xl rounded bg-stone-200" />
      <div className="mt-8 h-40 rounded-xl bg-stone-100" />
      <div className="mt-10 grid gap-5 lg:grid-cols-[15rem_1fr]">
        <div className="h-96 rounded-lg bg-stone-100" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="h-96 rounded-lg bg-stone-100" key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}