// Geospatial helper utilities shared across the location, buddy, gym,
// and checkin modules.

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Haversine distance in km between two [lng, lat] points.
function distanceKm([lng1, lat1], [lng2, lat2]) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function isValidCoordinates([lng, lat]) {
  return (
    typeof lng === 'number' && typeof lat === 'number'
    && lng >= -180 && lng <= 180
    && lat >= -90 && lat <= 90
    && !(lng === 0 && lat === 0) // reject unset "null island" coords
  );
}

// Rounds a distance down to a coarse public-facing bucket so we never leak
// a suspiciously precise number that could be used to triangulate someone's
// exact location via repeated queries.
function toApproximateDistance(km) {
  if (km < 0.5) return '< 0.5 km';
  if (km < 1) return '< 1 km';
  return `${Math.round(km * 10) / 10} km`;
}

module.exports = {
  distanceKm, isValidCoordinates, toApproximateDistance,
};
