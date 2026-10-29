/**
 * @param {number | null | undefined} latitude
 * @param {number | null | undefined} longitude
 * @returns {[number, number] | null}
 */
export function getValidPickupCoordinates(latitude, longitude) {
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return [latitude, longitude];
}
