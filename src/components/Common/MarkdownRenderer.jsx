// src/components/Common/MarkdownRenderer.jsx
// Renderizado clínico con soporte completo para Markdown, tablas comparativas,
// texto monoespaciado inline (`code`) y cajas de código interactivas (```block```) con botón de copiado.

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Copy, Check, Layers } from "lucide-react";

function CodeBlockBox({ language, codeText, onImportTsvCards }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const tsvLines = codeText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("\t"));

  const isTsvBlock = language === "tsv" || language === "anki" || tsvLines.length > 0;

  const handleImport = async () => {
    if (saved || !onImportTsvCards) return;
    try {
      await onImportTsvCards(codeText, tsvLines.length);
      setSaved(true);
    } catch {}
  };

  return (
    <div className="relative my-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-900 text-slate-100 overflow-hidden shadow-xs group">
      {/* Botones de acción flotantes en la esquina superior derecha */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
        {isTsvBlock && tsvLines.length > 0 && onImportTsvCards && (
          <button
            type="button"
            disabled={saved}
            onClick={handleImport}
            className={`px-2.5 py-1 rounded-lg text-white font-bold text-[10px] flex items-center gap-1 transition-all shadow-xs ${
              saved
                ? "bg-emerald-600 cursor-default opacity-95"
                : "bg-purple-600 hover:bg-purple-500 cursor-pointer active:scale-95"
            }`}
          >
            {saved ? <Check className="w-3 h-3 text-white" /> : <Layers className="w-3 h-3" />}
            <span>{saved ? "✓ Guardado en Anki" : `Guardar ${tsvLines.length} en Anki`}</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center gap-1 cursor-pointer transition-all shadow-xs"
          title="Copiar contenido"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      <pre className="p-3 pt-3 overflow-x-auto font-mono text-xs leading-relaxed text-slate-100 whitespace-pre scrollbar-thin">
        <code>{codeText}</code>
      </pre>
    </div>
  );
}

/**
 * Limpia y normaliza etiquetas HTML comunes en tarjetas Anki y reportes de IA
 * (como <br>, <b>, <i>, <ul>, <li>, <div>) fuera de bloques de código y fórmulas LaTeX,
 * y corrige espacios internos en ** negritas ** o * cursivas * que rompen CommonMark.
 */
export function normalizeClinicalMarkdown(rawContent = "") {
  if (!rawContent) return "";
  const str = String(rawContent);

  // Separar por bloques de código cercados (```...```) y fórmulas LaTeX ($$...$$ o $...$) para no alterarlos
  const segments = str.split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$)/g);

  return segments
    .map((segment) => {
      if (
        (segment.startsWith("```") && segment.endsWith("```")) ||
        (segment.startsWith("$$") && segment.endsWith("$$"))
      ) {
        return segment;
      }

      return segment
        // Des-escapar asteriscos si la IA los escapó (\* -> *)
        .replace(/\\\*/g, "*")
        // Saltos de línea HTML
        .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "\n\n")
        .replace(/<br\s*\/?>/gi, "\n\n")
        .replace(/<hr\s*\/?>/gi, "\n\n---\n\n")
        // Listas HTML estilo Anki (<ul><li>...</li></ul>) -> Markdown
        .replace(/<li\b[^>]*>\s*([\s\S]*?)\s*<\/li>/gi, "\n- $1\n")
        .replace(/<\/?(?:ul|ol|div|p|section|article)\b[^>]*>/gi, "\n\n")
        // Negritas y cursivas HTML cuidando espacios internos
        .replace(/<(?:b|strong)\b[^>]*>\s*([\s\S]*?)\s*<\/(?:b|strong)>/gi, " **$1** ")
        .replace(/<(?:i|em)\b[^>]*>\s*([\s\S]*?)\s*<\/(?:i|em)>|<i>([\s\S]*?)<\/i>/gi, " *$1* ")
        // Otras etiquetas inline de Anki (<u>, <span>, <font>)
        .replace(/<\/?(?:u|span|font|small|sub|sup)\b[^>]*>/gi, "")
        // Colapsar 4 o más asteriscos consecutivos (ej. <b>**texto**</b> -> ****texto**** -> **texto**)
        .replace(/\*{4,}([^*\n]+?)\*{4,}/g, "**$1**")
        // Quitar espacios justo adentro de ** texto ** que impiden el parseo en CommonMark
        .replace(/\*\*[ \t]+([^*\n]+?)[ \t]*\*\*/g, "**$1**")
        .replace(/\*\*[ \t]*([^*\n]+?)[ \t]+\*\*/g, "**$1**");
    })
    .join("");
}

/**
 * Convierte cualquier cadena de texto que aún conserve marcadores **negrita** o *cursiva*
 * (por ejemplo, cuando están pegados a signos de puntuación como **>250 mg/dL**, **¿Cuál?**, **pH < 7.3:**)
 * en elementos React <strong> y <em> reales.
 */
function parseResidualInlineAsterisks(text, keyPrefix = "inline") {
  if (typeof text !== "string" || !text.includes("*")) return text;

  // Tokenizar **negrita y cursiva***, **negrita** y *cursiva*
  const tokenRegex = /(\*\*\*[^*\n]+?\*\*\*|\*\*[^*\n]+?\*\*|\*[^\s*][^*\n]*?\*)/g;
  const parts = text.split(tokenRegex);
  if (parts.length === 1) return text;

  return parts.map((part, idx) => {
    if (part.startsWith("***") && part.endsWith("***") && part.length > 6) {
      return (
        <strong key={`${keyPrefix}_bi_${idx}`} className="font-extrabold italic text-blue-950 dark:text-cyan-300">
          {part.slice(3, -3)}
        </strong>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`${keyPrefix}_b_${idx}`} className="font-extrabold text-blue-950 dark:text-cyan-300">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={`${keyPrefix}_i_${idx}`} className="italic font-semibold text-slate-800 dark:text-slate-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

function renderFormattedChildren(children, keyPrefix = "md") {
  return React.Children.map(children, (child, index) => {
    if (typeof child === "string") {
      return parseResidualInlineAsterisks(child, `${keyPrefix}_${index}`);
    }
    if (
      React.isValidElement(child) &&
      child.props &&
      child.props.children &&
      child.type !== "code" &&
      child.type !== "pre" &&
      !String(child.props.className || "").includes("katex")
    ) {
      return React.cloneElement(child, {
        ...child.props,
        children: renderFormattedChildren(child.props.children, `${keyPrefix}_${index}`)
      });
    }
    return child;
  });
}

export function MarkdownRenderer({ content, className = "", onImportTsvCards = null }) {
  if (!content) return null;

  const processedContent = normalizeClinicalMarkdown(content);

  return (
    <div className={`prose max-w-none text-current leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, children, ...props }) => (
            <h1 className="text-lg sm:text-xl font-black mt-4 mb-2 border-b-2 pb-1.5 border-slate-300 dark:border-slate-700" {...props}>
              {renderFormattedChildren(children, "h1")}
            </h1>
          ),
          h2: ({ node, children, ...props }) => (
            <h2 className="text-base sm:text-lg font-extrabold mt-3.5 mb-1.5 text-blue-900 dark:text-cyan-300" {...props}>
              {renderFormattedChildren(children, "h2")}
            </h2>
          ),
          h3: ({ node, children, ...props }) => (
            <h3 className="text-sm sm:text-base font-extrabold mt-3 mb-1 opacity-95" {...props}>
              {renderFormattedChildren(children, "h3")}
            </h3>
          ),
          h4: ({ node, children, ...props }) => (
            <h4 className="text-xs sm:text-sm font-extrabold mt-2 mb-1 uppercase tracking-wide opacity-90" {...props}>
              {renderFormattedChildren(children, "h4")}
            </h4>
          ),
          p: ({ node, children, ...props }) => (
            <p className="my-1.5 leading-relaxed text-inherit" {...props}>
              {renderFormattedChildren(children, "p")}
            </p>
          ),
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2 space-y-1 text-inherit" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2 space-y-1 text-inherit" {...props} />,
          li: ({ node, children, ...props }) => (
            <li className="my-0.5 leading-relaxed text-inherit" {...props}>
              {renderFormattedChildren(children, "li")}
            </li>
          ),
          hr: () => <hr className="my-4 border-t-2 border-slate-200 dark:border-slate-800" />,
          strong: ({ node, children, ...props }) => (
            <strong className="font-extrabold text-blue-950 dark:text-cyan-300" {...props}>
              {renderFormattedChildren(children, "strong")}
            </strong>
          ),
          em: ({ node, children, ...props }) => (
            <em className="italic font-semibold text-slate-800 dark:text-slate-200" {...props}>
              {renderFormattedChildren(children, "em")}
            </em>
          ),
          blockquote: ({ node, children, ...props }) => (
            <blockquote
              className="border-l-4 border-blue-600 dark:border-cyan-400 pl-3.5 py-2 my-2.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-r-xl font-medium"
              {...props}
            >
              {renderFormattedChildren(children, "bq")}
            </blockquote>
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-3 rounded-xl border-2 border-slate-300 dark:border-slate-700">
              <table className="min-w-full divide-y-2 divide-slate-300 dark:divide-slate-700 text-xs" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-slate-100 dark:bg-slate-800 font-extrabold" {...props} />
          ),
          th: ({ node, children, ...props }) => (
            <th className="px-3 py-2 text-left font-extrabold border-r last:border-r-0 border-slate-300 dark:border-slate-700" {...props}>
              {renderFormattedChildren(children, "th")}
            </th>
          ),
          td: ({ node, children, ...props }) => (
            <td className="px-3 py-2 border-t border-r last:border-r-0 border-slate-200 dark:border-slate-800 align-top" {...props}>
              {renderFormattedChildren(children, "td")}
            </td>
          ),
          // En react-markdown v10, <pre> envuelve a <code> en bloques cercados (```).
          // Quitamos el envoltorio extra de <pre> para que CodeBlockBox controle el contenedor.
          pre: ({ children }) => <>{children}</>,
          code: ({ node, className: codeClassName, children, ...props }) => {
            const rawText = String(children || "").replace(/\n$/, "");
            const matchLang = /language-(\w+)/.exec(codeClassName || "");
            const isBlock = Boolean(matchLang) || rawText.includes("\n");

            if (isBlock) {
              return (
                <CodeBlockBox
                  language={matchLang ? matchLang[1].toLowerCase() : ""}
                  codeText={rawText}
                  onImportTsvCards={onImportTsvCards}
                />
              );
            }

            // Texto monoespaciado inline (`código`)
            return (
              <code
                className="px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[0.9em] font-bold bg-slate-100 dark:bg-slate-800 text-blue-900 dark:text-cyan-300 border border-slate-300 dark:border-slate-700"
                {...props}
              >
                {children}
              </code>
            );
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

