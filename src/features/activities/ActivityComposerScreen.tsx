import { useState, type FormEvent } from 'react';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@app/RepositoryProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@app/SessionProvider';
import { NeighborhoodSelector } from '@features/identity';
import type { ActivityId, CategoryId, LocationPrecision, NeighborhoodId } from '@core/domain';
import { t, tError } from '@core/i18n';
import { CATEGORIES } from '@core/reference/taxonomy';
import { cityHasNeighborhoods } from '@core/reference/neighborhoods';
import {
  emptyActivityDraft,
  TITLE_MAX,
  type ActivityDraftInput,
} from '@core/rules/activityValidation';
import type { FieldErrors } from '@core/rules/profileValidation';
import { Button } from '@ui/Button';
import { Chip } from '@ui/Chip';
import { Input } from '@ui/Input';
import { JalaliDatePicker } from '@ui/JalaliDatePicker';
import { Skeleton } from '@ui/Skeleton';
import { TextArea } from '@ui/TextArea';
import { LocationPicker } from './LocationPicker';
import { LocationPrecisionField } from './LocationPrecisionField';
import { useCity } from '@app/CityProvider';
import { useActivityService } from './useActivityServices';

/**
 * ActivityComposerScreen — US-10, US-11, US-12.
 *
 * A full-page route rather than a sheet. The form has eight fields including
 * the Jalali picker and the precision choice; a sheet on a 375px phone would
 * put the safety-critical field in a scrolling container under a keyboard,
 * which is the worst possible place for the one decision this screen has to
 * get right.
 */
/**
 * Create AND edit. `/create` opens an empty draft; `/activity/:id/edit` loads
 * the activity and prefills.
 *
 * One screen rather than two, because the fields, the validation and — most
 * importantly — the location-precision control are identical. A second edit
 * form would be the obvious place for that control to drift out of sync with
 * US-11, and it is the one control that must not.
 */
export function ActivityComposerScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: editingId } = useParams<{ id: string }>();
  const { user, isLoading } = useSession();
  const { viewerId } = useSession();
  const service = useActivityService();
  const repositories = useRepositories();

  const isEditing = editingId !== undefined;

  const { data: existing, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['activity', 'raw', editingId],
    queryFn: () => repositories.activities.getActivity(viewerId, editingId as ActivityId),
    enabled: isEditing,
  });

  const { composeCityId } = useCity();
  const [draft, setDraft] = useState<ActivityDraftInput | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setSubmitting] = useState(false);

  /* Prefill once the activity arrives. The author sees their own address and
   * point back (BR-U3-14), which is exactly why an edit form can show them —
   * `getActivity` returns them only to the author. */
  useEffect(() => {
    if (!isEditing) {
      setDraft((d) => d ?? emptyActivityDraft(composeCityId));
      return;
    }
    if (existing === undefined || existing === null) return;

    setDraft({
      title: existing.title,
      description: existing.description,
      categoryIds: existing.categoryIds,
      startsAt: existing.startsAt,
      cityId: existing.cityId,
      neighborhoodId: existing.neighborhoodId ?? null,
      locationPrecision: existing.locationPrecision,
      exactAddress: existing.exactAddress ?? '',
      ...(existing.coordinate === undefined ? {} : { coordinate: existing.coordinate }),
      capacity: existing.capacity === undefined ? '' : String(existing.capacity),
    });
  }, [isEditing, existing, composeCityId]);

  if (isLoading || (isEditing && isLoadingExisting) || draft === null) {
    return <Skeleton variant="card" lines={6} />;
  }
  if (user === null) return null;

  /* CR-02 item 3's rule, applied here too: editing a field clears THAT field's
   * error. A message computed at the last submit, still on screen after the
   * user has fixed the field, is indistinguishable from a rejection. */
  const set = <K extends keyof ActivityDraftInput>(key: K, value: ActivityDraftInput[K]) => {
    setErrors((previous) => {
      if (!(key in previous)) return previous;
      const next = { ...previous };
      delete next[key as string];
      return next;
    });
    setDraft((d) => (d === null ? d : { ...d, [key]: value }));
  };

  const errorFor = (field: string) => {
    const error = errors[field];
    return error === undefined ? undefined : tError(error.messageKey);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (user === null) return;

    if (draft === null) return;

    setSubmitting(true);
    const result =
      isEditing && existing !== undefined && existing !== null
        ? await service.editActivity(user, existing, draft, new Date())
        : await service.createActivity(user, draft, new Date());
    setSubmitting(false);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['feed'] });
    await queryClient.invalidateQueries({ queryKey: ['activity'] });
    await queryClient.invalidateQueries({ queryKey: ['activities'] });
    void navigate(`/activity/${result.value.id}`, { replace: true });
  }

  function toggleCategory(id: CategoryId) {
    if (draft === null) return;
    const next = draft.categoryIds.includes(id)
      ? draft.categoryIds.filter((c) => c !== id)
      : [...draft.categoryIds, id];
    set('categoryIds', next);
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6"
    >
      <h1 className="text-xl font-semibold text-fg">
        {isEditing ? t('activity.editTitle') : t('activity.createTitle')}
      </h1>

      <Input
        value={draft.title}
        onChange={(v) => set('title', v)}
        label={t('activity.titleLabel')}
        placeholder={t('activity.titlePlaceholder')}
        maxLength={TITLE_MAX}
        error={errorFor('title')}
        data-testid="composer-title"
      />

      <TextArea
        value={draft.description}
        onChange={(v) => set('description', v)}
        label={t('activity.descriptionLabel')}
        placeholder={t('activity.descriptionPlaceholder')}
        rows={5}
        error={errorFor('description')}
        data-testid="composer-description"
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-fg">{t('activity.categoriesLabel')}</legend>
        <p className="text-xs text-fg-muted">{t('activity.categoriesHint')}</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              label={c.nameFa}
              icon={c.icon}
              selected={draft.categoryIds.includes(c.id)}
              onClick={() => toggleCategory(c.id)}
              data-testid={`composer-category-${c.id}`}
            />
          ))}
        </div>
        {errorFor('categoryIds') !== undefined && (
          <p role="alert" className="text-sm text-danger">
            {errorFor('categoryIds')}
          </p>
        )}
      </fieldset>

      <JalaliDatePicker
        value={draft.startsAt}
        onChange={(iso) => set('startsAt', iso)}
        label={t('activity.dateLabel')}
        previousMonthLabel={t('date.pickerPreviousMonth')}
        nextMonthLabel={t('date.pickerNextMonth')}
        closeLabel={t('action.close')}
        error={errorFor('startsAt')}
        data-testid="composer-date"
      />

      {/* Only the five cities with a neighborhood dataset offer the choice.
        * Showing an empty picker elsewhere would ask a question the product
        * cannot answer. */}
      {cityHasNeighborhoods(draft.cityId) && (
      <NeighborhoodSelector
        cityId={draft.cityId}
        mode="single"
        value={draft.neighborhoodId}
        onChange={(id: NeighborhoodId | null) => set('neighborhoodId', id)}
        label={t('activity.neighborhoodLabel')}
        error={errorFor('neighborhoodId')}
      />
      )}

      <LocationPicker
        cityId={draft.cityId}
        value={draft.coordinate ?? null}
        onChange={(p) => set('coordinate', p ?? undefined)}
        neighborhoodId={draft.neighborhoodId}
      />

      {/* ⚠️ US-11. Neither option is pre-selected, and publish is refused until
          one is (BR-U3-10). */}
      <LocationPrecisionField
        cityId={draft.cityId}
        value={draft.locationPrecision}
        onChange={(p: LocationPrecision) => set('locationPrecision', p)}
        neighborhoodId={draft.neighborhoodId}
        coordinate={draft.coordinate ?? null}
        error={errorFor('locationPrecision')}
      />

      {draft.locationPrecision === 'exact' && (
        <Input
          value={draft.exactAddress}
          onChange={(v) => set('exactAddress', v)}
          label={t('activity.addressLabel')}
          placeholder={t('activity.addressPlaceholder')}
          error={errorFor('exactAddress')}
          data-testid="composer-address"
        />
      )}

      <Input
        value={draft.capacity}
        onChange={(v) => set('capacity', v)}
        label={t('activity.capacityLabel')}
        hint={t('activity.capacityHint')}
        type="tel"
        error={errorFor('capacity')}
        data-testid="composer-capacity"
      />

      <Button type="submit" loading={isSubmitting} fullWidth data-testid="composer-submit">
        {t('activity.submit')}
      </Button>
    </form>
  );
}
