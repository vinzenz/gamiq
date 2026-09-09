import bossMummyUrl from '../../assets/meta/boss-mummy.webp'
import bossScarecrowUrl from '../../assets/meta/boss-scarecrow.webp'
import bossSkeletonUrl from '../../assets/meta/boss-skeleton.webp'
import bossVampireUrl from '../../assets/meta/boss-vampire.webp'
import bossWerewolfUrl from '../../assets/meta/boss-werewolf.webp'
import bossWitchUrl from '../../assets/meta/boss-witch.webp'
import { chapterOf } from '../meta/chapters.ts'

/**
 * Chapter-indexed boss portraits (board cell + HUD chip). Lives in the game
 * layer because it pulls asset URLs, which pure meta modules must not do —
 * `map.test.ts` loads those under plain node.
 */
const BOSS_ART: readonly string[] = [
  bossWerewolfUrl,
  bossSkeletonUrl,
  bossWitchUrl,
  bossScarecrowUrl,
  bossMummyUrl,
  bossVampireUrl,
]

/** Boss portrait for the chapter a level belongs to. */
export function bossArtFor(levelIndex: number): string {
  const art = BOSS_ART[chapterOf(levelIndex)] ?? BOSS_ART[0]
  if (!art) throw new Error('no boss art configured')
  return art
}
