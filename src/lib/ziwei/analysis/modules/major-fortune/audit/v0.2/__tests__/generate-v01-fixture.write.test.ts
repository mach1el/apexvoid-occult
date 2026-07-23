import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildMajorFortuneV01FrozenControlCases } from "../v01-frozen-control";

const ENABLED = process.env.MAJOR_FORTUNE_V02_GENERATE_V01_FIXTURE === "1";
const FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/v01-frozen-control.e57cf2c.json",
);

describe.runIf(ENABLED)("generate V0.1 frozen control fixture", () => {
  it("writes deterministic fixture from current V0.1 (base e57cf2c)", () => {
    const cases = buildMajorFortuneV01FrozenControlCases();
    const payload = {
      frozenFromBaseSha: "e57cf2c87228e4adc41f211ce16c8c8e6d10f4e2",
      generatedNote:
        "Captured from V0.1 analyzeMajorFortune; V0.1 module sources unchanged since base SHA.",
      cases,
    };
    mkdirSync(dirname(FIXTURE), { recursive: true });
    const body = `${JSON.stringify(payload, null, 2)}\n`;
    writeFileSync(FIXTURE, body);
    const again = `${JSON.stringify(payload, null, 2)}\n`;
    expect(again).toEqual(readFileSync(FIXTURE, "utf8"));
  });
});
