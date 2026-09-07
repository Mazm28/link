import {
  ReportIdCodec,
  type AccountStatus,
  type ActivityId,
  type Block,
  type BlockIndex,
  type ProfileView,
  type Report,
  type UserId,
} from '@core/domain';
import { ErrorCode, refusal } from '@core/errors';
import type { ReportInput, SafetyRepository } from '@core/repositories';
import { buildBlockIndex } from '@core/rules/visibility';
import type { MockContext } from './context';
import { requireAdmin } from './venueRepository';

export function createSafetyRepository(ctx: MockContext): SafetyRepository {
  /**
   * FR-63 — reports are stored with FULL CONTEXT from Round 1, even though
   * nothing reads them until the Round-3 console.
   *
   * Because there is no in-app chat (AR-04), `detail` and `evidenceUrls` are
   * the only evidence moderation will ever have about abuse that happened on
   * Telegram or in person. Capturing them later would mean the first months of
   * reports arrive with nothing attached.
   */
  const writeReport = (
    input: ReportInput & { reporterId: UserId },
    subject: { subjectUserId?: UserId; subjectActivityId?: ActivityId },
  ): Report => {
    const report: Report = {
      id: ReportIdCodec.create(),
      reporterId: input.reporterId,
      subjectKind: input.subjectKind,
      reasonCode: input.reasonCode,
      status: 'open',
      createdAt: new Date().toISOString(),
      ...(input.detail === undefined ? {} : { detail: input.detail }),
      ...(input.evidenceUrls === undefined ? {} : { evidenceUrls: input.evidenceUrls }),
      ...(input.relatedActivityId === undefined
        ? {}
        : { relatedActivityId: input.relatedActivityId }),
      ...(subject.subjectUserId === undefined ? {} : { subjectUserId: subject.subjectUserId }),
      ...(subject.subjectActivityId === undefined
        ? {}
        : { subjectActivityId: subject.subjectActivityId }),
    };

    ctx.store.mutate((s) => {
      s.reports.push(report);
    });
    return report;
  };

  return {
    async reportUser(input): Promise<Report> {
      await ctx.delay();
      return writeReport(input, { subjectUserId: input.subjectUserId });
    },

    async reportActivity(input): Promise<Report> {
      await ctx.delay();
      return writeReport(input, { subjectActivityId: input.subjectActivityId });
    },

    /**
     * US-72 — stored one-directionally, enforced bidirectionally.
     *
     * One row means neither party sees the other. Writing two rows would risk
     * them diverging, and a half-applied block is worse than none: the person
     * who asked for protection believes they have it.
     */
    async blockUser(blockerId: UserId, blockedId: UserId): Promise<Block> {
      await ctx.delay();
      if (blockerId === blockedId) refusal('self_block', 'errors.forbidden');

      const block: Block = { blockerId, blockedId, createdAt: new Date().toISOString() };
      ctx.store.mutate((s) => {
        const exists = s.blocks.some(
          (b) =>
            (b.blockerId === blockerId && b.blockedId === blockedId) ||
            (b.blockerId === blockedId && b.blockedId === blockerId),
        );
        if (!exists) s.blocks.push(block);
      });
      return block;
    },

    async unblockUser(blockerId: UserId, blockedId: UserId): Promise<void> {
      await ctx.delay();
      ctx.store.mutate((s) => {
        s.blocks = s.blocks.filter(
          (b) => !(b.blockerId === blockerId && b.blockedId === blockedId),
        );
      });
    },

    async listBlocks(userId: UserId): Promise<ProfileView[]> {
      await ctx.delay();
      // Only blocks this user initiated. Someone must not be able to discover
      // that they have been blocked by reading their own list.
      return (
        ctx.store
          .read()
          .blocks.filter((b) => b.blockerId === userId)
          /* ⚠️ NULL VIEWER, DELIBERATELY. This is the one place a blocked
           * person MUST stay visible: it is the list you unblock them from.
           * Passing the real viewer would filter them out — the list would be
           * permanently empty and unblocking would be unreachable. */
          .map((b) => ctx.profileOf(b.blockedId, null))
      );
    },

    async getBlockIndex(_userId: UserId | null): Promise<BlockIndex> {
      await ctx.delay();
      return buildBlockIndex(ctx.store.read().blocks);
    },

    /* ------------------------------------------------- Round 3, declared now */

    async listReports(adminId: UserId, status?: 'open' | 'resolved'): Promise<Report[]> {
      await ctx.delay();
      requireAdmin(ctx, adminId);
      const all = ctx.store.read().reports;
      return status ? all.filter((r) => r.status === status) : [...all];
    },

    async resolveReport(adminId: UserId, reportId: string, _resolution: string): Promise<Report> {
      await ctx.delay();
      requireAdmin(ctx, adminId);
      let result: Report | undefined;
      ctx.store.mutate((s) => {
        const report = s.reports.find((r) => r.id === reportId);
        if (!report) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');
        report.status = 'resolved';
        result = report;
      });
      if (!result) refusal(ErrorCode.NOT_FOUND, 'errors.notFound');
      return result;
    },

    async setAccountStatus(adminId: UserId, userId: UserId, status: AccountStatus): Promise<void> {
      await ctx.delay();
      requireAdmin(ctx, adminId);
      ctx.store.mutate((s) => {
        const user = s.users.find((u) => u.id === userId);
        if (user) user.accountStatus = status;
      });
    },

    async unpublishActivity(adminId: UserId, activityId: ActivityId): Promise<void> {
      await ctx.delay();
      requireAdmin(ctx, adminId);
      ctx.store.mutate((s) => {
        const activity = s.activities.find((a) => a.id === activityId);
        if (activity) activity.status = 'unpublished';
      });
    },
  };
}
