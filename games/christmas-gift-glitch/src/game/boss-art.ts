import wrap9000Url from '../../assets/meta/boss-wrap-9000.webp'

/**
 * Chapter-indexed boss portraits (board cell + HUD chip). Lives in the game
 * layer because it pulls asset URLs, which pure meta modules must not do —
 * `map.test.ts` loads those under plain node.
 */
/** WRAP-9000 returns with one more bad idea at each boss dispatch. */
export function bossArtFor(_levelIndex: number): string {
  return wrap9000Url
}
