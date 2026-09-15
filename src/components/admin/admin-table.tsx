import { Search } from "lucide-react";

export function AdminSearch({
  defaultValue,
  label = "Search",
  placeholder,
}: {
  defaultValue?: string;
  label?: string;
  placeholder: string;
}) {
  return (
    <form className="mb-5 flex gap-2" method="get" role="search">
      <label className="sr-only" htmlFor="admin-search">{label}</label>
      <div className="relative min-w-0 flex-1">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
        <input
          className="h-11 w-full rounded-md border border-stone-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-red-100"
          defaultValue={defaultValue}
          id="admin-search"
          name="q"
          placeholder={placeholder}
          type="search"
        />
      </div>
      <button className="h-11 rounded-md bg-stone-950 px-4 text-sm font-bold text-white hover:bg-primary" type="submit">Search</button>
    </form>
  );
}

export function AdminTable({
  columns,
  emptyMessage,
  rows,
}: {
  columns: readonly string[];
  emptyMessage: string;
  rows: readonly (readonly React.ReactNode[])[];
}) {
  if (rows.length === 0) {
    return <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-600">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-600">
          <tr>{columns.map((column) => <th className="border-b border-stone-200 px-4 py-3 font-bold" key={column}>{column}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-stone-100 text-stone-700">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{row.map((cell, cellIndex) => <td className="px-4 py-3 align-top" key={cellIndex}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminStatus({ value }: { value: string }) {
  return <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">{value.replaceAll("_", " ")}</span>;
}
