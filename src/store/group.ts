import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { canHost } from '@/lib/entitlements';
import { bleAvailability, bleSupported, createBleGuest, createBleHost, type BleAvailability } from '@/lib/group/ble';
import { GroupGuest, type GuestAttempt, type GuestEnd, type GuestStatus, type JoinResult } from '@/lib/group/guest';
import { GroupHost } from '@/lib/group/host';
import { createMemoryGuest, createMemoryHost, hasMemoryHost } from '@/lib/group/memory';
import { BLE_TIMEOUT_MS, buildJoinLink, isCode, NET_TIMEOUT_MS, newCode, normalizeCode, randomId, type JoinModes, type Member, type StateMsg, type StatePatch } from '@/lib/group/protocol';
import { createNetGuest, createNetHost, netConfigured } from '@/lib/group/supabase';
import type { TransportKind } from '@/lib/group/transport';
import { usePassport } from '@/store/passport';

/*
 * Visita en grupo (docs/visita-en-grupo.md): la sesión de ahora. El anfitrión
 * abre internet y Bluetooth a la vez; el invitado prueba internet (3 s) y luego
 * Bluetooth. Solo se guarda `memberId` (aleatorio por instalación): un grupo no
 * sobrevive a cerrar la app.
 */

export type GroupRole = 'host' | 'guest';
export type GroupStatus = GuestStatus;
/** Internet en el anfitrión: abierto, arrancando, sin configurar (la app no trae Supabase) o sin conexión */
export type NetAvail = 'on' | 'starting' | 'off' | 'offline';
/** Bluetooth en el anfitrión: abierto, arrancando, o por qué no */
export type BleAvail = 'on' | 'starting' | Exclude<BleAvailability, 'ok'>;

export interface GroupSession {
  role: GroupRole | null;
  code: string | null;
  tourId: string | null;
  /** El anfitrión (en el anfitrión, él mismo) */
  host: Member | null;
  /** Invitados conectados (sin el anfitrión) */
  members: Member[];
  /** Transportes abiertos (anfitrión) o el que se usa (invitado) */
  transports: TransportKind[];
  status: GroupStatus | null;
  /** Invitado: por dónde está conectado */
  via: TransportKind | null;
  /** Invitado: ha tocado su reproductor y va «a su aire» */
  adrift: boolean;
  /** Último estado del grupo (en el anfitrión, el que manda) */
  state: StateMsg | null;
  /** Anfitrión: cómo está cada transporte (para «Por internet ✓ / Bluetooth ✓» o por qué no) */
  avail: { net: NetAvail; ble: BleAvail } | null;
}

interface GroupState extends GroupSession {
  /** Id de esta instalación en los grupos (8 caracteres, se guarda) */
  memberId: string;
  /** Cómo acabó el último grupo del invitado ('ended' cerró el anfitrión, 'lost' se perdió, 'full' estaba lleno) */
  outcome: Exclude<GuestEnd, 'left'> | null;
  /** Abre un grupo de este tour (false si no puede: tour de pago sin comprar, o que no existe) */
  hostGroup: (tourId: string) => Promise<boolean>;
  /** Se une a un grupo. `modes` (del QR) dice qué transportes probar; `tourId` es solo una pista hasta oír al anfitrión. */
  joinGroup: (opts: { code: string; tourId?: string; modes?: JoinModes; name?: string }) => Promise<JoinResult>;
  /** Invitado: sale del grupo (se queda con lo sellado). Anfitrión: lo mismo que `endGroup`. */
  leaveGroup: () => Promise<void>;
  /** Anfitrión: cierra el grupo para todos */
  endGroup: () => Promise<void>;
  /** Anfitrión: cambia parada, llegada o audio del grupo */
  publish: (patch: StatePatch) => void;
  setAdrift: (on: boolean) => void;
  /** Anfitrión en modo prueba: añade un invitado de mentira (transporte en memoria). false si está lleno. */
  simulateGuest: (name?: string) => Promise<boolean>;
  clearOutcome: () => void;
}

const idle: GroupSession = { role: null, code: null, tourId: null, host: null, members: [], transports: [], status: null, via: null, adrift: false, state: null, avail: null };

let host: GroupHost | null = null;
let guest: GroupGuest | null = null;
let simulated: GroupGuest[] = [];

const ownerName = (fallback: string) => usePassport.getState().passport.owner.trim() || fallback;

/** La hora del anfitrión (ms): en el invitado, con el desfase de reloj medido; en el anfitrión, la suya */
export const groupHostNow = () => (guest ? guest.clock.hostNow() : Date.now());

/** Enlace del QR del grupo del anfitrión (null si no hay grupo abierto) */
export function hostJoinLink(s: Pick<GroupSession, 'role' | 'code' | 'tourId' | 'host' | 'transports'>): string | null {
  if (s.role !== 'host' || !s.code || !s.tourId) return null;
  return buildJoinLink({ code: s.code, tourId: s.tourId, hostName: s.host?.name, modes: { net: s.transports.includes('net'), ble: s.transports.includes('ble') } });
}

/** Cierra lo que hubiera abierto sin tocar el store */
async function teardown() {
  const h = host;
  const g = guest;
  const sims = simulated;
  host = null;
  guest = null;
  simulated = [];
  await Promise.all([...sims.map(x => x.leave()), g?.leave(), h?.end()]);
}

export const useGroup = create<GroupState>()(
  persist(
    (set, get) => ({
      ...idle,
      memberId: randomId(8),
      outcome: null,
      hostGroup: async tourId => {
        if (!canHost(tourId)) return false;
        await teardown();
        const me: Member = { id: get().memberId, name: ownerName('Anfitrión') };
        const walk = usePassport.getState().walk;
        const h = new GroupHost({ code: newCode(), tourId, host: me, target: walk?.tourId === tourId ? walk.target : 0 });
        host = h;
        const ble = bleSupported();
        set({ ...idle, role: 'host', code: h.code, tourId, host: me, state: h.state, status: 'connecting', outcome: null, avail: { net: netConfigured() ? 'starting' : 'off', ble: ble ? 'starting' : 'unsupported' } });
        h.subscribe(x => { if (host === x) set({ members: x.members, transports: x.kinds, state: x.state }); });
        const setAvail = (patch: Partial<NonNullable<GroupSession['avail']>>) => { if (host === h) set(s => ({ avail: { ...s.avail!, ...patch } })); };
        await h.start([]);
        await Promise.all([
          netConfigured() && h.addTransport(createNetHost()).then(ok => setAvail({ net: ok ? 'on' : 'offline' })),
          ble && bleAvailability().then(async a => {
            if (a !== 'ok') { setAvail({ ble: a }); return; }
            setAvail({ ble: (await h.addTransport(createBleHost())) ? 'on' : 'unsupported' });
          }),
        ]);
        // Sin ningún transporte el grupo sigue abierto (se ve por qué, y en modo prueba se pueden simular invitados)
        if (host === h) set({ status: h.kinds.length ? 'connected' : 'lost', transports: h.kinds });
        return true;
      },
      joinGroup: async ({ code: raw, tourId, modes, name }) => {
        const code = normalizeCode(raw);
        if (!isCode(code)) return 'notFound';
        await teardown();
        const memberId = get().memberId;
        const attempts: GuestAttempt[] = [];
        // El grupo de «Simular invitado» vive en esta misma app
        if (hasMemoryHost(code)) attempts.push({ kind: 'memory', make: createMemoryGuest, timeoutMs: 1_000 });
        if ((modes?.net ?? true) && netConfigured()) attempts.push({ kind: 'net', make: () => createNetGuest(memberId), timeoutMs: NET_TIMEOUT_MS });
        if ((modes?.ble ?? true) && bleSupported()) attempts.push({ kind: 'ble', make: createBleGuest, timeoutMs: BLE_TIMEOUT_MS });
        const g = new GroupGuest({ code, member: { id: memberId, name: (name ?? '').trim().slice(0, 24) || ownerName('Invitado') }, attempts });
        guest = g;
        set({ ...idle, role: 'guest', code, tourId: tourId ?? null, status: 'connecting', outcome: null });
        g.subscribe(x => {
          if (guest !== x) return;
          if (x.ended) {
            guest = null;
            set({ ...idle, outcome: x.ended === 'left' ? null : x.ended });
            return;
          }
          const st = x.state;
          set({ status: x.status, via: x.via, transports: x.via ? [x.via] : [], state: st, ...(st ? { host: st.host, members: st.members, tourId: st.tourId } : {}) });
        });
        const r = await g.start();
        // No encontrarlo no es «el grupo se ha perdido»: la pantalla de unirse lo dice ella
        if (r === 'notFound') set({ outcome: null });
        return r;
      },
      leaveGroup: async () => {
        await teardown();
        set({ ...idle });
      },
      endGroup: async () => {
        await teardown();
        set({ ...idle });
      },
      publish: patch => { host?.update(patch); },
      setAdrift: adrift => set(s => (s.adrift === adrift ? s : { adrift })),
      simulateGuest: async name => {
        const h = host;
        if (!h) return false;
        if (!h.kinds.includes('memory')) await h.addTransport(createMemoryHost());
        const g = new GroupGuest({
          code: h.code,
          member: { id: randomId(8), name: name ?? `Invitado ${simulated.length + 1}` },
          attempts: [{ kind: 'memory', make: createMemoryGuest, timeoutMs: 1_000 }],
        });
        const r = await g.start();
        if (r !== 'ok' || host !== h) { await g.leave(); return false; }
        simulated.push(g);
        return true;
      },
      clearOutcome: () => set({ outcome: null }),
    }),
    { name: 'paseo-group', storage: createJSONStorage(() => AsyncStorage), partialize: s => ({ memberId: s.memberId }) },
  ),
);
