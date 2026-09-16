import { getAvatarColors, getAvatarInitial } from "@/lib/account/avatar";
import { cn } from "@/lib/utils";

export function LetterAvatar({
  className,
  email,
  name,
  size = "md",
  userId,
}: {
  className?: string;
  email?: string;
  name: string;
  size?: "sm" | "md" | "lg";
  userId: string;
}) {
  const colors = getAvatarColors(userId);
  const label = name.trim() || email?.trim() || "Account";

  return (
    <span
      aria-label={`${label} account`}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-body font-bold leading-none",
        colors.background,
        colors.foreground,
        size === "sm" && "size-5 text-[10px]",
        size === "md" && "size-8 text-sm",
        size === "lg" && "size-14 text-xl",
        className,
      )}
      role="img"
    >
      {getAvatarInitial(name, email)}
    </span>
  );
}
