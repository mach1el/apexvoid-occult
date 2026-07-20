import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tuViCss = readFileSync(
  resolve(process.cwd(), "src/styles/tu-vi.css"),
  "utf8",
);

describe("tu-vi.css layout", () => {
  it("proves the row/column placement for both desktop and stacked layouts", () => {
    const noSpaceCss = tuViCss.replace(/\s+/g, "");
    
    // Desktop layout
    expect(noSpaceCss).toContain(".shell>.palace-overview-section{grid-column:1/-1;grid-row:3;}");
    expect(noSpaceCss).toContain(".shell>.huyen-khi-preview-section{grid-column:1/-1;grid-row:4;min-width:0;}");
    expect(noSpaceCss).toContain(".shell>.trend-section{grid-column:1/-1;grid-row:5;}");

    // Stacked layout
    expect(noSpaceCss).toContain(".shell>.palace-overview-section{grid-column:1;grid-row:4;}");
    expect(noSpaceCss).toContain(".shell>.huyen-khi-preview-section{grid-column:1;grid-row:5;min-width:0;}");
    expect(noSpaceCss).toContain(".shell>.trend-section{grid-column:1;grid-row:6;}");
  });
});
