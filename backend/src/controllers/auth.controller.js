import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { getAdminClient } from '../config/supabaseClient.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Tunisian numbers: 8 digits, optionally prefixed with +216 — same rule as
// the frontend (core/utils/phone.ts) and the DB trigger
// (031_validate_tunisian_phone.sql), kept in sync across all three.
export function isValidTunisianPhone(phone) {
  const trimmed = phone.trim();
  // Reject stray characters (letters, symbols) up front — otherwise
  // something like "21025126hh" would have its letters silently stripped
  // by the digit-count check below and pass as a clean 8-digit number.
  if (!/^\+?[\d\s-]+$/.test(trimmed)) return false;

  const digits = trimmed.replace(/[\s-]/g, '').replace(/^\+/, '');
  const local = digits.startsWith('216') && digits.length === 11 ? digits.slice(3) : digits;
  return /^\d{8}$/.test(local);
}
const EXTENSION_BY_MIME_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const avatarUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_AVATAR_TYPES.includes(file.mimetype)) {
      return cb(new ApiError(400, 'Only JPEG, PNG, WebP or GIF images are accepted'));
    }
    cb(null, true);
  },
}).single('avatar');

async function ensureAvatarsBucket(admin) {
  const { error } = await admin.storage.createBucket(env.AVATARS_BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ALLOWED_AVATAR_TYPES,
  });
  // "already exists" is not an error — anything else is
  if (error && !error.message.toLowerCase().includes('already exist')) {
    throw new ApiError(500, `Storage init failed: ${error.message}`);
  }
}

export const getMe = (req, res) => {
  res.json({
    user: { id: req.user.id, email: req.user.email },
    profile: req.profile,
  });
};

export const updateProfile = asyncHandler(async (req, res) => {
  const { full_name, bio, avatar_url, phone, address } = req.body;

  const updates = {};
  // full_name and phone are required at signup (see the handle_new_user DB
  // trigger) — enforce the same rule here so an edit can't blank either one
  // back out again. bio/avatar_url/address stay optional.
  if (full_name !== undefined) {
    const trimmed = full_name?.trim();
    if (!trimmed) throw new ApiError(400, 'Full name is required');
    updates.full_name = trimmed;
  }
  if (phone !== undefined) {
    const trimmed = phone?.trim();
    if (!trimmed) throw new ApiError(400, 'Phone number is required');
    if (!isValidTunisianPhone(trimmed)) throw new ApiError(400, 'Enter a valid Tunisian phone number (8 digits, optionally with +216)');
    updates.phone = trimmed;
  }
  if (bio       !== undefined) updates.bio       = bio?.trim()       || null;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url?.trim() || null;
  if (address   !== undefined) updates.address   = address?.trim()   || null;

  if (Object.keys(updates).length === 0) throw new ApiError(400, 'No fields to update');

  const { data, error } = await getAdminClient()
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error || !data) throw new ApiError(500, error?.message || 'Update failed');

  res.json({ profile: data });
});

// Uploads a real photo (as opposed to just pasting an image URL into
// avatar_url) — validated against its actual byte signature, not just the
// client-declared Content-Type, same as course thumbnail uploads.
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image uploaded (expected multipart field "avatar")');

  const detected = await fileTypeFromBuffer(req.file.buffer);
  if (!detected || !ALLOWED_AVATAR_TYPES.includes(detected.mime)) {
    throw new ApiError(400, 'File content does not match an accepted image format (failed signature check)');
  }

  const admin = getAdminClient();
  await ensureAvatarsBucket(admin);

  const ext = EXTENSION_BY_MIME_TYPE[detected.mime] || 'jpg';
  const storagePath = `${req.user.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from(env.AVATARS_BUCKET)
    .upload(storagePath, req.file.buffer, { contentType: detected.mime, upsert: true });

  if (uploadError) throw new ApiError(500, `Storage upload failed: ${uploadError.message}`);

  const { data: { publicUrl } } = admin.storage.from(env.AVATARS_BUCKET).getPublicUrl(storagePath);

  const { data: updated, error: updateError } = await admin
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', req.user.id)
    .select()
    .single();

  if (updateError) throw new ApiError(500, updateError.message);
  res.json({ profile: updated });
});
