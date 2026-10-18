import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TOURS } from '@/data/tours';
import { canHost, canPlay } from '@/lib/entitlements';
import { ClockSync, expectedPosition } from '@/lib/group/clock';
import { Reassembler, toFrames, utf8Length } from '@/lib/group/frames';
import { GroupGuest } from '@/lib/group/guest';
import { GroupHost } from '@/lib/group/host';
import { createMemoryGuest, createMemoryHost, setMemoryLink, type MemoryGuest } from '@/lib/group/memory';
import { buildJoinLink, CODE_ALPHABET, isCode, MAX_MEMBERS, newCode, normalizeCode, parseJoinLink, parseMsg, type GroupMsg, type StateMsg } from '@/lib/group/protocol';
import { applyGuestState } from '@/lib/group/useGroupWalk';
import { useGroup } from '@/store/group';
import { routeProgress, usePassport } from '@/store/passport';
import { usePurchases } from '@/store/purchases';

// Sin módulo nativo: Bluetooth no está (como en web o Expo Go)
jest.mock('../../../modules/paseo-ble', () => ({ isAvailable: () => false }));

describe('código y enlace del QR', () => {
  it('el código tiene 6 caracteres del alfabeto sin letras dudosas', () => {
    for (let i = 0; i < 50; i++) {
      const c = newCode();
      expect(isCode(c)).toBe(true);
      expect(c).not.toMatch(/[01OIL]/);
      expect(c.split('').every(ch => CODE_ALPHABET.includes(ch))).toBe(true);
    }
  });

  it('lo tecleado se normaliza', () => {
    expect(normalizeCode(' abc-def ')).toBe('ABCDEF');
    expect(isCode(normalizeCode('abc 234'))).toBe(true);
    expect(isCode('ABCDE')).toBe(false);
    expect(isCode('ABCDE0')).toBe(false);
  });

  it('el enlace va y vuelve', () => {
    const link = buildJoinLink({ code: 'K7M2QX', tourId: 'sevilla-centro', hostName: 'María José & Cía', modes: { net: true, ble: true } });
    expect(link.startsWith('paseo://unirse?c=K7M2QX&t=sevilla-centro&h=')).toBe(true);
    expect(link.endsWith('&m=nb')).toBe(true);
    expect(parseJoinLink(link)).toEqual({ code: 'K7M2QX', tourId: 'sevilla-centro', hostName: 'María José & Cía', modes: { net: true, ble: true } });
    expect(parseJoinLink(buildJoinLink({ code: 'K7M2QX', modes: { net: false, ble: true } }))).toEqual({ code: 'K7M2QX', modes: { net: false, ble: true } });
  });

  it('acepta el enlace de Expo Go y el código suelto; rechaza lo demás', () => {
    expect(parseJoinLink('exp://192.168.1.2:8081/--/unirse?c=K7M2QX&t=tomares-4-paradas')?.tourId).toBe('tomares-4-paradas');
    expect(parseJoinLink('k7m2qx')).toEqual({ code: 'K7M2QX' });
    expect(parseJoinLink('paseo://otra?c=K7M2QX')).toBeNull();
    expect(parseJoinLink('paseo://unirse?c=XX')).toBeNull();
    expect(parseJoinLink('https://example.com')).toBeNull();
  });
});

const state = (over: Partial<StateMsg> = {}): StateMsg => ({
  v: 1, k: 'state', seq: 1, tourId: 'sevilla-centro', host: { id: 'HOST0001', name: 'Ana' }, members: [], target: 0, arrived: null, audio: null, ended: false, ...over,
});

describe('mensajes', () => {
  it('valida cada tipo', () => {
    const msgs: GroupMsg[] = [
      state({ audio: { key: 'stop:giralda', playing: true, position: 12.5, rate: 1.25, at: 1000 } }),
      { v: 1, k: 'hello', member: { id: 'ABCDEFGH', name: 'Luis' } },
      { v: 1, k: 'bye', id: 'ABCDEFGH' },
      { v: 1, k: 'ping', id: 'ABCDEFGH', t0: 5 },
      { v: 1, k: 'pong', id: 'ABCDEFGH', t0: 5, t1: 9 },
      { v: 1, k: 'full', id: 'ABCDEFGH' },
    ];
    for (const m of msgs) expect(parseMsg(JSON.stringify(m))).toEqual(m);
  });

  it('rechaza lo que no cuadra', () => {
    expect(parseMsg('no es json')).toBeNull();
    expect(parseMsg({ ...state(), v: 2 })).toBeNull();
    expect(parseMsg({ v: 1, k: 'otro' })).toBeNull();
    expect(parseMsg({ ...state(), target: -1 })).toBeNull();
    expect(parseMsg({ ...state(), audio: { key: 'x', playing: 'sí', position: 0, rate: 1, at: 0 } })).toBeNull();
    expect(parseMsg({ ...state(), members: Array.from({ length: MAX_MEMBERS }, (_, i) => ({ id: `M${i}`, name: 'x' })) })).toBeNull();
    expect(parseMsg({ v: 1, k: 'ping', id: 'A' })).toBeNull();
    expect(parseMsg({ v: 1, k: 'hello', member: { id: '', name: 'x' } })).toBeNull();
  });
});

describe('tramas', () => {
  const text = JSON.stringify(state({ members: [{ id: 'AAAAAAAA', name: 'Begoña Muñoz ✨' }, { id: 'BBBBBBBB', name: 'Íñigo 🚶' }], arrived: 'plaza-de-españa' })).repeat(3);

  it('trocea sin pasar del tamaño y sin partir caracteres', () => {
    const frames = toFrames(text, 60);
    expect(frames.length).toBeGreaterThan(5);
    for (const f of frames) expect(utf8Length(f)).toBeLessThanOrEqual(60);
    const r = new Reassembler();
    let out: string | null = null;
    for (const f of frames) out = r.push(f) ?? out;
    expect(out).toBe(text);
  });

  it('un mensaje corto va en un solo trozo', () => {
    const frames = toFrames('{"v":1}');
    expect(frames).toHaveLength(1);
    expect(new Reassembler().push(frames[0])).toBe('{"v":1}');
  });

  it('junta trozos desordenados y de dos emisores a la vez', () => {
    const a = toFrames(text, 50, 'a1');
    const b = toFrames(text.toUpperCase(), 50, 'a1');
    const r = new Reassembler();
    const got: string[] = [];
    const order = [...a.map(f => ['x', f] as const), ...b.map(f => ['y', f] as const)].reverse();
    for (const [from, f] of order) { const m = r.push(f, from); if (m) got.push(m); }
    expect(got.sort()).toEqual([text, text.toUpperCase()].sort());
    expect(r.size).toBe(0);
  });

  it('descarta los mensajes incompletos a los 5 s', () => {
    let t = 0;
    const r = new Reassembler(() => t);
    const frames = toFrames(text, 50);
    r.push(frames[0]);
    expect(r.size).toBe(1);
    t = 5_001;
    expect(r.size).toBe(0);
    // El resto, ya tarde, no completa nada
    for (const f of frames.slice(1)) expect(r.push(f)).toBeNull();
    expect(r.push('basura')).toBeNull();
  });
});

describe('reloj', () => {
  it('se queda con el desfase de la muestra de menor RTT', () => {
    const c = new ClockSync(() => 0);
    // El reloj del anfitrión va 1000 ms por delante
    c.addSample(0, 1000 + 100, 300); // rtt 300 → offset 950 (sesgada)
    c.addSample(400, 1400 + 20, 440); // rtt 40 → offset 1000
    c.addSample(500, 1500 + 200, 900); // rtt 400, se ignora
    expect(c.rtt).toBe(40);
    expect(c.offset).toBe(1000);
    expect(c.samples).toBe(3);
  });

  it('calcula la posición esperada', () => {
    const a = { key: 'stop:x', playing: true, position: 10, rate: 1.5, at: 1_000 };
    expect(expectedPosition(a, 5_000)).toBeCloseTo(16);
    expect(expectedPosition({ ...a, playing: false }, 5_000)).toBe(10);
  });
});

describe('anfitrión e invitados en memoria', () => {
  let code: string;
  let host: GroupHost;
  const guests: GroupGuest[] = [];

  beforeEach(async () => {
    jest.useFakeTimers();
    code = newCode();
    host = new GroupHost({ code, tourId: 'sevilla-centro', host: { id: 'HOST0001', name: 'Ana' } });
    await host.start([createMemoryHost()]);
  });
  afterEach(async () => {
    for (const g of guests.splice(0)) await g.leave();
    await host.stop();
    jest.useRealTimers();
  });

  function newGuest(i: number, transports: MemoryGuest[] = []) {
    const g = new GroupGuest({
      code,
      member: { id: `GUEST00${i}`, name: `Invitado ${i}` },
      attempts: [{ kind: 'memory', make: () => { const t = createMemoryGuest(); transports.push(t); return t; }, timeoutMs: 1_000 }],
    });
    guests.push(g);
    return g;
  }

  it('quien entra tarde se pone al día y ve los cambios', async () => {
    host.update({ target: 2, arrived: 'giralda' });
    const g = newGuest(1);
    expect(await g.start()).toBe('ok');
    expect(g.status).toBe('connected');
    expect(g.via).toBe('memory');
    expect(g.state).toMatchObject({ target: 2, arrived: 'giralda', members: [{ id: 'GUEST001', name: 'Invitado 1' }] });
    host.update({ target: 3, arrived: null, audio: { key: 'stop:catedral', playing: true, position: 0, rate: 1, at: Date.now() } });
    await jest.advanceTimersByTimeAsync(10);
    expect(g.state?.target).toBe(3);
    expect(g.state?.audio?.key).toBe('stop:catedral');
    // Sincronía de reloj: los pings del principio tienen respuesta
    await jest.advanceTimersByTimeAsync(1_500);
    expect(g.clock.samples).toBeGreaterThanOrEqual(5);
    expect(Math.abs(g.clock.offset)).toBeLessThan(5);
  });

  it('el grupo se llena a las 8 personas', async () => {
    for (let i = 1; i < MAX_MEMBERS; i++) expect(await newGuest(i).start()).toBe('ok');
    expect(host.members).toHaveLength(MAX_MEMBERS - 1);
    const late = newGuest(9);
    expect(await late.start()).toBe('full');
    expect(late.ended).toBe('full');
    expect(host.members).toHaveLength(MAX_MEMBERS - 1);
    // Si uno sale, queda sitio
    await guests[0].leave();
    await jest.advanceTimersByTimeAsync(10);
    expect(host.members).toHaveLength(MAX_MEMBERS - 2);
    expect(await newGuest(10).start()).toBe('ok');
  });

  it('caída del invitado: el anfitrión lo quita y el invitado vuelve a entrar', async () => {
    const ts: MemoryGuest[] = [];
    const g = newGuest(1, ts);
    await g.start();
    ts[0].drop();
    await jest.advanceTimersByTimeAsync(10);
    expect(host.members).toHaveLength(1);
    expect(g.status).toBe('connected');
    expect(ts).toHaveLength(2);
  });

  it('sin estado en 15 s, reconectando; a los 2 min, perdido. El anfitrión quita al callado a los 20 s', async () => {
    const g = newGuest(1);
    await g.start();
    setMemoryLink(code, false);
    await jest.advanceTimersByTimeAsync(16_000);
    expect(g.status).toBe('reconnecting');
    // Vuelve la línea: se reconecta
    setMemoryLink(code, true);
    await jest.advanceTimersByTimeAsync(5_000);
    expect(g.status).toBe('connected');
    expect(host.members).toHaveLength(1);
    // Otra vez sin línea, ya para siempre
    setMemoryLink(code, false);
    await jest.advanceTimersByTimeAsync(25_000);
    expect(host.members).toHaveLength(0);
    await jest.advanceTimersByTimeAsync(100_000);
    expect(g.ended).toBe('lost');
    expect(g.status).toBe('lost');
  });

  it('cuando el anfitrión cierra, el invitado se entera', async () => {
    const g = newGuest(1);
    await g.start();
    const done = host.end();
    await jest.advanceTimersByTimeAsync(500);
    await done;
    expect(g.ended).toBe('ended');
    expect(g.state?.ended).toBe(true);
  });

  it('no hay grupo con ese código', async () => {
    const g = new GroupGuest({ code: 'ZZZZZZ', member: { id: 'GUEST999', name: 'x' }, attempts: [{ kind: 'memory', make: createMemoryGuest, timeoutMs: 1_000 }] });
    expect(await g.start()).toBe('notFound');
  });
});

describe('el paseo del invitado sigue al anfitrión', () => {
  beforeEach(() => { usePassport.getState().reset(); });

  it('empieza el paseo, va a la parada del grupo y llega cuando llega el anfitrión', () => {
    const tour = TOURS[0];
    let r = applyGuestState(state({ tourId: tour.id, target: 1 }), null);
    expect(usePassport.getState().walk).toMatchObject({ tourId: tour.id, target: 1, arrived: null });
    expect(usePassport.getState().routes[tour.id]?.via).toBe('grupo');
    r = applyGuestState(state({ tourId: tour.id, target: 1, arrived: tour.stops[1].id }), r.mark);
    expect(r.arrival).toEqual({ idx: 1, repeat: false });
    expect(usePassport.getState().walk?.arrived).toBe(tour.stops[1].id);
    // El mismo estado otra vez (latido) no repite la llegada
    r = applyGuestState(state({ tourId: tour.id, target: 1, arrived: tour.stops[1].id, seq: 2 }), r.mark);
    expect(r.arrival).toBeNull();
    expect(usePassport.getState().routes[tour.id].history).toHaveLength(1);
  });

  it('una ruta hecha en grupo cuenta como ganada', () => {
    const tour = TOURS[0];
    applyGuestState(state({ tourId: tour.id }), null);
    for (const st of tour.stops) usePassport.getState().placeStamp(tour.id, st.id, { x: 0.5, y: 0.5, rot: 0, seed: 1 });
    const route = usePassport.getState().routes[tour.id];
    expect(route.via).toBe('grupo');
    expect(routeProgress(tour.id, route).completed).toBe(true);
  });

  it('una ruta ya empezada por su cuenta no pasa a ser «en grupo»', () => {
    const tour = TOURS[0];
    usePassport.getState().placeStamp(tour.id, tour.stops[0].id, { x: 0.5, y: 0.5, rot: 0, seed: 1 });
    applyGuestState(state({ tourId: tour.id }), null);
    expect(usePassport.getState().routes[tour.id].via).toBeUndefined();
  });
});

describe('tours de pago', () => {
  const paid = { ...TOURS[0], id: 'pago-prueba', price: { eur: 4.99 } };
  beforeEach(() => { TOURS.push(paid); });
  afterEach(() => { TOURS.splice(TOURS.indexOf(paid), 1); usePurchases.setState({ owned: {} }); });

  const guestOf = (tourId: string, status: 'connected' | 'lost' = 'connected') => ({ role: 'guest' as const, tourId, status });

  it('gratis: se hace y se abre grupo', () => {
    expect(canPlay(TOURS[0].id, { owned: {} })).toBe(true);
    expect(canHost(TOURS[0].id, { owned: {} })).toBe(true);
  });

  it('de pago: solo comprado, o de invitado en un grupo vivo (sin poder abrir grupo)', () => {
    expect(canPlay(paid.id, { owned: {}, group: { role: null, tourId: null, status: null } })).toBe(false);
    expect(canHost(paid.id, { owned: {} })).toBe(false);
    expect(canPlay(paid.id, { owned: {}, group: guestOf(paid.id) })).toBe(true);
    expect(canHost(paid.id, { owned: {} })).toBe(false);
    expect(canPlay(paid.id, { owned: {}, group: guestOf(paid.id, 'lost') })).toBe(false);
    expect(canPlay(paid.id, { owned: {}, group: guestOf(TOURS[1].id) })).toBe(false);
    expect(canPlay(paid.id, { owned: {}, group: { role: 'host', tourId: paid.id, status: 'connected' } })).toBe(false);
    usePurchases.getState().simulateBuy(paid.id);
    expect(canPlay(paid.id)).toBe(true);
    expect(canHost(paid.id)).toBe(true);
  });

  it('los bloqueados (sin contenido) nunca', () => {
    expect(canPlay('triana', { owned: { triana: 'x' }, group: guestOf('triana') })).toBe(false);
    expect(canHost('triana', { owned: { triana: 'x' } })).toBe(false);
  });

  it('el anfitrión sin comprar no abre grupo', async () => {
    expect(await useGroup.getState().hostGroup(paid.id)).toBe(false);
    expect(useGroup.getState().role).toBeNull();
  });
});

describe('store del grupo', () => {
  afterEach(async () => { await useGroup.getState().endGroup(); jest.useRealTimers(); });

  it('sin internet ni Bluetooth el grupo se abre igual y en modo prueba se simulan invitados', async () => {
    jest.useFakeTimers();
    expect(useGroup.getState().memberId).toMatch(/^[A-Z2-9]{8}$/);
    expect(await useGroup.getState().hostGroup(TOURS[0].id)).toBe(true);
    let s = useGroup.getState();
    expect(s.role).toBe('host');
    expect(isCode(s.code)).toBe(true);
    expect(s.avail).toEqual({ net: 'off', ble: 'unsupported' });
    expect(s.status).toBe('lost');
    expect(await s.simulateGuest('Prueba')).toBe(true);
    s = useGroup.getState();
    expect(s.transports).toEqual(['memory']);
    expect(s.members.map(m => m.name)).toEqual(['Prueba']);
    s.publish({ target: 2 });
    expect(useGroup.getState().state?.target).toBe(2);
    const end = useGroup.getState().endGroup();
    await jest.advanceTimersByTimeAsync(500);
    await end;
    expect(useGroup.getState().role).toBeNull();
  });
});
