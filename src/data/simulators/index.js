// src/data/simulators/index.js
// Registro y carga automática de los Simuladores Post-Estudio Oficiales (Fase 3: Transferencia y Resistencia)

const simulatorModules = import.meta.glob("./*.json", { eager: true });

export const BUNDLED_SIMULATORS = {};

for (const path in simulatorModules) {
  const mod = simulatorModules[path];
  const sim = mod.default || mod;
  const code = sim.topic_code || sim.code;
  if (code) {
    BUNDLED_SIMULATORS[code.toUpperCase()] = sim;
  }
}

/**
 * Obtiene el simulador oficial empaquetado para un día (ej. "D01", "D02", etc.)
 */
export function getBundledSimulator(dayCode) {
  if (!dayCode) return null;
  const normalized = dayCode.toUpperCase().trim();
  return BUNDLED_SIMULATORS[normalized] || null;
}
