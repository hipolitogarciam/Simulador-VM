import { Fragment, type ReactNode } from 'react';

/** Markdown mínimo: párrafos (línea en blanco), **negrita** y *cursiva*. */
export function Markdown({ texto, className }: { texto: string; className?: string }) {
  const parrafos = texto.split(/\n\s*\n/);
  return (
    <div className={className}>
      {parrafos.map((p, i) => (
        <p key={i}>{inline(p)}</p>
      ))}
    </div>
  );
}

function inline(texto: string): ReactNode {
  const partes = texto.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**')) return <strong key={i}>{parte.slice(2, -2)}</strong>;
    if (parte.startsWith('*') && parte.endsWith('*') && parte.length > 2) return <em key={i}>{parte.slice(1, -1)}</em>;
    return <Fragment key={i}>{parte}</Fragment>;
  });
}
