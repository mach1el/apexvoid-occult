import fs from "node:fs";
import path from "node:path";
import { RULE_SEED_DIR } from "../paths";
import { loadRuleSeed } from "../load-rule-seed";
import { validateFixtureMaterialization } from "../validate-fixture-materialization";

function run() {
  const data = loadRuleSeed();
  if (!validateFixtureMaterialization(data).valid) {
    console.error("Cannot export workbook: validation failed.");
    process.exit(1);
  }
  
  let content = "# Huyền Khí Expert Review Workbook\n\n";
  
  data.batches.batches.forEach((b: any) => {
    content += `## Batch: ${b.name} (${b.batchId})\n\n`;
    b.fixtureIds.forEach((fid: string) => {
       const fixture = data.fixtures.fixtures.find((f: any) => f.fixtureId === fid);
       content += `### Fixture: ${fid}\n`;
       content += `- Maturity: ${fixture?.maturity || "unknown"}\n`;
       content += `- Rationale: ${fixture?.rationale || ""}\n\n`;
    });
  });
  
  fs.writeFileSync(path.join(RULE_SEED_DIR, "reviewer-workbook.md"), content);
  console.log("Workbook exported");
}
run();
