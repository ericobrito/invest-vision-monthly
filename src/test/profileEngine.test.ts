import { profileEngine } from "../services/ProfileEngine";

function runTests() {
  console.log("=== PROFILE ENGINE VALIDATION TESTS ===");

  // Test 1: Construção (> 20%)
  const test1 = profileEngine.calculate({ investedAssets: 100000, monthlyContribution: 3000 });
  console.assert(test1.annualContribution === 36000, "Test 1 Annual Contribution failed");
  console.assert(Math.abs(test1.accumulationRatio - 0.36) < 0.001, "Test 1 Ratio failed");
  console.assert(test1.stage === "construction", "Test 1 Stage failed");
  console.log("Test 1 (Construção) Passed:", test1.stageLabel, test1.accumulationRatioPercent + "%");

  // Test 2: Transição (5% - 20%)
  const test2 = profileEngine.calculate({ investedAssets: 1000000, monthlyContribution: 10000 });
  console.assert(test2.annualContribution === 120000, "Test 2 Annual Contribution failed");
  console.assert(Math.abs(test2.accumulationRatio - 0.12) < 0.001, "Test 2 Ratio failed");
  console.assert(test2.stage === "transition", "Test 2 Stage failed");
  console.log("Test 2 (Transição) Passed:", test2.stageLabel, test2.accumulationRatioPercent + "%");

  // Test 3: Manutenção (< 5%)
  const test3 = profileEngine.calculate({ investedAssets: 5000000, monthlyContribution: 13000 });
  console.assert(test3.annualContribution === 156000, "Test 3 Annual Contribution failed");
  console.assert(Math.abs(test3.accumulationRatio - 0.0312) < 0.001, "Test 3 Ratio failed");
  console.assert(test3.stage === "maintenance", "Test 3 Stage failed");
  console.log("Test 3 (Manutenção) Passed:", test3.stageLabel, test3.accumulationRatioPercent + "%");

  // Test 4: Zero Invested Assets
  const test4 = profileEngine.calculate({ investedAssets: 0, monthlyContribution: 1000 });
  console.assert(!isNaN(test4.accumulationRatio), "Test 4 NaN check failed");
  console.assert(test4.stage === "construction_initial", "Test 4 Stage failed");
  console.log("Test 4 (Zero Patrimony) Passed:", test4.stageLabel);

  console.log("=== ALL TESTS COMPLETED SUCCESSFULLY ===");
}

runTests();
