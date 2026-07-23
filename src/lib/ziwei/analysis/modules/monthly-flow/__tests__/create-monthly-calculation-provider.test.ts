import { describe, expect, it, vi } from "vitest";
import * as namPhaiEngine from "@/lib/ziwei/engine-nam-phai";
import * as trungChauEngine from "@/lib/ziwei/engine-trung-chau";
import { createMonthlyCalculationProvider } from "../create-monthly-calculation-provider";
import { analyzeMonthlyFlowProduction } from "../v0.1-production";
import { REGRESSION_BIRTH } from "./test-providers";

describe("createMonthlyCalculationProvider", () => {
  it("creates Nam Phái provider with matching school", () => {
    const provider = createMonthlyCalculationProvider("nam-phai");
    expect(provider).not.toBeNull();
    expect(provider!.school).toBe("nam-phai");
    expect(provider!.tuHoaTargets("Giáp").length).toBeGreaterThan(0);
    expect(provider!.stemBranchForLunarMonth("Giáp", 1)).toEqual(
      namPhaiEngine.stemBranchForLunarMonth("Giáp", 1),
    );
    expect("locTonIndex" in provider!).toBe(false);
  });

  it("creates Trung Châu provider with matching school", () => {
    const provider = createMonthlyCalculationProvider("trung-chau");
    expect(provider).not.toBeNull();
    expect(provider!.school).toBe("trung-chau");
    expect(provider!.tuHoaTargets("Ất").length).toBeGreaterThan(0);
    expect(provider!.stemBranchForLunarMonth("Ất", 3)).toEqual(
      trungChauEngine.stemBranchForLunarMonth("Ất", 3),
    );
    expect("locTonIndex" in provider!).toBe(false);
  });

  it("retains method binding for tuHoaTargets", () => {
    const provider = createMonthlyCalculationProvider("trung-chau");
    expect(provider).not.toBeNull();
    const fn = provider!.tuHoaTargets;
    expect(() => fn("Bính")).not.toThrow();
    expect(fn("Bính").length).toBeGreaterThan(0);
  });

  it("does not invoke locTonIndex during production analysis", () => {
    const spyNp = vi.spyOn(namPhaiEngine, "locTonIndex");
    const spyTc = vi.spyOn(trungChauEngine, "locTonIndex");
    const chart = namPhaiEngine.calculate(REGRESSION_BIRTH);
    analyzeMonthlyFlowProduction(chart, { school: "nam-phai" });
    const chartTc = trungChauEngine.calculate(REGRESSION_BIRTH);
    analyzeMonthlyFlowProduction(chartTc, { school: "trung-chau" });
    expect(spyNp).not.toHaveBeenCalled();
    expect(spyTc).not.toHaveBeenCalled();
    spyNp.mockRestore();
    spyTc.mockRestore();
  });
});
