import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StopGuide } from '@/components/StopGuide';
import { getTour } from '@/data/tours';
import type { Tour } from '@/data/types';
import { stopScript } from '@/lib/spoken';
import { useAutoPause } from '@/lib/useAutoPause';
import { useNarrationPlayer } from '@/lib/useNarrationPlayer';

/**
 * Una parada como pantalla propia (desde la portada, el pasaporte o la
 * notificación de llegada). En el paseo, la guía se abre en la hoja del mapa.
 */
export default function StopScreen() {
  const params = useLocalSearchParams<{ id: string; n: string }>();
  const tour = getTour(params.id);
  // Un enlace roto no debe cerrar la app: a Inicio si no hay ruta, a la portada de la ruta si no hay parada
  if (!tour) return <Redirect href="/" />;
  const n = /^\d+$/.test(params.n ?? '') ? Number(params.n) : -1;
  if (n < 0 || n >= tour.stops.length) return <Redirect href={{ pathname: '/tour/[id]', params: { id: tour.id } }} />;
  return <Stop tour={tour} n={n} />;
}

function Stop({ tour, n }: { tour: Tour; n: number }) {
  const params = useLocalSearchParams<{ arrived?: string }>();
  const arrived = params.arrived === '1' || params.arrived === 'repeat' ? params.arrived : null;
  const [banner, setBanner] = useState(arrived != null);
  const player = useNarrationPlayer(stopScript(tour.stops[n]));
  // Sin voz cuando otra pantalla tapa la parada o la app queda en segundo plano
  useAutoPause(player.pause);

  // Desde la notificación de llegada (el usuario la ha tocado): el aviso baja, se va solo y el audio arranca
  const playRef = useRef(player.play);
  useEffect(() => { playRef.current = player.play; });
  useEffect(() => {
    if (!arrived) return;
    const a = setTimeout(() => playRef.current(), 1400);
    const b = setTimeout(() => setBanner(false), 3400);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [arrived]);

  return <StopGuide tour={tour} n={n} player={player} onClose={() => router.back()} arrived={banner ? arrived : null} />;
}
