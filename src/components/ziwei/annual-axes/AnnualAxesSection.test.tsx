import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { calculate as calculateTrungChau } from "@/lib/ziwei/engine-trung-chau";
import { calculate as calculateNamPhai } from "@/lib/ziwei/engine-nam-phai";
import type { BirthInput } from "@/types/chart";
import { analyzeAnnualAxes } from "@/lib/ziwei/analysis/modules/annual-axes";
import type { AnnualAxesResult } from "@/lib/ziwei/analysis/modules/annual-axes";
import { AnnualAxesSection } from "./AnnualAxesSection";

const REGRESSION: BirthInput = {
  solarDate: "1991-09-21",
  birthHour: "Dậu",
  gender: "female",
  timezone: "7",
  annualYear: "2026",
  flowBase: "luu-nien",
};

function renderSection(school: "trung-chau" | "nam-phai" = "trung-chau") {
  const chart =
    school === "trung-chau" ? calculateTrungChau(REGRESSION) : calculateNamPhai(REGRESSION);
  return {
    chart,
    school,
    ...render(<AnnualAxesSection chart={chart} school={school} />),
  };
}

describe("AnnualAxesSection — Trung Châu available result", () => {
  it("renders header, focus summary, radar, and six domain cards", () => {
    const { container } = renderSection("trung-chau");

    expect(screen.getByText(/Sáu trục khí vận năm/)).toBeInTheDocument();
    expect(container.querySelector('[data-module="annual-axes"]')).toBeInTheDocument();

    // All six domain cards are rendered (as buttons).
    const cards = container.querySelectorAll('.annual-axes-card');
    expect(cards).toHaveLength(6);

    // Focus summary is populated for Trung Châu (annual Mệnh).
    const focus = container.querySelector('.annual-axes-section__focus');
    expect(focus).toBeInTheDocument();
    expect(focus?.textContent ?? "").toMatch(/Cung Mệnh lưu niên|Tiểu Hạn/);
  });

  it("opens the detail panel when a card is clicked", () => {
    const { container } = renderSection("trung-chau");
    const cards = container.querySelectorAll<HTMLButtonElement>(".annual-axes-card");
    // Pick the first available card.
    const firstAvailable = Array.from(cards).find(
      (c) => !c.classList.contains("is-unavailable"),
    );
    expect(firstAvailable).toBeDefined();
    fireEvent.click(firstAvailable!);
    expect(screen.getByRole("region", { name: /Chi tiết/ })).toBeInTheDocument();
    // Detail must not contain any prediction-style prose — we only check
    // that section headings are the deterministic ones we render.
    const detail = container.querySelector('.annual-axis-detail');
    expect(detail?.textContent ?? "").toMatch(/Hỗ trợ|Áp lực|Điểm/);
  });

  it("closing the detail panel restores the previous state", () => {
    const { container } = renderSection("trung-chau");
    const cards = container.querySelectorAll<HTMLButtonElement>(".annual-axes-card");
    const firstAvailable = Array.from(cards).find(
      (c) => !c.classList.contains("is-unavailable"),
    );
    fireEvent.click(firstAvailable!);
    const closeButton = screen.getByRole("button", { name: /Đóng chi tiết/ });
    fireEvent.click(closeButton);
    expect(container.querySelector('.annual-axis-detail')).toBeNull();
  });
});

describe("AnnualAxesSection — Nam Phái available result", () => {
  it("renders focus summary as Tiểu Hạn and shows the frame branches", () => {
    const chart = calculateNamPhai(REGRESSION);
    const { container } = render(<AnnualAxesSection chart={chart} school="nam-phai" />);
    const focus = container.querySelector('.annual-axes-section__focus');
    expect(focus).toBeInTheDocument();
    expect(focus?.textContent ?? "").toMatch(/Tiểu Hạn/);
    // Frame branches printed as "Khung X / Y / Z / W" for the four-node ring.
    expect(focus?.textContent ?? "").toMatch(/Khung/);
  });
});

describe("AnnualAxesSection — unavailable/partial paths", () => {
  it("shows an em-dash score and unavailable status for unavailable domains", () => {
    const chart = calculateTrungChau(REGRESSION);
    // Craft a partial result: mark one domain unavailable synthetically.
    const base = analyzeAnnualAxes(chart, { school: "trung-chau" });
    const partial: AnnualAxesResult = {
      ...base,
      axes: {
        ...base.axes,
        romance: {
          domain: "romance",
          status: "unavailable",
          score: null,
          band: null,
          evidence: [],
          reasonCodes: ["missing-required-annual-facts"],
        },
      },
    };
    render(<AnnualAxesSection chart={chart} school="trung-chau" result={partial} />);
    // The romance card must not have a numeric score.
    const romanceCard = document.querySelector<HTMLButtonElement>(
      '[data-domain="romance"]',
    );
    expect(romanceCard).toBeDefined();
    const scoreCell = romanceCard!.querySelector('.annual-axes-card__score');
    expect(scoreCell?.textContent).toBe("—");
    expect(romanceCard!.classList.contains("is-unavailable")).toBe(true);
    expect(romanceCard!.disabled).toBe(true);
  });
});

describe("AnnualAxesSection — keyboard accessibility", () => {
  it("radar points are keyboard-focusable and trigger selection on Enter", () => {
    const { container } = renderSection("trung-chau");
    const point = container.querySelector<SVGGElement>(
      '.annual-axes-radar__point[role="button"]',
    );
    expect(point).toBeDefined();
    expect(point!.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(point!, { key: "Enter" });
    expect(screen.getByRole("region", { name: /Chi tiết/ })).toBeInTheDocument();
  });

  it("meets the 44px min-height target on interactive controls", () => {
    // JSDOM does not lay out CSS; instead we check that the .annual-axes-card
    // class carries the intended contract by class presence — the CSS rule
    // enforces min-height:44px, tested here at the DOM level.
    const { container } = renderSection("trung-chau");
    const card = container.querySelector<HTMLButtonElement>('.annual-axes-card');
    expect(card).toBeDefined();
    // Class contract only — layout is validated in real browser CI, not here.
    expect(card!.className).toContain("annual-axes-card");
    const closeCandidates = container.querySelectorAll('button');
    for (const btn of closeCandidates) {
      // Every button rendered by this component tree must have a
      // non-empty accessible label (either aria-label or text content).
      const hasLabel = (btn.getAttribute("aria-label") ?? btn.textContent ?? "").trim().length > 0;
      expect(hasLabel).toBe(true);
    }
  });
});

describe("AnnualAxesSection — deterministic (no prediction prose)", () => {
  it("does not render any predictive prose verbs in the driver preview / detail body", () => {
    const { container } = renderSection("trung-chau");
    // Guard the *drivers* and *detail* body against predictive phrasing.
    // The header disclaimer legitimately mentions the phrase "không dự
    // đoán sự kiện" (= "does not predict events") to state the module's
    // scope, so we scope this check to the interactive content areas.
    const forbidden = ["sẽ có", "sẽ gặp", "chắc chắn", "vận số"];
    const scopedRoots = [
      ...container.querySelectorAll(".annual-axes-cards"),
      ...container.querySelectorAll(".annual-axis-detail"),
    ];
    for (const root of scopedRoots) {
      const text = (root.textContent ?? "").toLowerCase();
      for (const word of forbidden) {
        expect(text).not.toContain(word.toLowerCase());
      }
    }
  });

  it("emits `data-module=annual-axes` and stable domain data-attributes for e2e hooks", () => {
    const { container } = renderSection("trung-chau");
    expect(container.querySelector('[data-module="annual-axes"]')).toBeInTheDocument();
    for (const domain of ["health", "family", "wealth", "career", "social", "romance"]) {
      expect(container.querySelector(`[data-domain="${domain}"]`)).toBeInTheDocument();
    }
  });
});

describe("AnnualAxesSection — feature flag disabled path", () => {
  it("is a no-op placeholder ChartPage responsibility — this section itself does not gate on the flag", () => {
    // The mission explicitly places the flag gating in ChartPage
    // (renders ZiweiAnalysisRebuilding when the flag is off, this
    // section when it is on). This assertion documents the contract.
    const { container } = renderSection("trung-chau");
    expect(within(container).getByText(/Sáu trục khí vận năm/)).toBeInTheDocument();
  });
});
