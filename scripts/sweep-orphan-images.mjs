#!/usr/bin/env node
// =============================================================================
// Sweep orphaned objects from the equipment-images bucket, and optionally move
// inline base64 images (inventory.image, users.profile.logo) into storage.
//
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service role key> \
//   node scripts/sweep-orphan-images.mjs            # dry run: report only
//   node scripts/sweep-orphan-images.mjs --apply    # delete the orphans
//   node scripts/sweep-orphan-images.mjs --migrate-base64 [--apply]
//
// Needs the SERVICE ROLE key (storage deletes bypass RLS); run it from a
// trusted shell, never from the browser. Nothing is deleted without --apply.
// The key is read from the environment and never printed.
//
// What counts as "live": any object whose path appears in inventory.image or
// users.profile->>'logo' — plus the matching `_thumb.jpg` of each live full
// image, since only the full URL is stored.
// =============================================================================

import { createClient } from '@supabase/supabase-js';

const BUCKET = 'equipment-images';
const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const MIGRATE = args.has('--migrate-base64');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(2);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const fmt = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${Math.round(n / 1024)} KB`);

// -----------------------------------------------------------------------------
// List every object (the Storage API lists one folder level at a time)
// -----------------------------------------------------------------------------
async function listAll(prefix = '') {
  const out = [];
  const PAGE = 100;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`list(${prefix || '/'}): ${error.message}`);
    for (const entry of data || []) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) out.push(...(await listAll(path))); // folder
      else out.push({ path, size: Number(entry.metadata?.size || 0) });
    }
    if (!data || data.length < PAGE) break;
  }
  return out;
}

// -----------------------------------------------------------------------------
// Referenced paths from the database
// -----------------------------------------------------------------------------
function pathFromUrl(value) {
  if (!value || !/^https?:/.test(value)) return null;
  const m = value.match(/\/storage\/v1\/object\/(?:public|sign)\/equipment-images\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function referencedPaths() {
  const refs = new Set();
  const { data: items, error: e1 } = await supabase.from('inventory').select('id, image');
  if (e1) throw new Error(`inventory: ${e1.message}`);
  const { data: users, error: e2 } = await supabase.from('users').select('id, profile');
  if (e2) throw new Error(`users: ${e2.message}`);

  const add = (value) => {
    const p = pathFromUrl(value);
    if (!p) return;
    refs.add(p);
    refs.add(p.replace(/\.(jpe?g|png|webp|gif)$/i, '_thumb.jpg'));
  };
  items.forEach((row) => add(row.image));
  users.forEach((row) => add(row.profile?.logo));
  return { refs, items, users };
}

// -----------------------------------------------------------------------------
// Optional: move inline base64 images into storage
// -----------------------------------------------------------------------------
function dataUrlToBuffer(dataUrl) {
  const m = dataUrl.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
  if (!m) return null;
  return { mime: m[1].toLowerCase(), buffer: Buffer.from(m[2], 'base64') };
}

async function migrateBase64({ items, users }) {
  const targets = [
    ...items
      .filter((r) => typeof r.image === 'string' && r.image.startsWith('data:'))
      .map((r) => ({ table: 'inventory', id: r.id, folder: r.id, dataUrl: r.image, column: 'image' })),
    ...users
      .filter((r) => typeof r.profile?.logo === 'string' && r.profile.logo.startsWith('data:'))
      .map((r) => ({ table: 'users', id: r.id, folder: `profiles/${r.id}`, dataUrl: r.profile.logo, column: 'profile.logo', profile: r.profile })),
  ];
  console.log(`\nInline base64 images: ${targets.length}`);
  for (const t of targets) {
    const parsed = dataUrlToBuffer(t.dataUrl);
    if (!parsed) {
      console.log(`  ${t.table} ${t.id}: unparseable data URL — skipped`);
      continue;
    }
    const ext = parsed.mime.includes('png') ? 'png' : parsed.mime.includes('webp') ? 'webp' : parsed.mime.includes('gif') ? 'gif' : 'jpg';
    const path = `${t.folder}/${Date.now()}.${ext}`;
    console.log(`  ${t.table} ${t.id}: ${fmt(parsed.buffer.length)} ${parsed.mime} → ${path}${APPLY ? '' : ' (dry run)'}`);
    if (!APPLY) continue;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, parsed.buffer, { contentType: parsed.mime, cacheControl: '31536000', upsert: false });
    if (upErr) {
      console.log(`    upload failed: ${upErr.message}`);
      continue;
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const patch =
      t.table === 'inventory'
        ? { image: pub.publicUrl }
        : { profile: { ...t.profile, logo: pub.publicUrl } };
    const { error: dbErr } = await supabase.from(t.table).update(patch).eq('id', t.id);
    console.log(dbErr ? `    row update failed: ${dbErr.message}` : '    done');
  }
}

// -----------------------------------------------------------------------------
async function main() {
  console.log(`Bucket: ${BUCKET} @ ${new URL(url).host}  (${APPLY ? 'APPLY' : 'dry run'})`);
  const [objects, db] = await Promise.all([listAll(), referencedPaths()]);
  const total = objects.reduce((n, o) => n + o.size, 0);
  const orphans = objects.filter((o) => !db.refs.has(o.path));
  const orphanBytes = orphans.reduce((n, o) => n + o.size, 0);

  console.log(`Objects: ${objects.length} (${fmt(total)}), referenced: ${objects.length - orphans.length}`);
  console.log(`Orphans: ${orphans.length} (${fmt(orphanBytes)})`);
  orphans.forEach((o) => console.log(`  ${o.path}  ${fmt(o.size)}`));

  if (APPLY && orphans.length) {
    for (let i = 0; i < orphans.length; i += 50) {
      const batch = orphans.slice(i, i + 50).map((o) => o.path);
      const { error } = await supabase.storage.from(BUCKET).remove(batch);
      if (error) throw new Error(`remove: ${error.message}`);
      console.log(`Deleted ${Math.min(i + 50, orphans.length)} / ${orphans.length}`);
    }
  } else if (orphans.length) {
    console.log('\nRe-run with --apply to delete them.');
  }

  if (MIGRATE) await migrateBase64(db);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
