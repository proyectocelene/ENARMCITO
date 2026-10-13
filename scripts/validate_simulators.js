// scripts/validate_simulators.js
// Script de Verificación de Integridad Psicométrica para los Simuladores Post-Estudio generados
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseAndValidateSimulatorJson } from "../src/services/telemetryEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const simDir = path.join(__dirname, "../src/data/simulators");

if (!fs.existsSync(simDir)) {
  console.log("Directorio de simuladores no existe aún.");
  process.exit(0);
}

const files = fs.readdirSync(simDir).filter(f => f.endsWith(".json"));
console.log(`Verificando ${files.length} archivos de Simulador generados...`);

let hasErrors = false;

for (const file of files) {
  const filePath = path.join(simDir, file);
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const validated = parseAndValidateSimulatorJson(content, { code: file.split("_")[0] });
    console.log(`✓ ${file}: Válido (${validated.questions.length} preguntas, code: ${file.split("_")[0]})`);
  } catch (err) {
    console.error(`✗ ${file}: Error de validación:`, err.message);
    hasErrors = true;
  }
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log("¡Todos los archivos de simulador verificados cumplen la norma ENARMCITO!");
}
