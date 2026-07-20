import { loadRuleSeed } from "../load-rule-seed";
import { validateTopicCoverage } from "../validate-topic-coverage";
import { validateExtractions } from "../validate-extractions";
import { validateCandidateRules } from "../validate-candidate-rules";
import { validateFixtureMaterialization } from "../validate-fixture-materialization";

function run() {
  const data = loadRuleSeed();
  
  const results = [
    validateTopicCoverage(data),
    validateExtractions(data),
    validateCandidateRules(data),
    validateFixtureMaterialization(data)
  ];
  
  let hasErrors = false;
  results.forEach(r => {
    if (!r.valid) {
      hasErrors = true;
      r.issues.forEach(i => console.error(`[${i.code}] ${i.path}: ${i.message}`));
    }
  });
  
  if (hasErrors) {
    console.error("Validation failed.");
    process.exit(1);
  } else {
    console.log("Validation passed");
    process.exit(0);
  }
}
run();
