import { computeReportExpiry, type CreateReportResponse } from '@ou-campus-map/shared-types';
import { ApiError } from '../errors';
import type { CreateReportInput } from '../schemas/reports';
import type { AiClient, ReportStore } from './types';

/** Above this confidence the classifier's verdict is acted on (design doc §8.2). */
export const CLASSIFIER_CONFIDENCE_THRESHOLD = 0.8;
/** A report is tied to the nearest building within this radius when none is given. */
export const NEAREST_BUILDING_MAX_METERS = 150;

export async function createReport(
  deps: { reports: ReportStore; ai: AiClient },
  userId: string,
  input: CreateReportInput,
  now: Date = new Date(),
): Promise<CreateReportResponse> {
  let category = input.category;
  let categoryChangedFrom: CreateReportResponse['categoryChangedFrom'];

  const verdict = await deps.ai.classifyReport({
    title: input.title,
    description: input.description,
    userCategory: input.category,
  });

  if (verdict && verdict.confidence > CLASSIFIER_CONFIDENCE_THRESHOLD) {
    if (verdict.isSpam) {
      throw new ApiError('VALIDATION_ERROR', "This report looks like spam, so it wasn't posted.");
    }
    if (verdict.suggestedCategory !== input.category) {
      categoryChangedFrom = input.category;
      category = verdict.suggestedCategory;
    }
  }

  const buildingId =
    input.buildingId ??
    (await deps.reports.nearestBuildingId(
      { lat: input.lat, lng: input.lng },
      NEAREST_BUILDING_MAX_METERS,
    ));

  const report = await deps.reports.insert({
    userId,
    category,
    title: input.title,
    description: input.description,
    lat: input.lat,
    lng: input.lng,
    buildingId,
    // TTL follows the stored category, so a re-categorised report expires on the right schedule.
    expiresAt: computeReportExpiry(category, now),
  });

  return categoryChangedFrom ? { report, categoryChangedFrom } : { report };
}
