import { User, UsersMap } from '@/components/LocationsWrapper';
import { LocationMapping } from '@/utils/locationTypes';

// Each raw profile location goes to the server as-is; it picks the place (or none) with
// Mapbox candidates and Jev, so no alias tables or reject lists are needed here
type Resolution = { places: LocationMapping[]; isPlace: number };
export type ResolveProgress = { done: number; total: number };

const RESOLVE_URL = 'https://location-coords-cache.vercel.app/api/resolve';
const BATCH_SIZE = 40;
const CACHED_BATCH_SIZE = 150;
const PARALLEL = 3;

const chunk = <T,>(xs: T[], size: number) =>
  Array.from({ length: Math.ceil(xs.length / size) }, (_, i) => xs.slice(i * size, (i + 1) * size));

// Same-named places in different countries stay apart: "Cambridge, United Kingdom"
const sameNamedPlaces = /\b(alexandria|cambridge|victoria|san jose|venice|bend)\b/i;

// Same key the server caches under: "SF" and "sf" are one question
const cacheKey = (raw: string) =>
  `resolved:${raw.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim()}`;

const fetchBatch = async (
  batch: string[],
  cachedOnly = false,
  attempt = 0
): Promise<Record<string, Resolution>> => {
  const response = await fetch(RESOLVE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locations: batch, cachedOnly }),
  });
  if (response.ok) return response.json();
  if (attempt < 1) return fetchBatch(batch, cachedOnly, attempt + 1);
  throw new Error(`HTTP error! status: ${response.status}`);
};

export const resolveUserLocations = async (
  users: User[],
  onProgress: (progress: ResolveProgress) => void
) => {
  const usersByRaw: { [raw: string]: UsersMap } = {};
  for (const user of users) {
    const raw = user.location?.trim();
    if (raw) (usersByRaw[raw] ??= {})[user.screen_name] = user;
  }
  const raws = Object.keys(usersByRaw);

  const cached: { [key: string]: Resolution } = await chrome.storage.local.get(raws.map(cacheKey));
  const resolved: { [raw: string]: Resolution } = {};
  for (const raw of raws) if (cached[cacheKey(raw)]) resolved[raw] = cached[cacheKey(raw)];
  const remember = (results: Record<string, Resolution>) =>
    chrome.storage.local.set(
      Object.fromEntries(Object.entries(results).map(([raw, r]) => [cacheKey(raw), (resolved[raw] = r)]))
    );

  // Progress only when there is network work, so a warm cache never flashes a loader
  let misses = raws.filter((raw) => !resolved[raw]);
  if (misses.length) onProgress({ done: raws.length - misses.length, total: raws.length });

  // The server's shared cache already knows most strings: fetch those in a few big requests,
  // so only the true misses wait on Mapbox and Jev
  await Promise.all(
    chunk(misses, CACHED_BATCH_SIZE).map((batch) =>
      fetchBatch(batch, true).then(remember, (error) => console.warn('Cache lookup failed', error))
    )
  );
  misses = misses.filter((raw) => !resolved[raw]);
  let done = raws.length - misses.length;
  if (misses.length) onProgress({ done, total: raws.length });

  const batches = chunk(misses, BATCH_SIZE);
  const worker = async () => {
    for (let batch = batches.shift(); batch; batch = batches.shift()) {
      try {
        await remember(await fetchBatch(batch));
      } catch (error) {
        // Left uncached, so the next open retries them
        console.warn('Could not place locations', batch, error);
      }
      done += batch.length;
      onProgress({ done, total: raws.length });
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));

  // Everyone is listed under each level of their place: city, region and country
  const mappedLocations: { [key: string]: UsersMap } = {};
  const locationToTypeMapping: { [key: string]: string } = {};
  const cityToCountryMapping: { [key: string]: string } = {};
  for (const raw of raws) {
    for (const { addressParts } of resolved[raw]?.places ?? []) {
      const country = addressParts[addressParts.length - 1].text;
      for (const { text, placeType } of addressParts) {
        const name = sameNamedPlaces.test(text) ? `${text}, ${country}` : text;
        const type = placeType === 'place' ? 'city' : placeType;
        if (!locationToTypeMapping[name] || type === 'city') locationToTypeMapping[name] = type;
        if (type === 'city') cityToCountryMapping[name] = country;
        mappedLocations[name] = { ...mappedLocations[name], ...usersByRaw[raw] };
      }
    }
  }

  // Only list places shared by more than one person
  return {
    mappedLocations: Object.fromEntries(
      Object.entries(mappedLocations).filter(([, users]) => Object.keys(users).length > 1)
    ),
    locationToTypeMapping,
    cityToCountryMapping,
  };
};
