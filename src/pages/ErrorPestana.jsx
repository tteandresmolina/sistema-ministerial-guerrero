// src/pages/ErrorPestana.jsx
// Aísla una pestaña: si algo falla al dibujarla, solo esa pestaña muestra un aviso y el resto del sistema sigue funcionando
// (sin esto, un error en una pestaña deja toda la pantalla en blanco).

import React from 'react';

export default class ErrorPestana extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('Error en la pestaña:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" style={{ background: '#fbf1f1', border: '2px solid #8b1e1e', borderRadius: 10, padding: 18, fontSize: 15, color: '#374151', lineHeight: 1.6 }}>
          <strong style={{ color: '#8b1e1e', fontSize: 16 }}>Esta pestaña tuvo un problema y no se pudo mostrar.</strong>
          <div style={{ marginTop: 4 }}>Presiona Reintentar. Si se repite, recarga la página con Ctrl+Shift+R.</div>
          <button onClick={() => this.setState({ error: null })}
            style={{ marginTop: 12, padding: '10px 20px', borderRadius: 8, border: '2px solid #8b1e1e', background: '#ffffff', color: '#8b1e1e', fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: 44 }}>
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
