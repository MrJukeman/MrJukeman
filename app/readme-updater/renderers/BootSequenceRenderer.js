import { Random } from 'random';

const BOOT_STEPS = [
  (ctx) => `[${ctx.ms(12)}] mounting Heart.Corner … ok`,
  (ctx) => `[${ctx.ms(28)}] uplink GitHub … Live`,
  (ctx) =>
    `[${ctx.ms(41)}] GAMING.DOCK … ${ctx.perfectTotal} perfect · Steam ${ctx.steamLabel}`,
  (ctx) => `[${ctx.ms(67)}] butterfly swarm … ${ctx.butterflyCount} spawned · 1 homeward`,
  (ctx) => `[${ctx.ms(89)}] wallpaper seed … ${ctx.wallpaperId}`,
  (ctx) => `[${ctx.ms(102)}] AryaOS ready — operator @${ctx.username}`,
];

const BUTTERFLY_HINT_STEPS = [
  (ctx) => `[${ctx.ms(55)}] migration route … Heart.Corner lock acquired`,
  (ctx) => `[${ctx.ms(58)}] seeker wingbeat … pink signature detected`,
  (ctx) => `[${ctx.ms(61)}] golden trail … sparkle path active`,
  (ctx) => `[${ctx.ms(64)}] golden spawn … legendary entity in swarm`,
  (ctx) => `[${ctx.ms(59)}] one carries a message · destination unknown`,
  (ctx) => `[${ctx.ms(57)}] constellation … beacon triangulated`,
];

class BootSequenceRenderer {
  static render(seed, context = {}) {
    const rng = new Random(seed);
    const ctx = this.createContext(context);
    const steps = BOOT_STEPS.map((build) => build(ctx));

    if (context.legendary) {
      steps.push(BUTTERFLY_HINT_STEPS[3](ctx));
    }

    steps.push(...BUTTERFLY_HINT_STEPS.filter((_, index) => index !== 3));

    const index = rng.int(0, steps.length - 1);
    return this.escapeXml(steps[index]);
  }

  static createContext(context) {
    let tick = 0;
    return {
      username: context.username || 'operator',
      butterflyCount: context.butterflyCount ?? 0,
      perfectTotal: context.perfectTotal ?? 0,
      steamLabel: context.steamOnline ? 'Online' : 'Offline',
      wallpaperId: context.wallpaperId || '0x00',
      ms(value) {
        tick = value;
        return (value / 1000).toFixed(3);
      },
    };
  }

  static escapeXml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }
}

export default BootSequenceRenderer;
