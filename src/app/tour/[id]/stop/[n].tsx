import { Redirect, router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StopGuide } from '@/components/StopGuide';
import { getTour } from '@/data/tours';
import type { Tour } from '@/data/types';
import { stopScript } from '@/lib/spoken';
import { stopAudioKey, useGroupAudio } from '@/lib/group/useGroupAudio';
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
  const raw = useNarrationPlayer(stopScript(tour.stops[n]));
  // Sin voz cuando otra pantalla tapa la parada (con el móvil bloqueado sigue sonando)
  useAutoPause(raw.pause);
  // En un grupo: el anfitrión la publica y el invitado la sigue (solo mientras esta pantalla está delante)
  const group = useGroupAudio(raw, stopAudioKey(tour.stops[n].id), { enabled: useIsFocused() });
  const player = group.player;

  // Desde la notificación de llegada: el aviso baja y se va solo; el audio solo suena si se toca ▶
  useEffect(() => {
    if (!arrived) return;
    const t = setTimeout(() => setBanner(false), 3400);
    return () => clearTimeout(t);
  }, [arrived]);

  return <StopGuide tour={tour} n={n} player={player} group={group} onClose={() => router.back()} arrived={banner ? arrived : null} />;
}
