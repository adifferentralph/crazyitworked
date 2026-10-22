import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VehicleSearch } from "@/components/marketplace/vehicle-search";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("vehicle search", () => {
  it("keeps a saved fitment while its edit-form labels are loading", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    const { container } = render(
      <VehicleSearch
        initialVehicle="saved-fitment-id"
        inputName="fitmentIds"
        makes={[]}
        vehicles={[]}
      />,
    );

    expect(container.querySelector<HTMLInputElement>('input[name="fitmentIds"]')).toHaveValue(
      "saved-fitment-id",
    );
  });

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

  it("searches model and year fields as the user types", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("modelId=camry-id")) {
        return {
          json: async () => ({
            years: [
              { id: "year-2020", year: 2020 },
              { id: "year-2019", year: 2019 },
            ],
          }),
          ok: true,
        };
      }
      if (url.includes("yearId=year-2019")) {
        return {
          json: async () => ({
            fitments: [
              { engine: null, engineId: null, id: "fitment-2019", trim: null, trimId: null },
            ],
          }),
          ok: true,
        };
      }
      return {
        json: async () => ({
          models: [
            { id: "camry-id", name: "Camry" },
            { id: "corolla-id", name: "Corolla" },
          ],
        }),
        ok: true,
      };
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

    fireEvent.focus(screen.getByPlaceholderText("Search make..."));
    fireEvent.click(screen.getByRole("option", { name: "Toyota" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Model" }), {
      target: { value: "cam" },
    });
    fireEvent.click(await screen.findByRole("option", { name: "Camry" }));

    const yearInput = screen.getByRole("combobox", { name: "Year" });
    await waitFor(() => expect(yearInput).not.toBeDisabled());
    fireEvent.change(yearInput, { target: { value: "2019" } });
    fireEvent.click(await screen.findByRole("option", { name: "2019" }));

    await waitFor(() => expect(screen.getByText("Vehicle selected")).toBeInTheDocument());
    expect(screen.getByDisplayValue("2019")).toHaveAttribute("role", "combobox");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("makeId=toyota-id&q=cam"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
