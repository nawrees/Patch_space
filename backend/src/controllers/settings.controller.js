import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { getAdminClient } from '../config/supabaseClient.js';

const EDITABLE_FIELDS = [
  'contact_email',
  'home_hero_eyebrow',
  'home_hero_title',
  'home_hero_subtitle',
  'home_features',
  'home_cta_title',
  'home_cta_body',
  'about_hero_title',
  'about_hero_subtitle',
  'about_values',
  'about_company_title',
  'about_company_body',
  'about_cta_title',
  'about_cta_body',
];

// Public — About/Contact pages fetch this without being logged in.
export const getSiteSettings = asyncHandler(async (req, res) => {
  const { data, error } = await getAdminClient()
    .from('site_settings')
    .select(EDITABLE_FIELDS.join(', '))
    .eq('id', 1)
    .single();

  if (error) throw new ApiError(400, error.message);
  res.json({ settings: data });
});

// Admin-only — route is gated with requireRole('admin'); RLS is the real backstop.
export const updateSiteSettings = asyncHandler(async (req, res) => {
  const payload = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in req.body) payload[field] = req.body[field];
  }

  if (payload.contact_email !== undefined) {
    const email = String(payload.contact_email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, 'contact_email must be a valid email address');
    }
    payload.contact_email = email;
  }

  if (payload.about_values !== undefined) {
    if (!Array.isArray(payload.about_values) || payload.about_values.some(
      (v) => typeof v?.icon !== 'string' || typeof v?.title !== 'string' || typeof v?.body !== 'string'
    )) {
      throw new ApiError(400, 'about_values must be an array of { icon, title, body }');
    }
  }

  if (payload.home_features !== undefined) {
    if (!Array.isArray(payload.home_features) || payload.home_features.some(
      (v) => typeof v?.icon !== 'string' || typeof v?.title !== 'string' || typeof v?.body !== 'string'
    )) {
      throw new ApiError(400, 'home_features must be an array of { icon, title, body }');
    }
  }

  if (Object.keys(payload).length === 0) {
    throw new ApiError(400, 'No editable fields provided');
  }
  payload.updated_at = new Date().toISOString();

  // Uses req.supabase (RLS-scoped as the caller) rather than the admin
  // client, so the is_admin() RLS policy is the thing actually enforcing
  // this — requireRole('admin') on the route is just a nicer error message.
  const { data, error } = await req.supabase
    .from('site_settings')
    .update(payload)
    .eq('id', 1)
    .select(EDITABLE_FIELDS.join(', '))
    .single();

  if (error) throw new ApiError(403, error.message);
  res.json({ settings: data });
});
