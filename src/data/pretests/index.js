// src/data/pretests/index.js
// Registro Automático de Cuestionarios Pre-Test para ENARMCITO (Vite Glob Import)
// Cualquier archivo JSON que los subagentes generen en este directorio se carga al instante.

const pretestModules = import.meta.glob("./*.json", { eager: true });

export const PRETEST_REGISTRY = {};

Object.entries(pretestModules).forEach(([filePath, mod]) => {
  const data = mod.default || mod;
  if (data && (data.topic_code || data.title)) {
    // Normalizar clave por código ej. 'D02', 'D03'
    const codeMatch = filePath.match(/([D|R][0-9A-Za-z_-]+)_pretest\.json/i);
    const code = data.topic_code || (codeMatch ? codeMatch[1] : null);
    if (code) {
      PRETEST_REGISTRY[code.toUpperCase()] = data;
    }
  }
});

export function getBundledPretest(code) {
  if (!code) return null;
  return PRETEST_REGISTRY[code.toUpperCase()] || null;
}
