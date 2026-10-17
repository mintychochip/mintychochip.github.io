import { SCENE_NAMES, type SceneName } from '../pond/scenes';

/** Each pass's pond suits its gift. Matched by icon: the titles are sealed, the icons are not. */
const BY_ICON: Record<string, SceneName> = {
  massage: 'onsen',
  dinner: 'waterfall',
  boba: 'lake',
  movie: 'cave',
  crown: 'meadow',
  getaway: 'beach',
};

/** The scene for each pass, in order: its icon's match, or else the first scene not yet used on the page. */
export function passScenes(icons: readonly string[]): SceneName[] {
  const matched = icons.map((icon) => (Object.hasOwn(BY_ICON, icon) ? BY_ICON[icon] : undefined));
  const used = new Set<SceneName>(matched.filter((s): s is SceneName => s !== undefined));
  return matched.map((known) => {
    if (known) return known;
    const next = SCENE_NAMES.find((s) => !used.has(s)) ?? SCENE_NAMES[0];
    used.add(next);
    return next;
  });
}
