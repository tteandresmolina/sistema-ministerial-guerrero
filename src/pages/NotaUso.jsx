// src/pages/NotaUso.jsx
// Nota corta de "objetivo" y "cómo se usa" para cada herramienta. Por defecto queda en un solo botón para no llenar la pantalla de texto;
// se abre cuando alguien la necesita.
import { useState } from 'react';

const C = { guinda: '#8b1e1e', lightGold: '#f5ede0', texto: '#374151', oro: '#b6905a' };

export default function NotaUso({ objetivo, uso }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <div style={{ margin: '0 0 12px' }}>
      <button onClick={() => setAbierta(!abierta)} aria-expanded={abierta}
        style={{ background: 'none', border: '1.5px solid ' + C.oro, color: '#7a5a14', borderRadius: 16, padding: '4px 14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: 34 }}>
        ⓘ {abierta ? 'Ocultar' : 'Para qué sirve'}
      </button>
      {abierta && (
        <div style={{ background: C.lightGold, borderLeft: '4px solid ' + C.guinda, borderRadius: 8, padding: '10px 14px', marginTop: 8, fontSize: 17, lineHeight: 1.55, color: C.texto }}>
          <div><strong>Objetivo:</strong> {objetivo}</div>
          {uso && <div style={{ marginTop: 2 }}><strong>Cómo se usa:</strong> {uso}</div>}
        </div>
      )}
    </div>
  );
}
