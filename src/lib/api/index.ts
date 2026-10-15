import { env } from '../env';
import { SkillShareAPI } from './api.interface';
import { mockAdapter } from './mock/mock.adapter';
import { supabaseAdapter } from './supabase.adapter';

export const api: SkillShareAPI =
  env.VITE_DATA_MODE === 'supabase' ? supabaseAdapter : mockAdapter;

export * from './api.interface';
