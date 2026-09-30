import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

console.log("🚀 [Harness CI/CD Validation] Iniciando validação de pipeline...\n");

function runStep(name, command) {
  console.log(`📌 Executando etapa: ${name}...`);
  try {
    const output = execSync(command, { encoding: "utf8", stdio: "pipe" });
    console.log(`✅ ${name} concluído com sucesso!`);
    return true;
  } catch (err) {
    console.error(`❌ Erro na etapa [${name}]:`);
    console.error(err.stdout || err.message);
    return false;
  }
}

// 1. Check Gemini.md documentation presence in required folders
console.log("📄 Checando integridade dos arquivos Gemini.md...");
const requiredDocs = [
  "Gemini.md",
  "src/Gemini.md",
  "src/features/Gemini.md",
  "supabase/Gemini.md",
  "docs/Gemini.md",
  "docs/pipeline.md",
  "docs/review-process.md",
  "docs/architecture.md",
];

let docsOk = true;
for (const doc of requiredDocs) {
  const fullPath = path.resolve(process.cwd(), doc);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Arquivo obrigatório de documentação não encontrado: ${doc}`);
    docsOk = false;
  }
}

if (docsOk) {
  console.log("✅ Todos os arquivos Gemini.md e especificações técnicas estão presentes!\n");
} else {
  console.error("❌ Falha na integridade documental.\n");
  process.exit(1);
}

// 2. Run Vitest Unit Tests
const testsSuccess = runStep("Testes Unitários Vitest", "npx vitest run");
if (!testsSuccess) process.exit(1);

console.log("\n🎉 [Harness CI/CD Pipeline] Todas as verificações foram concluídas com êxito!");
