# 🩺 ENARMCITO - Plataforma de Preparación Médica Dúo (Donato & Sonia)

Plataforma Web Progresiva (**PWA**) offline-first, diseñada para optimizar el estudio del ENARM con base en psicometría rigurosa, cebado cognitivo, autopsia de distractores, recursos compartidos, algoritmo Anki FSRS y gamificación dúo.

---

## 🚀 Inicio Rápido

### 1. Iniciar en Modo Desarrollo Local:
```bash
npm run dev
```
Abre en tu navegador `http://localhost:3000`.

### 2. Ejecutar Pruebas del Motor Psicométrico y FSRS:
```bash
npm run test:engine
```

### 3. Compilar para Producción / GitHub Pages:
```bash
npm run build
```

---

## 🧭 Las 4 Fases de Estudio Diario

1. **Fase 0: Pre-Test Interactivo Psicométrico (Cebado Cognitivo):**
   - 10 a 12 casos clínicos estilo ENARM con los 6 conceptos pivote obligatorios y preguntas en inglés.
   - Tachado dinámico `[✕]` para descartar distractores (registra si tachas la correcta).
   - Candado obligatorio de nivel de confianza (`ALTA` vs `BAJA`).
   - Autopsia de errores con clasificación en 4 cuadrantes (Hipercorrección, Laguna, Frágil, Dominio).
   - Botón `[📋 Copiar Informe Ultra-Detallado para IA]` listo para pegar directo en Gemini.

2. **Fase 1: Lectura Focalizada & Recursos Compartidos:**
   - Lectura guiada exclusiva de los pivotes fallados.
   - Pega o consulta resúmenes, videos de YouTube/Drive y PDFs oficiales con Sonia.

3. **Fase 2: Extracción de Pivotes & Flashcards (Anki FSRS):**
   - Visor de tarjetas interactivo con algoritmo **FSRS** (`Again`, `Hard`, `Good`, `Easy`).
   - Botón `[📥 Descargar para Anki (.tsv)]` para importar en 1 clic a Anki oficial.

4. **Fase 3: Auto-Evaluación (Simulador Contrarreloj):**
   - 20 reactivos seriados contrarreloj (60 segundos por reactivo) para mecanizar el descarte de distractores.

---

## 🤖 Gestión de Contenidos por el Agente de IA

Para validar o subir nuevos cuestionarios diarios sin necesidad de redeploy:
```bash
# Validar psicometría del tema
python scripts/manage_content.py --validate data/topics/D01_MI_Diabetes_Mellitus.json

# Crear plantilla para un nuevo día
python scripts/manage_content.py --template --code D02 --title "Hipertensión Arterial Sistémica" --specialty MI
```

---

## 🔥 Conexión con Firebase Firestore

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Crea una base de datos **Cloud Firestore** en modo de prueba o con reglas de lectura/escritura abiertas para tu app.
3. Copia tus credenciales en un archivo `.env` en la raíz del proyecto:
   ```env
   VITE_FIREBASE_API_KEY=tu_api_key
   VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tu_proyecto
   VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef
   ```
4. ¡Listo! La app detectará automáticamente Firebase y activará la sincronización en la nube entre Donato y Sonia, manteniendo la caché offline en IndexedDB.
