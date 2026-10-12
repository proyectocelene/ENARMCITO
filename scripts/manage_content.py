#!/usr/bin/env python3
# scripts/manage_content.py
# Herramienta CLI para que el Agente de IA valide y suba contenidos a la base de datos sin redeploy

import sys
import os
import json
import argparse
from typing import Dict, Any, List

# Asegurar UTF-8 en Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

REQUIRED_PIVOTS = [
    "Estudio_Inicial",
    "Gold_Standard",
    "Primera_Linea_Tx",
    "Tx_Alergicos_Especial",
    "Escala_Severidad",
    "Meta_Referencia"
]

def validate_topic_json(data: Dict[str, Any]) -> List[str]:
    """Valida un archivo de tema contra la especificación psicométrica estricta del ENARM."""
    errors = []
    
    # 1. Campos raíz
    for field in ["id", "code", "title", "specialty", "normativa_origen", "pretest"]:
        if field not in data:
            errors.append(f"Falta el campo obligatorio raíz: '{field}'")
            
    pretest = data.get("pretest", {})
    questions = pretest.get("questions", [])
    
    # 2. Volumen de preguntas (10 a 12)
    if len(questions) < 10 or len(questions) > 12:
        errors.append(f"El Pre-Test debe tener entre 10 y 12 reactivos. Actual: {len(questions)}")
        
    pivots_found = set()
    english_questions_count = 0
    
    for idx, q in enumerate(questions, start=1):
        # 3. Campos del reactivo
        for qfield in ["id", "concepto_pivote", "vignette", "question_text", "options", "correctAnswer", "dato_pivote_oculto", "justificacion_gpc"]:
            if qfield not in q:
                errors.append(f"Pregunta {idx}: Falta el campo '{qfield}'")
                
        piv = q.get("concepto_pivote")
        if piv:
            pivots_found.add(piv)
            
        # Opciones A, B, C, D
        options = q.get("options", {})
        if set(options.keys()) != {"A", "B", "C", "D"}:
            errors.append(f"Pregunta {idx}: Debe tener exactamente las opciones A, B, C, D")
            
        correct = q.get("correctAnswer")
        if correct not in {"A", "B", "C", "D"}:
            errors.append(f"Pregunta {idx}: 'correctAnswer' debe ser una de A, B, C, D")
            
        # Prohibición de trampas absurdas
        for opt_key, opt_val in options.items():
            lower_val = opt_val.lower()
            if "todas las anteriores" in lower_val or "ninguna de las anteriores" in lower_val:
                errors.append(f"Pregunta {idx} (Opción {opt_key}): Prohibido usar 'todas/ninguna de las anteriores'")
                
        # Detección de reactivos en inglés
        vignette_text = q.get("vignette", "").lower()
        if any(w in vignette_text for w in ["year-old", "female", "male", "history of", "blood pressure"]):
            english_questions_count += 1
            
    # 4. Cobertura de los 6 conceptos pivote
    missing_pivots = set(REQUIRED_PIVOTS) - pivots_found
    if missing_pivots:
        errors.append(f"Faltan conceptos pivote obligatorios por cubrir: {', '.join(missing_pivots)}")
        
    # 5. Reactivos en inglés (al menos 1)
    if english_questions_count < 1:
        errors.append("Debe incluir al menos 1 o 2 reactivos redactados íntegramente en inglés")
        
    return errors

def generate_template(code: str, title: str, specialty: str) -> Dict[str, Any]:
    """Genera una plantilla vacía que cumple los estándares psicométricos."""
    template = {
        "id": f"{code}_{specialty}_{title.replace(' ', '_')}",
        "code": code,
        "specialty": specialty,
        "title": title,
        "normativa_origen": "GPC-IMSS-XXX-XX",
        "date_assigned": "2026-10-XX",
        "pretest": {
            "duration_minutes": 20,
            "questions": []
        },
        "resources": [],
        "flashcards": [],
        "simulation": {
            "duration_minutes": 20,
            "seconds_per_question": 60,
            "questions": []
        }
    }
    return template

def main():
    parser = argparse.ArgumentParser(description="Gestor de contenidos ENARMCITO para IA")
    parser.add_argument("--validate", help="Ruta del archivo JSON de tema a validar")
    parser.add_argument("--template", action="store_true", help="Generar plantilla vacía para un nuevo tema")
    parser.add_argument("--code", default="D02", help="Código del tema (ej. D02)")
    parser.add_argument("--title", default="Nuevo Tema Clínico", help="Título del tema")
    parser.add_argument("--specialty", default="MI", help="Especialidad (MI, PED, GYO, CIR)")
    
    args = parser.parse_args()
    
    if args.validate:
        if not os.path.exists(args.validate):
            print(f"Error: Archivo '{args.validate}' no encontrado.")
            sys.exit(1)
        with open(args.validate, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        errors = validate_topic_json(data)
        if errors:
            print(f"❌ El archivo '{args.validate}' tiene {len(errors)} errores psicométricos:")
            for err in errors:
                print(f"  • {err}")
            sys.exit(1)
        else:
            print(f"✅ ¡El archivo '{args.validate}' cumple al 100% la especificación psicométrica del ENARM!")
            
    elif args.template:
        t = generate_template(args.code, args.title, args.specialty)
        out_name = f"data_template_{args.code}.json"
        with open(out_name, "w", encoding="utf-8") as f:
            json.dump(t, f, indent=2, ensure_ascii=False)
        print(f"✅ Plantilla creada en '{out_name}'")
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
