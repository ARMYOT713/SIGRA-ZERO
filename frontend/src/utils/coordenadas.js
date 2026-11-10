// src/utils/coordenadas.js

/**
 * Convierte coordenadas en formato Grados, Minutos y Segundos (DMS) o links de Google Maps a decimales.
 * Soporta formatos como: 
 * - 19°48'48.2"N 99°45'21.6"W
 * - 19° 48' 48.2" N, 99° 45' 21.6" W
 */
export const convertirDMSaDecimal = (texto) => {
  if (!texto) return null;
  
  // Expresión regular para capturar bloques de grados, minutos, segundos y el punto cardinal
  const regex = /(\d+)[°º\s]+(\d+)[\'\s]+([\d.]+)[\"'\s]+([NSEW])/gi;
  let matches = [...texto.matchAll(regex)];

  if (matches.length >= 2) {
    // Latitud (Primer coincidencia)
    let latGrados = parseFloat(matches[0][1]);
    let latMinutos = parseFloat(matches[0][2]);
    let latSegundos = parseFloat(matches[0][3]);
    let latHemisferio = matches[0][4].toUpperCase();

    let latDecimal = latGrados + (latMinutos / 60) + (latSegundos / 3600);
    if (latHemisferio === 'S') latDecimal *= -1;

    // Longitud (Segunda coincidencia)
    let lonGrados = parseFloat(matches[1][1]);
    let lonMinutos = parseFloat(matches[1][2]);
    let lonSegundos = parseFloat(matches[1][3]);
    let lonHemisferio = matches[1][4].toUpperCase();

    let lonDecimal = lonGrados + (lonMinutos / 60) + (lonSegundos / 3600);
    if (lonHemisferio === 'W' || lonHemisferio === 'O') lonDecimal *= -1;

    return {
      latitud: latDecimal.toFixed(6),
      longitud: lonDecimal.toFixed(6)
    };
  }
  
  return null;
};