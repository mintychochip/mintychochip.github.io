import { hash } from '../field';
import { pond, type Scene, type SceneOpts, type SettingMaker } from '../life';
import type { PaletteName } from '../palette';
import { lake } from './lake';
import { beach } from './beach';
import { meadow } from './meadow';
import { onsen } from './onsen';
import { waterfall } from './waterfall';
import { cave } from './cave';

interface SceneEntry {
  make: SettingMaker;
  /** The palette it is painted in unless a pond asks for another. */
  palette: PaletteName;
}

/** Every scene a pond can show, in the order scenes are handed out. */
export const SCENES = {
  lake: { make: lake, palette: 'night' },
  beach: { make: beach, palette: 'dusk' },
  meadow: { make: meadow, palette: 'day' },
  onsen: { make: onsen, palette: 'snow' },
  waterfall: { make: waterfall, palette: 'moss' },
  cave: { make: cave, palette: 'potion' },
} satisfies Record<string, SceneEntry>;

export type SceneName = keyof typeof SCENES;
export const SCENE_NAMES = Object.keys(SCENES) as SceneName[];

/** A scene of the given kind, ready to render. */
export function makeScene(name: SceneName, W: number, H: number, o: SceneOpts = {}): Scene {
  const entry: SceneEntry = SCENES[name];
  return pond(W, H, o, entry.make);
}

/**
 * Gives each name its own scene, stable per name where possible: a name keeps its hashed scene unless an earlier
 * name in the list already took it. A page of six projects shows every scene once.
 */
export function assignScenes(names: readonly string[]): SceneName[] {
  const used = new Set<SceneName>();
  return names.map((name) => {
    const start = hash(name) % SCENE_NAMES.length;
    for (let j = 0; j < SCENE_NAMES.length; j++) {
      const s = SCENE_NAMES[(start + j) % SCENE_NAMES.length];
      if (!used.has(s) || used.size >= SCENE_NAMES.length) {
        used.add(s);
        return s;
      }
    }
    return SCENE_NAMES[start];
  });
}
