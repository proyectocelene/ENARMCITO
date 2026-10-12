// src/components/Common/MarkdownRenderer.jsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownRenderer({ content, className = '' }) {
  if (!content) return null;

  // Si parece HTML directo
  if (content.trim().startsWith('<') && (content.includes('</div>') || content.includes('</p>') || content.includes('</span>') || content.includes('<table>') || content.includes('<h'))) {
    return (
      <div 
        className={`prose max-w-none text-current ${className}`}
        dangerouslySetInnerHTML={{ __html: content }} 
      />
    );
  }

  return (
    <div className={`prose max-w-none text-current leading-relaxed ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({node, ...props}) => <h1 className="text-xl font-extrabold my-2 border-b pb-1 border-current opacity-90" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-lg font-bold my-2 opacity-95" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-base font-bold my-1.5 opacity-90" {...props} />,
          p: ({node, ...props}) => <p className="my-1.5 leading-relaxed" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-5 my-1.5 space-y-0.5" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5" {...props} />,
          li: ({node, ...props}) => <li className="my-0.5" {...props} />,
          strong: ({node, ...props}) => <strong className="font-extrabold text-blue-900 dark:text-cyan-300" {...props} />,
          blockquote: ({node, ...props}) => (
            <blockquote className="border-l-4 border-blue-500 pl-3 my-2 italic opacity-90 bg-blue-50/50 dark:bg-blue-950/20 py-1 rounded-r" {...props} />
          ),
          table: ({node, ...props}) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-slate-700 border border-gray-200 dark:border-slate-800 text-xs" {...props} />
            </div>
          ),
          th: ({node, ...props}) => <th className="px-3 py-2 bg-gray-100 dark:bg-slate-800 font-bold text-left" {...props} />,
          td: ({node, ...props}) => <td className="px-3 py-1.5 border-t border-gray-200 dark:border-slate-800" {...props} />,
          code: ({node, inline, ...props}) => (
            inline 
              ? <code className="bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px]" {...props} />
              : <pre className="bg-gray-100 dark:bg-slate-900 p-3 rounded-lg overflow-x-auto font-mono text-xs my-2 border border-gray-200 dark:border-slate-800"><code {...props} /></pre>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
