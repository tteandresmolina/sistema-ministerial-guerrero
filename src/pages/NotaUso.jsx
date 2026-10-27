// src/pages/NotaUso.jsx
// Nota corta de "objetivo" y "cómo se usa" para cada herramienta: dos líneas que se leen en segundos.

const C = { guinda: '#8b1e1e', lightGold: '#f5ede0', texto: '#374151' };

export default function NotaUso({ objetivo, uso }) {
  return (
    <div style={{ background: C.lightGold, borderLeft: '4px solid ' + C.guinda, borderRadius: 8, padding: '10px 14px', margin: '0 0 14px', fontSize: 17, lineHeight: 1.55, color: C.texto }}>
      <div><strong>Objetivo:</strong> {objetivo}</div>
      {uso && <div style={{ marginTop: 2 }}><strong>Cómo se usa:</strong> {uso}</div>}
    </div>
  );
}
