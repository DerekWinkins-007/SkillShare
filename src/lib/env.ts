import { z } from 'zod';

const envSchema = z
  .object({
    VITE_DATA_MODE: z.enum(['mock', 'supabase']),
    VITE_SUPABASE_URL: z.string().optional(),
    VITE_SUPABASE_ANON_KEY: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.VITE_DATA_MODE === 'supabase') {
      if (!data.VITE_SUPABASE_URL || data.VITE_SUPABASE_URL.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['VITE_SUPABASE_URL'],
          message: 'VITE_SUPABASE_URL is required when VITE_DATA_MODE is supabase',
        });
      }
      if (!data.VITE_SUPABASE_ANON_KEY || data.VITE_SUPABASE_ANON_KEY.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['VITE_SUPABASE_ANON_KEY'],
          message: 'VITE_SUPABASE_ANON_KEY is required when VITE_DATA_MODE is supabase',
        });
      }
    }
  });

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error('Environment validation error:', parsed.error.format());
  throw new Error(`Invalid environment configuration: ${JSON.stringify(parsed.error.format())}`);
}

export const env = parsed.data;
