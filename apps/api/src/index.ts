import { createApp } from './app';
import { loadConfig } from './config';
import { httpAiClient } from './services/aiClient';
import {
  createServiceClient,
  supabaseAuthVerifier,
  supabaseReportStore,
} from './services/supabase';

const config = loadConfig();
const supabase = createServiceClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

const app = createApp({
  auth: supabaseAuthVerifier(supabase),
  reports: supabaseReportStore(supabase),
  ai: httpAiClient(config.AI_SERVICE_URL, config.AI_SERVICE_SHARED_SECRET),
  corsOrigins: config.CORS_ORIGINS,
});

app.listen(config.PORT, () => {
  console.log(`API listening on http://localhost:${config.PORT}/api`);
});
