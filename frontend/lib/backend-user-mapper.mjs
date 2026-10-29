/**
 * @param {import('./api').BackendUser} backendUser
 * @returns {import('./demo-data').DemoUser}
 */
export function mapBackendUser(backendUser) {
  const role = backendUser.role === 'RECIPIENT' ? 'RECIPIENT' : 'FOOD_PROVIDER';
  const initials = (backendUser.organization_name || backendUser.email || 'FS')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return {
    id: backendUser.id,
    name: backendUser.organization_name || backendUser.email,
    email: backendUser.email,
    role,
    organization: backendUser.organization_name || 'FoodSync Organization',
    location: backendUser.address || '',
    avatarInitials: initials || 'FS',
    phone: backendUser.phone,
    address: backendUser.address,
    latitude: backendUser.latitude,
    longitude: backendUser.longitude,
  };
}
