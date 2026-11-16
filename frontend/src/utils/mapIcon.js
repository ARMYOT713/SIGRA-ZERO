import L from 'leaflet';
 
const medidaUniforme = [54, 54];
const anclaUniforme = [27, 27];
 const medidaModem = [36, 36];
const anclaModem = [18, 18];
 const medidaGps = [40, 40];
const anclaGps = [20, 40];
 
export const iconoCliente = L.icon({
  iconUrl: '/icons/cliente.png',
  iconSize: medidaModem,
  iconAnchor: anclaModem,
  popupAnchor: [0, -14],
  tooltipAnchor: [0, -14]
});
 
// 2. CAJA NAP
export const iconoNap = L.icon({
  iconUrl: '/icons/nap.png',
  iconSize: medidaUniforme,
  iconAnchor: anclaUniforme,
  popupAnchor: [0, -27],
  tooltipAnchor: [0, -25]
});
 
// 3. POSTE
export const iconoPoste = L.icon({
  iconUrl: '/icons/poste.png',
  iconSize: medidaUniforme,
  iconAnchor: anclaUniforme,
  popupAnchor: [0, -27],
  tooltipAnchor: [0, -25]
});

// 4. ONU (Equipo de Red / Fibra)
export const iconoOnu = L.icon({
  iconUrl: '/icons/onus.png',
  iconSize: medidaUniforme,
  iconAnchor: anclaUniforme,
  popupAnchor: [0, -27],
  tooltipAnchor: [0, -25]
});

export const iconoMiGps = L.divIcon({
  iconUrl: '/icons/pin.png',
  iconSize: medidaUniforme,
  iconAnchor: anclaUniforme,
  popupAnchor: [0, -27]
});

// 5. ELEMENTO SELECCIONADO (Indicador rojo con check)
export const iconoSeleccionado = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #dc2626; width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3.5px solid #ffffff; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
         </div>`,
  iconSize: medidaUniforme,
  iconAnchor: anclaUniforme
});