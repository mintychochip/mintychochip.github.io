import { describe, expect, it } from 'vitest';
import { passScenes } from './pass-scenes';

describe('passScenes', () => {
  it('matches each gift to its scene by icon', () => {
    expect(passScenes(['massage', 'dinner', 'boba', 'movie', 'crown', 'getaway'])).toEqual(['onsen', 'waterfall', 'lake', 'cave', 'meadow', 'beach']);
  });

  it('gives an unknown icon the first scene not yet on the page', () => {
    expect(passScenes(['massage', 'kite', 'boba'])).toEqual(['onsen', 'beach', 'lake']);
  });

  it('treats an icon named like an object property as unknown', () => {
    expect(passScenes(['constructor', 'toString'])).toEqual(['lake', 'beach']);
  });
});
