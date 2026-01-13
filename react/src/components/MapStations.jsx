import React from 'react';
import { api } from '../services/api.js';

const GEO_KEY = (id) => `recshop:geo:${id}`;

function composeAddress(s){
  if (s.endereco && typeof s.endereco === 'object'){
    const { logradouro, numero, bairro, cidade, uf, cep } = s.endereco;
    return [logradouro && `${logradouro} ${numero||''}`, bairro, cidade && `${cidade} ${uf||''}`, cep].filter(Boolean).join(', ');
  }
  return [s.endereco, s.cidade, 'Brasil'].filter(Boolean).join(', ');
}

async function geocode(address){
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language':'pt-BR' } });
  const data = await res.json();
  if (Array.isArray(data) && data[0]){
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
  }
  return null;
}

export default function MapStations({ stations, showAll = false, onSelect, onVisibleChange }) {
  const mapRef = React.useRef(null);
  const [list, setList] = React.useState(stations || []);

  // Carrega todas as estações para o mapa quando desejado
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try{
        if (showAll) {
          const all = await api.getStations();
          if (!cancelled) setList(all || []);
        } else {
          setList(stations || []);
        }
      }catch(_e){
        setList(stations || []);
      }
    })();
    return () => { cancelled = true; };
  }, [stations, showAll]);

  React.useEffect(() => {
    if (!window.L) return;
    if (!mapRef.current) return;
    // init map
    const L = window.L;
    const map = L.map(mapRef.current).setView([-22.91, -43.2], 11); // Rio por padrão
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    let bounds = null;
    const markers = [];

    (async () => {
      for (const s of (list || [])) {
        let coords = null;
        try {
          const raw = localStorage.getItem(GEO_KEY(s.id));
          coords = raw ? JSON.parse(raw) : null;
        } catch (_e) {}
        if (!coords){
          const addr = composeAddress(s);
          coords = await geocode(addr);
          if (coords){
            try { localStorage.setItem(GEO_KEY(s.id), JSON.stringify(coords)); } catch (_e) {}
          }
        }
        if (coords){
          const marker = L.marker([coords.lat, coords.lng]).addTo(map);
          const disponiveis = Number(s.qtdDisponivel || 0);
          marker.bindPopup(`<b>${s.nome}</b><br/>${composeAddress(s)}<br/>Conectores: ${disponiveis}${s.qtdTotal?'/'+s.qtdTotal:''}`);
          if (onSelect) {
            marker.on('click', () => onSelect(s.id));
          }
          markers.push({ id: s.id, marker });
          if (!bounds) bounds = L.latLngBounds([coords.lat, coords.lng], [coords.lat, coords.lng]);
          else bounds.extend([coords.lat, coords.lng]);
        }
      }
      if (bounds) map.fitBounds(bounds.pad(0.2));
      // inicializa visíveis
      const updateVisible = () => {
        if (!onVisibleChange) return;
        const b = map.getBounds();
        const visible = markers.filter(m => b.contains(m.marker.getLatLng())).map(m => m.id);
        onVisibleChange(visible);
      };
      updateVisible();
      map.on('moveend', updateVisible);
    })();

    return () => {
      map.remove();
    };
  }, [list]);

  return <div id="stationsMap" ref={mapRef}></div>;
}


