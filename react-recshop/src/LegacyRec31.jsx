import React, { useEffect, useRef, useState } from 'react';

export default function LegacyRec31(){
  const iframeRef = useRef(null);
  const [exists, setExists] = useState(true);

  useEffect(()=>{
    let aborted = false;
    // Verifica se o arquivo foi colocado em /public/Rec31.html
    fetch('/Rec31.html', { method: 'HEAD' })
      .then(r => {
        if (aborted) return;
        setExists(r.ok);
      })
      .catch(()=>{ if(!aborted) setExists(false); });
    return ()=>{ aborted = true; };
  },[]);

  if(!exists){
    return (
      <div className="alert alert-warning mb-0">
        Arquivo <code>/public/Rec31.html</code> não encontrado. Mova seu arquivo <code>Rec31.html</code> para <code>react-recshop/public/Rec31.html</code> e recarregue a página.
      </div>
    );
  }

  return (
    <div className="ratio ratio-16x9">
      <iframe
        ref={iframeRef}
        src="/Rec31.html"
        title="RECSHOP Original"
        style={{ border: '1px solid rgba(0,0,0,.1)', borderRadius: 8, background: '#fff' }}
      />
    </div>
  );
}


