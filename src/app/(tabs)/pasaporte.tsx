import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rise } from '@/components/motion';
import { Book, type Leaf } from '@/components/passport/Book';
import { Cover, Holder, NextRoute, SheetBack } from '@/components/passport/Pages';
import { RouteSheet } from '@/components/passport/RouteSheet';
import { getTour } from '@/data/tours';
import { SHEET_RATIO } from '@/lib/sheet';
import { usePassport } from '@/store/passport';
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
  const [index, setIndex] = useState(0);

  const spread = width >= 760;
  // La hoja cabe a lo ancho y a lo alto (dejando sitio a la cabecera, los botones y las pestañas)
  const maxH = height - insets.top - insets.bottom - 200;
  const pageW = Math.floor(Math.min(spread ? (width - 64) / 2 : width - 32, maxH * SHEET_RATIO, 520));

  const leaves = useMemo<Leaf[]>(() => {
    const out: Leaf[] = [
      { key: 'cover', front: <Cover width={pageW} />, back: <SheetBack width={pageW} lining /> },
      { key: 'holder', front: <Holder width={pageW} />, back: <SheetBack width={pageW} /> },
    ];
    passport.pageOrder.forEach((id, i) => {
      const tour = getTour(id);
      if (!tour) return;
      out.push({
        key: id,
        front: (
          <RouteSheet tour={tour} route={routes[id]} width={pageW} pageNumber={i + 2} />
        ),
        back: <SheetBack width={pageW} />,
      });
    });
    out.push({ key: 'next', front: <NextRoute width={pageW} pageNumber={passport.pageOrder.length + 2} />, back: <SheetBack width={pageW} /> });
    return out;
  }, [passport.pageOrder, routes, pageW]);

  const stamps = Object.values(routes).reduce((a, r) => a + r.stamps.length, 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: neutral.bg }} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 24, paddingHorizontal: 16, alignItems: 'center' }}>
      <Animated.View entering={rise(0)} style={s.head}>
        <Text style={type.overline}>Pasaporte</Text>
        <Text style={s.title}>Mis sellos</Text>
        <Text style={type.caption}>
          {stamps ? `${stamps} ${stamps === 1 ? 'sello' : 'sellos'} en ${passport.pageOrder.length} ${passport.pageOrder.length === 1 ? 'ruta' : 'rutas'} · Pasa las hojas con el dedo` : 'Ábrelo y pasa las hojas con el dedo. Cada ruta tendrá su hoja con el primer sello.'}
        </Text>
      </Animated.View>
      {/* La libreta llega desde un poco más pequeña, como si se acercara a la mano */}
      <Animated.View entering={ZoomIn.springify().damping(20).stiffness(160).delay(80).withInitialValues({ transform: [{ scale: 0.92 }] })}>
      <Book leaves={leaves} width={pageW} spread={spread} index={Math.min(index, leaves.length - 1)} onIndex={setIndex} />
      </Animated.View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  head: { alignSelf: 'stretch', marginBottom: 16, gap: 2 },
  title: { fontFamily: font.serif, fontSize: 30, color: neutral.ink, letterSpacing: -0.5 },
});
