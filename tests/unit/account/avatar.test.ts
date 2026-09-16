import { describe, expect, it } from "vitest";

import {
  avatarPalette,
  getAvatarColors,
  getAvatarInitial,
  getAvatarPaletteIndex,
} from "@/lib/account/avatar";

describe("account avatar", () => {
  it("derives the display letter from the name with an email fallback", () => {
    expect(getAvatarInitial("Raphael Doe", "raphael@example.com")).toBe("R");
    expect(getAvatarInitial("  ", "buyer@example.com")).toBe("B");
  });

  it("keeps the same palette selection for the same user ID", () => {
    const userId = "0d8d7cb8-08db-4db8-ae0e-989dad938d8b";
    expect(getAvatarColors(userId)).toEqual(getAvatarColors(userId));
    expect(getAvatarPaletteIndex(userId)).toBeLessThan(avatarPalette.length);
  });

  it("varies palette selection across stable identifiers", () => {
    const colors = new Set(
      Array.from({ length: 24 }, (_, index) =>
        getAvatarPaletteIndex(`user-${index}`),
      ),
    );
    expect(colors.size).toBeGreaterThan(1);
  });
});
