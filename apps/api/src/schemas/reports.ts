import { REPORT_CATEGORIES, isWithinCampus } from '@ou-campus-map/shared-types';
import { z } from 'zod';

export const ReportCategorySchema = z.enum(REPORT_CATEGORIES);

export const CreateReportSchema = z
  .object({
    category: ReportCategorySchema,
    title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(100),
    description: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((d) => (d ? d : undefined)),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    buildingId: z.uuid().optional(),
  })
  .refine((r) => isWithinCampus(r), {
    message: 'Reports must be located on the Norman campus.',
    path: ['lat'],
  });

export type CreateReportInput = Omit<z.infer<typeof CreateReportSchema>, 'description'> & {
  description?: string;
};

export const VoteSchema = z.object({
  vote: z.union([z.literal(1), z.literal(-1)]),
});

export const ReportIdParamSchema = z.object({ id: z.uuid() });
