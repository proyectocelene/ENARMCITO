// scripts/validate_pretests.js
// Script de Verificación de Integridad Psicométrica para los Pre-Tests generados
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseAndValidatePretestJson } from "../src/services/telemetryEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pretestsDir = path.join(__dirname, "../src/data/pretests");

if (!fs.existsSync(pretestsDir)) {
  console.log("Directorio de pretests no existe aún.");
  process.exit(0);
}

const files = fs.readdirSync(pretestsDir).filter(f => f.endsWith(".json"));
console.log(`Verificando ${files.length} archivos de Pre-Test generados...`);

let hasErrors = false;

for (const file of files) {
  const filePath = path.join(pretestsDir, file);
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const validated = parseAndValidatePretestJson(content);
    console.log(`✓ ${file}: Válido (${validated.questions.length} preguntas, code: ${validated.topic_code})`);
  } catch (err) {
    console.error(`✗ ${file}: Error de validación:`, err.message);
    hasErrors = true;
  }
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log("¡Todos los archivos de pretest verificados cumplen la norma ENARMCITO!");
}
