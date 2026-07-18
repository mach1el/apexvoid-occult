import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import type { BirthInput } from "@/types/chart";
import { PalaceOverviewRadar } from "./PalaceOverviewRadar";

const REGRESSION: BirthInput = {
  solarDate: "1991-09-21",
  birthHour: "Dậu",
  gender: "female",
  timezone: "7",
  annualYear: "2026",
  flowBase: "luu-nien",
};

function renderRadar() {
  const chart = calculateNamPhai(REGRESSION);
  return render(<PalaceOverviewRadar chart={chart} school="nam-phai" />);
}

describe("PalaceOverviewRadar", () => {
  it("renders the renamed title and hides raw engine version by default", () => {
    const { container } = renderRadar();
    expect(screen.getByText("Cấu trúc 12 cung")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/1\.0\.0-experimental/);
    expect(container.textContent).not.toMatch(/palace-overview-v1/);
  });

  it("opens the detail panel on click and shows evidence groups A-G", () => {
    const { container } = renderRadar();
    const point = container.querySelector(".palace-overview-radar__point")!;
    fireEvent.click(point);

    const detail = container.querySelector(".palace-overview-detail")!;
    expect(detail).not.toBeNull();
    const headings = within(detail as HTMLElement)
      .getAllByRole("heading", { level: 5 })
      .map((h) => h.textContent);
    for (const prefix of ["A.", "B.", "C.", "D.", "E.", "F.", "G."]) {
      expect(headings.some((h) => h?.startsWith(prefix))).toBe(true);
    }
  });

  it("opens the detail panel via keyboard (Enter) on a focused radar point", () => {
    const { container } = renderRadar();
    const point = container.querySelector(".palace-overview-radar__point")!;
    fireEvent.keyDown(point, { key: "Enter" });
    expect(container.querySelector(".palace-overview-detail")).not.toBeNull();
  });

  it("moves profileId/version behind a collapsed 'Thông tin mô hình' section", () => {
    const { container } = renderRadar();
    const point = container.querySelector(".palace-overview-radar__point")!;
    fireEvent.click(point);

    const details = screen.getByText("Thông tin mô hình").closest("details");
    expect(details).not.toBeNull();
    expect(details?.textContent).toMatch(/palace-overview-v1/);
  });

  it("localizes the tooltip band label instead of the raw English band string", () => {
    const { container } = renderRadar();
    const point = container.querySelector(".palace-overview-radar__point")!;
    fireEvent.mouseEnter(point);
    const tooltip = container.querySelector(".palace-overview-radar__tooltip")!;
    expect(tooltip.textContent).not.toMatch(/\b(low|guarded|balanced|supportive|strong)\b/);
  });
});
