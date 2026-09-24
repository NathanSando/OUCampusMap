#!/usr/bin/env node
/**
 * Seed generator — turns the CSVs in ./data into:
 *
 *   1. supabase/seed/seed.sql                    run by `supabase db reset` (see config.toml)
 *   2. apps/mobile/src/data/seed.generated.json   bundled into the app for offline/demo mode
 *
 * Idempotency: every row gets a deterministic UUID (v5 of "<table>:<slug>"), and the SQL
 * uses `insert ... on conflict (id) do update`, so re-running never creates duplicates.
 *
 * Usage: npm run seed:generate
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, 'data');
const sqlOut = join(here, 'seed.sql');
const jsonOut = join(here, '..', '..', 'apps', 'mobile', 'src', 'data', 'seed.generated.json');

// Keep in sync with packages/shared-types/src/campus.ts
const BOUNDS = { north: 35.2175, south: 35.1765, east: -97.4255, west: -97.4615 };
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const FEATURE_TYPES = [
  'accessible_entrance',
  'ramp',
  'elevator',
  'accessible_restroom',
  'automatic_door',
  'braille_signage',
];
// Fixed namespace so IDs are stable across machines. Never change this.
const NAMESPACE = '6f1c7b2e-9a4d-4e0b-8c1a-0d5e3f7a9b21';

const errors = [];

// --- helpers -----------------------------------------------------------------

function uuidv5(name) {
  const ns = Buffer.from(NAMESPACE.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1')
    .update(Buffer.concat([ns, Buffer.from(name, 'utf8')]))
    .digest();
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.some((v) => v.trim() !== ''));
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

function load(file) {
  return parseCsv(readFileSync(join(dataDir, file), 'utf8'));
}

const blank = (v) => v == null || v === '';
const orNull = (v) => (blank(v) ? null : v);

function num(v, ctx) {
  if (blank(v)) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) errors.push(`${ctx}: "${v}" is not a number`);
  return n;
}

function bool(v, ctx) {
  if (blank(v)) return null;
  if (/^(true|yes|1)$/i.test(v)) return true;
  if (/^(false|no|0)$/i.test(v)) return false;
  errors.push(`${ctx}: "${v}" is not a boolean`);
  return null;
}

function hours(row, ctx) {
  const out = {};
  for (const d of DAYS) {
    const v = row[d];
    if (blank(v)) continue;
    const ok =
      /^(closed|24h)$/i.test(v) ||
      v.split(',').every((r) => /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(r.trim()));
    if (!ok)
      errors.push(
        `${ctx}: bad hours "${v}" for ${d} (use HH:MM-HH:MM, comma-separated, "closed" or "24h")`,
      );
    out[d] = v.toLowerCase() === 'closed' ? 'closed' : v;
  }
  return Object.keys(out).length ? out : null;
}

function checkBounds(lat, lng, ctx) {
  if (lat == null || lng == null) return;
  if (lat > BOUNDS.north || lat < BOUNDS.south || lng > BOUNDS.east || lng < BOUNDS.west) {
    errors.push(`${ctx}: (${lat}, ${lng}) is outside the Norman campus bounds`);
  }
}

function uniqueSlugs(rows, table) {
  const seen = new Set();
  for (const r of rows) {
    if (blank(r.slug)) errors.push(`${table}: row with empty slug`);
    if (seen.has(r.slug)) errors.push(`${table}: duplicate slug "${r.slug}"`);
    seen.add(r.slug);
  }
}

// SQL literal helpers
const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const qjson = (v) => (v == null ? 'null' : `${q(JSON.stringify(v))}::jsonb`);
const qarr = (arr) => `array[${arr.map(q).join(', ')}]::text[]`;
const qpoint = (lat, lng) =>
  lat == null
    ? 'null'
    : `extensions.st_setsrid(extensions.st_makepoint(${lng}, ${lat}), 4326)::extensions.geography`;
const qbool = (v) => (v == null ? 'null' : String(v));

function upsert(table, cols, rows) {
  if (!rows.length) return `-- ${table}: no rows yet\n`;
  const updates = cols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`);
  return (
    `insert into ${table} (${cols.join(', ')}) values\n` +
    rows.map((r) => `  (${r.join(', ')})`).join(',\n') +
    `\non conflict (id) do update set\n  ${updates.join(',\n  ')};\n`
  );
}

// --- buildings ---------------------------------------------------------------

const buildingRows = load('buildings.csv');
uniqueSlugs(buildingRows, 'buildings');
const buildingBySlug = new Map();
const buildings = buildingRows.map((r) => {
  const ctx = `buildings/${r.slug}`;
  const b = {
    id: uuidv5(`buildings:${r.slug}`),
    name: r.name,
    abbreviation: orNull(r.abbreviation),
    aliases: blank(r.aliases)
      ? []
      : r.aliases
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean),
    description: orNull(r.description),
    address: orNull(r.address),
    lat: num(r.lat, ctx),
    lng: num(r.lng, ctx),
    hours: hours(r, ctx),
    image_url: orNull(r.image_url),
  };
  if (blank(b.name)) errors.push(`${ctx}: missing name`);
  if (b.lat == null || b.lng == null) errors.push(`${ctx}: missing coordinates`);
  checkBounds(b.lat, b.lng, ctx);
  buildingBySlug.set(r.slug, b);
  return b;
});

function buildingRef(slug, ctx, required = false) {
  if (blank(slug)) {
    if (required) errors.push(`${ctx}: building_slug is required`);
    return null;
  }
  const b = buildingBySlug.get(slug);
  if (!b) errors.push(`${ctx}: unknown building_slug "${slug}"`);
  return b ?? null;
}

// --- dining ------------------------------------------------------------------

const diningRows = load('dining_locations.csv');
uniqueSlugs(diningRows, 'dining_locations');
const dining = diningRows.map((r) => {
  const ctx = `dining_locations/${r.slug}`;
  const b = buildingRef(r.building_slug, ctx);
  const d = {
    id: uuidv5(`dining_locations:${r.slug}`),
    name: r.name,
    building_id: b?.id ?? null,
    lat: num(r.lat, ctx) ?? b?.lat ?? null,
    lng: num(r.lng, ctx) ?? b?.lng ?? null,
    hours: hours(r, ctx),
    cuisine_type: orNull(r.cuisine_type),
    accepts_meal_plan: bool(r.accepts_meal_plan, ctx),
    menu_url: orNull(r.menu_url),
  };
  if (d.lat == null) errors.push(`${ctx}: needs lat/lng or a building_slug`);
  checkBounds(d.lat, d.lng, ctx);
  return d;
});

// --- printers ----------------------------------------------------------------

const printerRows = load('printers.csv');
uniqueSlugs(printerRows, 'printers');
const printers = printerRows.map((r) => {
  const ctx = `printers/${r.slug}`;
  const b = buildingRef(r.building_slug, ctx);
  const p = {
    id: uuidv5(`printers:${r.slug}`),
    label: r.label,
    building_id: b?.id ?? null,
    floor_note: orNull(r.floor_note),
    // Kiosks are located at their building unless the CSV gives a more precise point.
    lat: num(r.lat, ctx) ?? b?.lat ?? null,
    lng: num(r.lng, ctx) ?? b?.lng ?? null,
    notes: orNull(r.notes),
  };
  if (p.lat == null) errors.push(`${ctx}: needs lat/lng or a building_slug`);
  checkBounds(p.lat, p.lng, ctx);
  return p;
});

// --- accessibility -----------------------------------------------------------

const accessRows = load('accessibility_features.csv');
uniqueSlugs(accessRows, 'accessibility_features');
const accessibility = accessRows.map((r) => {
  const ctx = `accessibility_features/${r.slug}`;
  const b = buildingRef(r.building_slug, ctx, true);
  if (!FEATURE_TYPES.includes(r.feature_type))
    errors.push(`${ctx}: bad feature_type "${r.feature_type}"`);
  if (!blank(r.verified_at) && !/^\d{4}-\d{2}-\d{2}$/.test(r.verified_at)) {
    errors.push(`${ctx}: verified_at must be YYYY-MM-DD`);
  }
  const a = {
    id: uuidv5(`accessibility_features:${r.slug}`),
    building_id: b?.id ?? null,
    feature_type: r.feature_type,
    description: orNull(r.description),
    floor: orNull(r.floor),
    lat: num(r.lat, ctx),
    lng: num(r.lng, ctx),
    verified_at: orNull(r.verified_at),
  };
  checkBounds(a.lat, a.lng, ctx);
  return a;
});

// --- study spaces (Tier 2) ---------------------------------------------------

const studyRows = load('study_spaces.csv');
uniqueSlugs(studyRows, 'study_spaces');
const studySpaces = studyRows.map((r) => {
  const ctx = `study_spaces/${r.slug}`;
  const b = buildingRef(r.building_slug, ctx, true);
  return {
    id: uuidv5(`study_spaces:${r.slug}`),
    building_id: b?.id ?? null,
    name: r.name,
    room: orNull(r.room),
    capacity: num(r.capacity, ctx),
    reservable: bool(r.reservable, ctx) ?? false,
    booking_url: orNull(r.booking_url),
    hours: hours(r, ctx),
  };
});

if (errors.length) {
  console.error(`Seed data has ${errors.length} problem(s):\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}

// --- write SQL ---------------------------------------------------------------

const sql = [
  '-- GENERATED by supabase/seed/generate.mjs from supabase/seed/data/*.csv — do not edit by hand.',
  '-- Idempotent: safe to run repeatedly.',
  '',
  'begin;',
  '',
  upsert(
    'buildings',
    [
      'id',
      'name',
      'abbreviation',
      'aliases',
      'description',
      'address',
      'location',
      'hours',
      'image_url',
    ],
    buildings.map((b) => [
      q(b.id),
      q(b.name),
      q(b.abbreviation),
      qarr(b.aliases),
      q(b.description),
      q(b.address),
      qpoint(b.lat, b.lng),
      qjson(b.hours),
      q(b.image_url),
    ]),
  ),
  upsert(
    'dining_locations',
    [
      'id',
      'name',
      'building_id',
      'location',
      'hours',
      'cuisine_type',
      'accepts_meal_plan',
      'menu_url',
    ],
    dining.map((d) => [
      q(d.id),
      q(d.name),
      q(d.building_id),
      qpoint(d.lat, d.lng),
      qjson(d.hours),
      q(d.cuisine_type),
      qbool(d.accepts_meal_plan),
      q(d.menu_url),
    ]),
  ),
  upsert(
    'printers',
    ['id', 'label', 'building_id', 'floor_note', 'location', 'notes'],
    printers.map((p) => [
      q(p.id),
      q(p.label),
      q(p.building_id),
      q(p.floor_note),
      qpoint(p.lat, p.lng),
      q(p.notes),
    ]),
  ),
  upsert(
    'accessibility_features',
    ['id', 'building_id', 'feature_type', 'description', 'floor', 'location', 'verified_at'],
    accessibility.map((a) => [
      q(a.id),
      q(a.building_id),
      `${q(a.feature_type)}::accessibility_feature_type`,
      q(a.description),
      q(a.floor),
      qpoint(a.lat, a.lng),
      a.verified_at ? `${q(a.verified_at)}::date` : 'null',
    ]),
  ),
  upsert(
    'study_spaces',
    ['id', 'building_id', 'name', 'room', 'capacity', 'reservable', 'booking_url', 'hours'],
    studySpaces.map((s) => [
      q(s.id),
      q(s.building_id),
      q(s.name),
      q(s.room),
      s.capacity ?? 'null',
      qbool(s.reservable),
      q(s.booking_url),
      qjson(s.hours),
    ]),
  ),
  'commit;',
  '',
].join('\n');

writeFileSync(sqlOut, sql);

// --- write JSON for the mobile app's offline mode ----------------------------

mkdirSync(dirname(jsonOut), { recursive: true });
writeFileSync(
  jsonOut,
  JSON.stringify({ buildings, dining, printers, accessibility, studySpaces }, null, 1) + '\n',
);

console.log(
  `Seed generated: ${buildings.length} buildings, ${dining.length} dining, ${printers.length} printers, ` +
    `${accessibility.length} accessibility features, ${studySpaces.length} study spaces.`,
);
