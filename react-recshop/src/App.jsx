import React, { useState } from 'react';
import LegacyRec31 from './LegacyRec31.jsx';

export default function App() {
  const [showLegacy, setShowLegacy] = useState(true);
  return (
    <div className="container py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 mb-0">RECSHOP • React</h1>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={()=>setShowLegacy(v=>!v)}>
            {showLegacy ? 'Ocultar página original' : 'Mostrar página original'}
          </button>
        </div>
      </div>
      <div className="alert alert-info">
        Esta aplicação React carrega a página original <code>Rec31.html</code> dentro de um iframe para manter todas as funcionalidades enquanto migramos gradualmente para componentes React.
      </div>
      {showLegacy && <LegacyRec31 />}
    </div>
  );
}


