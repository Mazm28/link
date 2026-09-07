import type { Activity, Block, BlockIndex, UserId } from '../domain';

/* ===========================================================================
 * Block visibility — INV-1, BR-U1-30, US-72
 *
 * OWNERSHIP: `core/rules/visibility` belongs to U6, which builds the full
 * blocking feature. U1 implements it now, in its conservative form, because
 * the repository read pipeline calls it on every read — and a no-op stub would
 * mean every read path written between U1 and U6 is one that does NOT filter.
 * Those paths get tested, demoed, and built on. Turning safety on later is
 * always harder than never turning it off.
 *
 * U6 adds the screens (block, unblock, blocked list) and the property test
 * over every read path. The rule itself does not need to change.
 * =========================================================================== */

/**
 * Blocks are stored one-directionally and enforced BIDIRECTIONALLY (US-72).
 *
 * One `Block` row means neither party sees the other. Storing both directions
 * would risk the two rows diverging, and a half-applied block — where A cannot
 * see B but B still sees A — is worse than no block at all, because the person
 * who asked for protection believes they have it.
 */
export function buildBlockIndex(blocks: readonly Block[]): BlockIndex {
  const both = new Map<UserId, Set<UserId>>();

  const link = (x: UserId, y: UserId) => {
    const set = both.get(x) ?? new Set<UserId>();
    set.add(y);
    both.set(x, set);
  };

  for (const block of blocks) {
    link(block.blockerId, block.blockedId);
    link(block.blockedId, block.blockerId);
  }

  return {
    has: (x, y) => both.get(x)?.has(y) ?? false,
    blockedFor: (user) => both.get(user) ?? new Set<UserId>(),
  };
}

/**
 * U6 / BR-U6-30 — ⚠️ THE SINGLE PREDICATE EVERY U6 READ PATH USES.
 *
 * "Is `otherId` invisible to `viewerId`?" — true when a block exists in either
 * direction. `buildBlockIndex` already links both ways, so this needs no
 * direction logic of its own.
 *
 * ⚠️ One predicate, nine call sites, on purpose. US-72's criterion is that a
 * blocked person is absent from EVERY read path, and nine hand-written
 * comparisons are nine chances for one of them to be subtly different. If the
 * rule ever changes it changes here, and P-U6-01 covers all nine at once.
 *
 * A null viewer (signed out) hides nobody: there is no block set to consult,
 * and returning true would empty every public read.
 */
export function isHiddenFrom(
  viewerId: UserId | null,
  otherId: UserId,
  blocks: BlockIndex,
): boolean {
  if (viewerId === null) return false;
  return blocks.has(viewerId, otherId);
}

/** True when no block exists in EITHER direction between the two users. */
export function isMutuallyUnblocked(x: UserId, y: UserId, blocks: BlockIndex): boolean {
  return !blocks.has(x, y);
}

/**
 * INV-1 — remove every activity authored by anyone blocked in either
 * direction.
 *
 * Runs INSIDE the repository read, before ranking and before pagination
 * (business-logic-model.md §2). Filtering later would produce short pages and
 * leak the existence of blocked content through result counts.
 */
export function filterVisibleActivities<T extends Pick<Activity, 'authorId'>>(
  activities: readonly T[],
  viewerId: UserId | null,
  blocks: BlockIndex,
): T[] {
  if (viewerId === null) return [...activities];
  const hidden = blocks.blockedFor(viewerId);
  return activities.filter((activity) => !hidden.has(activity.authorId));
}

/** Whether the viewer may send a join request to this author. Used by U4;
 *  declared here so the block check has one implementation, not two. */
export function canSendRequestTo(viewerId: UserId, authorId: UserId, blocks: BlockIndex): boolean {
  return viewerId !== authorId && isMutuallyUnblocked(viewerId, authorId, blocks);
}
