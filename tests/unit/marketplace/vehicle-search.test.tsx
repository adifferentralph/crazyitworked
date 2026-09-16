import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VehicleSearch } from "@/components/marketplace/vehicle-search";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("vehicle make search", () => {
  it("searches the cached server catalogue without loading every make initially", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        makes: [
          {
            id: "peugeot-id",
            isDiscontinued: false,
            label: "Peugeot",
            originCountry: "France",
          },
        ],
      }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <VehicleSearch
        makes={[
          {
            id: "toyota-id",
            isDiscontinued: false,
            label: "Toyota",
            originCountry: "Japan",
          },
        ]}
        vehicles={[]}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Search make..."), {
      target: { value: "peu" },
    });
    const option = await screen.findByRole("option", { name: "Peugeot" });
    fireEvent.click(option);

    expect(screen.getByPlaceholderText("Search make...")).toHaveValue("Peugeot");
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/vehicles/makes?q=peu",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );
  });
});
