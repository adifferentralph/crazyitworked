export const avatarPalette = [
  { background: "bg-red-700", foreground: "text-white" },
  { background: "bg-blue-700", foreground: "text-white" },
  { background: "bg-emerald-700", foreground: "text-white" },
  { background: "bg-purple-700", foreground: "text-white" },
  { background: "bg-orange-700", foreground: "text-white" },
  { background: "bg-teal-700", foreground: "text-white" },
  { background: "bg-indigo-700", foreground: "text-white" },
  { background: "bg-amber-400", foreground: "text-stone-950" },
] as const;

export function getAvatarInitial(name: string, email?: string) {
  const source = name.trim() || email?.trim() || "";
  return Array.from(source)[0]?.toLocaleUpperCase() ?? "?";
}

export function getAvatarPaletteIndex(userId: string) {
  let hash = 2166136261;
  for (const character of userId) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % avatarPalette.length;
}

export function getAvatarColors(userId: string) {
  return avatarPalette[getAvatarPaletteIndex(userId)] ?? avatarPalette[0];
}
