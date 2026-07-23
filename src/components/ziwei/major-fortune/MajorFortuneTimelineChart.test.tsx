import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import { calculate as calculateTrungChau } from "@/lib/ziwei/engine-trung-chau";
import type { BirthInput } from "@/types/chart";
import { analyzeMajorFortuneTimelineV03 } from "@/lib/ziwei/analysis/modules/major-fortune/v0.3-ordinal-timeline";
import { MajorFortuneSection } from "./MajorFortuneSection";
import { MajorFortuneTimelineChart } from "./MajorFortuneTimelineChart";

const REGRESSION: BirthInput = {
  solarDate: "1991-09-21",
  birthHour: "Dậu",
  gender: "female",
  timezone: "7",
  annualYear: "2026",
  flowBase: "luu-nien",
};

describe("MajorFortuneTimelineChart", () => {
  it("renders Y-axis 0–100, both series, and Chính vận once", () => {
    const chart = calculateTrungChau(REGRESSION);
    const timeline = analyzeMajorFortuneTimelineV03(chart, { school: "trung-chau" });
    const current = timeline.currentCycleIndex!;
    const { container } = render(
      <MajorFortuneTimelineChart
        timeline={timeline}
        selectedCycleIndex={current}
        onSelectCycle={() => {}}
      />,
    );

    for (const t of [0, 20, 40, 60, 80, 100]) {
      expect(container.querySelector(".mf-timeline__y-axis")?.textContent).toContain(String(t));
    }
    expect(container.querySelectorAll(".mf-timeline__bar-total").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".mf-timeline__bar-base").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chính vận")).toHaveLength(1);
    expect(container.querySelector("[data-testid='mf-timeline-scroll']")).not.toBeNull();

    for (const p of timeline.points) {
      expect(container.textContent).toContain(p.ageLabel);
    }

    const html = container.innerHTML;
    expect(html).not.toMatch(/SRC-MF-|CLM-MF-|physicalFactId|evidenceClusterId/);
  });

  it("supports keyboard activation of another cycle", () => {
    const chart = calculateTrungChau(REGRESSION);
    const timeline = analyzeMajorFortuneTimelineV03(chart, { school: "trung-chau" });
    const selected: number[] = [];
    const other = timeline.points.find((p) => !p.isCurrentCycle)!;
    render(
      <MajorFortuneTimelineChart
        timeline={timeline}
        selectedCycleIndex={timeline.currentCycleIndex}
        onSelectCycle={(id) => selected.push(id)}
      />,
    );
    const hit = screen.getByRole("button", {
      name: new RegExp(`${other.ageLabel} tuổi`),
    });
    hit.focus();
    fireEvent.keyDown(hit, { key: "Enter" });
    expect(selected).toContain(other.cycleIndex);
  });
});

describe("MajorFortuneSection timeline integration", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("renders timeline and selects current cycle by default", () => {
    const chart = calculateTrungChau(REGRESSION);
    const timeline = analyzeMajorFortuneTimelineV03(chart, { school: "trung-chau" });
    const current = timeline.points.find((p) => p.isCurrentCycle)!;
    const { container } = render(<MajorFortuneSection chart={chart} school="trung-chau" />);

    expect(screen.getByLabelText("Đại Vận V0.3")).toHaveAttribute("data-version", "0.3.2");
    expect(screen.getByText("Chính vận")).toBeInTheDocument();
    expect(container.querySelector(".mf-timeline__legend")?.textContent).toContain(
      "Tổng điểm V0.3",
    );
    expect(container.querySelector(".mf-timeline__legend")?.textContent).toContain("Nền ba trụ");
    expect(
      screen.getAllByText(new RegExp(`${current.startAge}–${current.endAge}`)).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/Đang xem:/)).not.toBeInTheDocument();
  });

  it("clicking another cycle updates summary and pillars; marker stays", () => {
    const chart = calculateTrungChau(REGRESSION);
    const timeline = analyzeMajorFortuneTimelineV03(chart, { school: "trung-chau" });
    const other = timeline.points.find((p) => !p.isCurrentCycle)!;
    const { container } = render(<MajorFortuneSection chart={chart} school="trung-chau" />);

    const hit = screen.getByRole("button", {
      name: new RegExp(`${other.ageLabel} tuổi`),
    });
    fireEvent.click(hit);

    expect(screen.getByText(`Đang xem: ${other.startAge}–${other.endAge}`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Về chính vận" })).toBeInTheDocument();
    expect(screen.getAllByText("Chính vận")).toHaveLength(1);

    expect(container.querySelectorAll(".mf-v03__pillars [role='listitem']").length).toBe(4);

    fireEvent.click(screen.getByRole("button", { name: "Về chính vận" }));
    expect(screen.queryByText(/Đang xem:/)).not.toBeInTheDocument();
  });

  it("Nam Phái partial points render safely", () => {
    const chart = calculateNamPhai(REGRESSION);
    render(<MajorFortuneSection chart={chart} school="nam-phai" />);
    expect(screen.getAllByText(/3\/4 trụ|Tứ Hóa chưa khả dụng/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Đại Vận V0.3")).toBeInTheDocument();
  });
});
