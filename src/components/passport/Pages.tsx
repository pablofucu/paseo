import { Image } from 'expo-image';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { PassportPaper } from '@/components/Paper';
import { TOURS } from '@/data/tours';
import { fechaRomana } from '@/lib/rubber';
import { sheetFor } from '@/lib/sheet';
import { useDebouncedSave } from '@/lib/useDebouncedSave';
import { knownRoutes, routeProgress, usePassport } from '@/store/passport';
import { font } from '@/theme/fonts';

/** Azul marino de la tapa y dorado estampado (guía de sellos, § 04) */
export const LEATHER = '#23324a';
const GOLD = ['#b8913d', '#f3dc93', '#b8913d'];
const GRAIN = require('../../../assets/passport/cover-grain.png');

const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '<');

/** Tapa de piel con el emblema y el rótulo en dorado. Sin escudos ni números reales. */
export const Cover = memo(function Cover({ width }: { width: number }) {
  const h = sheetFor(width).h;
  const owner = usePassport(s => s.passport.owner);
  const cx = width / 2, cy = h * 0.42, R = width * 0.2;
  return (
    <View style={{ width, height: h, borderRadius: 8, overflow: 'hidden', backgroundColor: LEATHER }}>
      {/* textura fina de la piel, horneada (scripts/build-passport-paper.mjs) */}
      <Image source={GRAIN} style={StyleSheet.absoluteFill} contentFit="fill" cachePolicy="memory" transition={0} />
      <Svg width={width} height={h}>
        <Defs>
          <LinearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={GOLD[0]} /><Stop offset="0.5" stopColor={GOLD[1]} /><Stop offset="1" stopColor={GOLD[2]} />
          </LinearGradient>
          <LinearGradient id="lomo" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#000" stopOpacity="0.55" /><Stop offset="0.05" stopColor="#000" stopOpacity="0.15" />
            <Stop offset="0.08" stopColor="#fff" stopOpacity="0.06" /><Stop offset="0.14" stopColor="#000" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x={10} y={10} width={width - 20} height={h - 20} rx={4} fill="none" stroke="url(#gold)" strokeOpacity={0.55} strokeWidth={1} />
        <SvgText x={cx} y={h * 0.17} textAnchor="middle" fontFamily={font.serif} fontSize={width * 0.085} letterSpacing={width * 0.012} fill="url(#gold)">PASAPORTE</SvgText>
        <SvgText x={cx} y={h * 0.17 + width * 0.08} textAnchor="middle" fontFamily={font.black} fontSize={width * 0.045} letterSpacing={width * 0.016} fill="url(#gold)">DE RUTAS</SvgText>
        {/* emblema: una brújula sobre un camino de paradas */}
        <G stroke="url(#gold)" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <Circle cx={cx} cy={cy} r={R} strokeWidth={2.4} />
          <Circle cx={cx} cy={cy} r={R * 0.86} strokeWidth={0.9} />
          <Path d={`M${cx} ${cy - R * 0.72} L${cx + R * 0.13} ${cy} L${cx} ${cy + R * 0.72} L${cx - R * 0.13} ${cy} Z`} strokeWidth={1.4} />
          <Path d={`M${cx - R * 0.72} ${cy} L${cx} ${cy - R * 0.13} L${cx + R * 0.72} ${cy} L${cx} ${cy + R * 0.13} Z`} strokeWidth={1.1} />
          <Path d={`M${cx - R * 1.6} ${cy + R * 1.55} C${cx - R * 0.8} ${cy + R * 1.1} ${cx - R * 0.2} ${cy + R * 1.9} ${cx + R * 0.5} ${cy + R * 1.45} S${cx + R * 1.3} ${cy + R * 1.2} ${cx + R * 1.6} ${cy + R * 1.5}`} strokeWidth={1.6} strokeDasharray="1 6" />
        </G>
        <Path d={`M${cx} ${cy - R * 0.72} L${cx + R * 0.13} ${cy} L${cx - R * 0.13} ${cy} Z`} fill="url(#gold)" />
        {[-1.6, 0.5, 1.6].map((k, i) => (
          <Circle key={i} cx={cx + R * k} cy={cy + R * (i === 1 ? 1.45 : i === 0 ? 1.55 : 1.5)} r={3.4} fill="url(#gold)" />
        ))}
        <SvgText x={cx} y={h * 0.86} textAnchor="middle" fontFamily={font.black} fontSize={width * 0.05} letterSpacing={width * 0.012} fill="url(#gold)">
          {(owner || 'Paseo').toUpperCase()}
        </SvgText>
        <Rect width={width} height={h} fill="url(#lomo)" />
      </Svg>
    </View>
  );
});

/** Reverso de una hoja (y forro de la tapa): papel sin contenido */
export const SheetBack = memo(function SheetBack({ width, lining }: { width: number; lining?: boolean }) {
  const h = sheetFor(width).h;
  return (
    <View style={{ width, height: h, borderRadius: 6, overflow: 'hidden', backgroundColor: lining ? '#e4dcc4' : undefined }}>
      {!lining && <PassportPaper width={width} height={h} spine="right" back />}
    </View>
  );
});

/** Hoja 1: el titular */
export const Holder = memo(function Holder({ width }: { width: number }) {
  const sheet = sheetFor(width);
  const passport = usePassport(s => s.passport);
  const routes = usePassport(s => s.routes);
  const setOwner = usePassport(s => s.setOwner);
  const [draft, setDraft] = useState<string | null>(null);
  // Una hoja guardada de una ruta que ya no existe no cuenta
  const pages = useMemo(() => knownRoutes(passport.pageOrder), [passport.pageOrder]);
  const done = pages.filter(id => routeProgress(id, routes[id]).completed).length;
  const name = draft ?? passport.owner;
  // El nombre se guarda mientras se escribe, no solo al salir del campo
  useDebouncedSave(draft, v => setOwner(v.trim()));
  const mrz = `P<PASEO<<${plain(passport.owner || 'VIAJERO')}`.padEnd(40, '<').slice(0, 40) +
    `\n${plain(fechaRomana(passport.issuedAt)).replace(/<+/g, '<')}<${TOURS.length}R${pages.length}`.padEnd(41, '<').slice(0, 41);
  const k = width / 330;
  return (
    <View style={{ width, height: sheet.h, borderRadius: 6, overflow: 'hidden' }}>
      <PassportPaper width={width} height={sheet.h} />
      <View style={{ padding: 18 * k, flex: 1 }}>
        <Text accessibilityRole="header" style={[h.over, { fontSize: 11 * k }]}>Titular</Text>
        <View style={{ flexDirection: 'row', gap: 16 * k, marginTop: 14 * k }}>
          <View style={[h.photo, { width: 92 * k, height: 116 * k }]}>
            <Svg width={60 * k} height={70 * k} viewBox="0 0 60 70">
              <Circle cx={30} cy={24} r={13} fill="#c9bb98" />
              <Path d="M6 70 C6 50 18 42 30 42 C42 42 54 50 54 70 Z" fill="#c9bb98" />
            </Svg>
            <Text style={[h.photoText, { fontSize: 9 * k }]}>FOTO</Text>
          </View>
          <View style={{ flex: 1, gap: 9 * k }}>
            <Field label="Nombre" k={k}>
              <TextInput
                value={name}
                placeholder="Tu nombre"
                placeholderTextColor="#a3967a"
                onChangeText={setDraft}
                onEndEditing={() => { if (draft != null) setOwner(draft.trim()); setDraft(null); }}
                onBlur={() => { if (draft != null) setOwner(draft.trim()); setDraft(null); }}
                maxLength={24}
                accessibilityLabel="Nombre del titular"
                style={[h.value, h.input, { fontSize: 17 * k }]}
              />
            </Field>
            <Field label="Expedido" k={k}><Text style={[h.value, { fontSize: 15 * k }]}>{fechaRomana(passport.issuedAt)}</Text></Field>
            <Field label="Rutas en curso" k={k}><Text style={[h.value, { fontSize: 15 * k }]}>{pages.length - done}</Text></Field>
            <Field label="Rutas completadas" k={k}><Text style={[h.value, { fontSize: 15 * k }]}>{done}</Text></Field>
          </View>
        </View>
        <Text style={[h.mrz, { fontSize: 10.5 * k, lineHeight: 15 * k }]} numberOfLines={2}>{mrz}</Text>
      </View>
      <Text style={[h.page, { fontSize: 12 * k }]}>1</Text>
    </View>
  );
});

function Field({ label, k, children }: { label: string; k: number; children: React.ReactNode }) {
  return (
    <View>
      <Text style={[h.label, { fontSize: 9 * k }]}>{label}</Text>
      {children}
    </View>
  );
}

/** Hoja en blanco del final */
export const NextRoute = memo(function NextRoute({ width, pageNumber }: { width: number; pageNumber: number }) {
  const sheet = sheetFor(width);
  const k = width / 330;
  return (
    <View style={{ width, height: sheet.h, borderRadius: 6, overflow: 'hidden' }}>
      <PassportPaper width={width} height={sheet.h} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 * k }}>
        <View style={[h.dash, { width: width * 0.5, height: width * 0.5 }]} />
        <Text accessibilityRole="header" style={[h.nextTitle, { fontSize: 22 * k, marginTop: 18 * k }]}>Próxima ruta</Text>
        <Text style={[h.nextSub, { fontSize: 13.5 * k }]}>Esta hoja aparecerá con tu próximo sello</Text>
      </View>
      <Text style={[h.mrz, { position: 'absolute', left: 18 * k, bottom: 14 * k, fontSize: 10.5 * k }]}>{'<'.repeat(24)}</Text>
      <Text style={[h.page, { fontSize: 12 * k }]}>{pageNumber}</Text>
    </View>
  );
});

const h = StyleSheet.create({
  over: { fontFamily: font.black, letterSpacing: 2, textTransform: 'uppercase', color: '#7d705a' },
  photo: { borderWidth: 1, borderColor: '#bfb08c', borderRadius: 4, alignItems: 'center', justifyContent: 'flex-end', backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  photoText: { position: 'absolute', top: 6, fontFamily: font.black, letterSpacing: 2, color: '#a3967a' },
  label: { fontFamily: font.black, letterSpacing: 1.6, textTransform: 'uppercase', color: '#8c7f66' },
  value: { fontFamily: font.serif, color: '#2b2418' },
  input: { padding: 0, margin: 0, borderBottomWidth: 1, borderBottomColor: 'rgba(90,67,32,0.25)' },
  mrz: { marginTop: 'auto', fontFamily: 'monospace', letterSpacing: 1, color: '#6f6450' },
  page: { position: 'absolute', right: 16, bottom: 12, fontFamily: font.black, color: '#7d705a' },
  dash: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(90,67,32,0.3)', borderRadius: 12 },
  nextTitle: { fontFamily: font.serif, color: '#2b2418' },
  nextSub: { fontFamily: font.bold, color: '#7d705a', textAlign: 'center', marginTop: 4 },
});
