/**
 * Pure TypeScript geohash encoder.
 * Used SERVER-SIDE ONLY during post upload.
 * Raw lat/lng values NEVER leave this module or the server action.
 *
 * Precision 4 → ~45km × 45km cell — enough for general area without
 * exposing a user's neighbourhood or street.
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encode a latitude/longitude pair into a geohash string.
 * @param lat  Latitude  (-90  to  90)
 * @param lng  Longitude (-180 to 180)
 * @param precision  Length of resulting hash (default 4 ≈ 45km cell)
 */
export function encodeGeohash(lat: number, lng: number, precision = 4): string {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';

  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      // Bisect E–W longitude
      const lngMid = (lngMin + lngMax) / 2;
      if (lng >= lngMid) {
        idx = idx * 2 + 1;
        lngMin = lngMid;
      } else {
        idx = idx * 2;
        lngMax = lngMid;
      }
    } else {
      // Bisect N–S latitude
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) {
        idx = idx * 2 + 1;
        latMin = latMid;
      } else {
        idx = idx * 2;
        latMax = latMid;
      }
    }
    evenBit = !evenBit;

    if (++bit === 5) {
      geohash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }

  return geohash;
}
