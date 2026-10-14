import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rise } from '@/components/motion';
import { Book, type BookTab, type Leaf } from '@/components/passport/Book';
import { CityVisaPage, Cover, Holder, NextRoute, SheetBack } from '@/components/passport/Pages';
import { RouteSheet } from '@/components/passport/RouteSheet';
import { getTour } from '@/data/tours';
import { tintaDeRuta } from '@/lib/ink';
import { SHEET_RATIO } from '@/lib/sheet';
import { cityVisas } from '@/lib/visa';
import type { Tour } from '@/data/types';
import { knownRoutes, usePassport, usePassportHydrated, useRoute } from '@/store/passport';
import { font } from '@/theme/fonts';
import { neutral } from '@/theme/tokens';
import { type } from '@/theme/type';

/**
 * El pasaporte: portada, hoja del titular, una hoja por ruta (en el orden del
 * primer sello) y una hoja en blanco «Próxima ruta». En pantallas anchas se
 * ve la doble página.
 */
export default function Pasaporte() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const passport = usePassport(s => s.passport);
  const routes = usePassport(s => s.routes);
  const hydrated = usePassportHydrated();
  const [index, setIndex] = useState(0);
  // «Mi pasaporte» al terminar una ruta llega con ?ruta=<tourId>: el libro se abre en su hoja
  const { ruta } = useLocalSearchParams<{ ruta?: string }>();

  const spread = width >= 760;
  // La hoja cabe a lo ancho y a lo alto (dejando sitio a la cabecera, los botones y la barra de pestañas)
  const maxH = height - insets.top - insets.bottom - 250;
  const pageW = Math.floor(Math.min(spread ? (width - 64) / 2 : width - 32, maxH * SHEET_RATIO, 520));

  const pages = useMemo(() => knownRoutes(passport.pageOrder), [passport.pageOrder]);
  // Las hojas no se rehacen con cada sello: cada hoja de ruta lee su ruta del almacén.
  // Los visados solo cambian al completar todas las rutas de una ciudad
  const visaKey = cityVisas(routes).map(v => v.area).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visas = useMemo(() => cityVisas(routes), [visaKey]);

  useEffect(() => {
    if (!ruta || !hydrated) return;
    const at = pages.indexOf(ruta);
    if (at >= 0) setIndex(2 + at);
    router.setParams({ ruta: undefined });
  }, [ruta, hydrated, pages]);

  const { leaves, tabs } = useMemo(() => {
    const out: Leaf[] = [
      { key: 'cover', front: <Cover width={pageW} />, back: <SheetBack width={pageW} lining />, stiff: true },
      { key: 'holder', front: <Holder width={pageW} />, back: <SheetBack width={pageW} /> },
    ];
    const tabs: BookTab[] = [];
    pages.forEach((id, i) => {
      const tour = getTour(id)!;
      tabs.push({ key: id, color: tintaDeRuta(tour.accent), label: tour.title, index: out.length });
      out.push({
        key: id,
        front: <RouteLeaf tour={tour} width={pageW} pageNumber={i + 2} />,
        back: <SheetBack width={pageW} />,
      });
    });
    // Visado de cada ciudad con todas sus rutas completadas
    visas.forEach((visa, i) => {
      out.push({
        key: `visa-${visa.area}`,
        front: <CityVisaPage width={pageW} pageNumber={pages.length + 2 + i} visa={visa} />,
        back: <SheetBack width={pageW} />,
      });
    });
    out.push({ key: 'next', front: <NextRoute width={pageW} pageNumber={pages.length + visas.length + 2} />, back: <SheetBack width={pageW} /> });
    return { leaves: out, tabs };
  }, [pages, visas, pageW]);

  const stamps = pages.reduce((a, id) => a + (routes[id]?.stamps.length ?? 0), 0);

  return (
    // Sin scroll: la libreta cabe entera y el gesto horizontal de pasar hoja no compite con nada
    <View style={{ flex: 1, backgroundColor: neutral.bg, paddingTop: insets.top + 14, paddingBottom: 16, paddingHorizontal: 16, alignItems: 'center' }}>
      <Animated.View entering={rise(0)} style={s.head}>
        <Text style={type.overline}>Pasaporte</Text>
        <Text style={s.title}>Mis sellos</Text>
        <Text style={type.caption}>
          {!hydrated ? 'Abriendo tu pasaporte…' : stamps ? `${stamps} ${stamps === 1 ? 'sello' : 'sellos'} en ${pages.length} ${pages.length === 1 ? 'ruta' : 'rutas'} · Pasa las hojas con el dedo` : 'Ábrelo y pasa las hojas con el dedo. Cada ruta tendrá su hoja con el primer sello.'}
        </Text>
      </Animated.View>
      {/* La libreta aparece suave, subiendo un poco hasta la mano */}
      <Animated.View entering={rise(2)}>
      {hydrated ? (
        <Book leaves={leaves} width={pageW} spread={spread} index={Math.min(index, leaves.length - 1)} onIndex={setIndex} tabs={tabs} />
      ) : (
        // Hasta leer el pasaporte guardado solo se ve la tapa cerrada (sin hojas a medias)
        <View accessibilityLabel="Cargando el pasaporte" style={{ opacity: 0.9 }}><Cover width={pageW} /></View>
      )}
      </Animated.View>
    </View>
  );
}

/** Hoja de una ruta con su ruta leída del almacén: al poner un sello solo se repinta esa hoja */
function RouteLeaf({ tour, width, pageNumber }: { tour: Tour; width: number; pageNumber: number }) {
  const route = useRoute(tour.id);
  return <RouteSheet tour={tour} route={route} width={width} pageNumber={pageNumber} />;
}

const s = StyleSheet.create({
  head: { alignSelf: 'stretch', marginBottom: 16, gap: 2 },
  title: { fontFamily: font.serif, fontSize: 30, color: neutral.ink, letterSpacing: -0.5 },
});
