import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { generateBaziChart } from "@/lib/bazi/bazi-engine";
import { BaziChart } from "./BaziChart";

describe("BaziChart", () => {
  const chart = generateBaziChart(new Date(Date.UTC(2024, 1, 4, 9, 0, 0)), 105.8, 420, "M");
  const pillarKeys = ["year", "month", "day", "hour"] as const;

  it("renders all 4 pillars", () => {
    render(<BaziChart chart={chart} />);
    for (const key of pillarKeys) {
      expect(screen.getByTestId(`pillar-column-${key}`)).toBeInTheDocument();
    }
  });

  it("labels the day pillar as Nhật Chủ", () => {
    render(<BaziChart chart={chart} />);
    expect(within(screen.getByTestId("pillar-column-day")).getByText("Nhật Chủ")).toBeInTheDocument();
  });

  it("shows at least one hidden stem with its role visible, in every pillar", () => {
    render(<BaziChart chart={chart} />);
    for (const key of pillarKeys) {
      const col = within(screen.getByTestId(`pillar-column-${key}`));
      expect(col.getAllByText(/Bản khí|Trung khí|Dư khí/).length).toBeGreaterThan(0);
    }
  });

  it("shows a life-stage value in every pillar", () => {
    render(<BaziChart chart={chart} />);
    for (const key of pillarKeys) {
      const col = within(screen.getByTestId(`pillar-column-${key}`));
      expect(col.getByTestId("life-stage").textContent).toBeTruthy();
    }
  });

  it("renders one luck-pillar tile per chart.luck.pillars entry", () => {
    render(<BaziChart chart={chart} />);
    expect(screen.getAllByTestId("luck-pillar-tile")).toHaveLength(chart.luck.pillars.length);
  });
});
