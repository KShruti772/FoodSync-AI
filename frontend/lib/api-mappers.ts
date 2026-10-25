import type { ApiDonation, ApiMatch } from './api';
import type { DemoDonation, DemoMatch } from './demo-data';

const foodTypeLabels: Record<string, string> = {
  VEGETARIAN_COOKED: 'Vegetarian cooked food',
  NON_VEGETARIAN_COOKED: 'Non-vegetarian cooked food',
  PACKAGED_GROCERY: 'Packaged groceries',
  PRODUCE_RAW: 'Fresh produce',
  BAKERY: 'Bakery',
};

export function mapApiDonation(donation: ApiDonation): DemoDonation {
  const expiry = new Date(donation.expiry_time);
  const hoursUntilExpiry = Math.max(0, (expiry.getTime() - Date.now()) / 3_600_000);

  return {
    id: donation.id,
    providerId: donation.provider_id,
    providerOrg: donation.provider_org || 'Food provider',
    providerAddress: donation.provider_address || null,
    providerPhone: donation.provider_phone || null,
    title: donation.title,
    foodType: foodTypeLabels[donation.food_type] || donation.food_type,
    quantity: donation.quantity_meals,
    quantityUnit: 'meals',
    createdAt: donation.created_at ? new Date(donation.created_at).toLocaleString() : 'Recently listed',
    expiryHours: hoursUntilExpiry,
    expiryTime: Number.isNaN(expiry.getTime()) ? 'Not available' : expiry.toLocaleString(),
    storageRequirement: 'AMBIENT',
    dietary: [],
    status: donation.status,
    approxLocation: 'Pickup location shared after reservation',
    exactAddress: donation.pickup_address || 'Exact pickup address is disclosed after acceptance.',
    contactPerson: '',
    contactPhone: '',
    handlingNotes: donation.special_instructions || '',
    matchedCount: 0,
    reservedRecipientId: donation.reserved_recipient_id || undefined,
    reservedRecipientName: donation.reserved_recipient_name || undefined,
    reservationDeadline: donation.reservation_deadline || null,
  };
}

export function mapApiMatch(match: ApiMatch, recipientName: string): DemoMatch {
  const factors = match.matched_factors || {};
  const urgency = Math.round((factors.urgency_score || 0) * 100);
  const capacity = Math.round((factors.capacity_score || 0) * 100);
  const requirement = Math.round((factors.requirement_score || 0) * 100);

  return {
    id: match.id,
    donationId: match.donation_id,
    recipientId: match.recipient_id,
    recipientName,
    recipientType: 'Recipient organization',
    matchScore: Math.round(match.compatibility_score * 100),
    distanceKm: match.distance_km,
    urgencyScore: urgency,
    capacityScore: capacity,
    requirementScore: requirement,
    status: match.status,
    proposedAt: match.created_at ? new Date(match.created_at).toLocaleString() : 'Recently matched',
    pickupDeadline: match.pickup_deadline || null,
    whyBreakdown: {
      distanceText: `${match.distance_km} km away`,
      urgencyText: `Urgency compatibility ${urgency}/100`,
      capacityText: `Capacity compatibility ${capacity}/100`,
      requirementText: `Food requirement compatibility ${requirement}/100`,
    },
  };
}
