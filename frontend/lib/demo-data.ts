export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: 'FOOD_PROVIDER' | 'RECIPIENT';
  organization: string;
  location: string;
  avatarInitials: string;
  latitude?: number;
  longitude?: number;
}

export interface DemoDonation {
  id: string;
  providerId: string;
  providerOrg: string;
  title: string;
  foodType: string;
  quantity: number;
  quantityUnit: string;
  createdAt: string;
  expiryHours: number;
  expiryTime: string;
  storageRequirement: 'AMBIENT' | 'REFRIGERATED' | 'FROZEN';
  dietary: string[];
  status: 'AVAILABLE' | 'RESERVED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  approxLocation: string;
  exactAddress: string;
  latitude?: number;
  longitude?: number;
  contactPerson: string;
  contactPhone: string;
  handlingNotes: string;
  matchedCount: number;
  reservedRecipientId?: string;
  reservedRecipientName?: string;
}

export interface DemoMatch {
  id: string;
  donationId: string;
  recipientId: string;
  recipientName: string;
  recipientType: string;
  matchScore: number;
  distanceKm: number;
  urgencyScore: number;
  capacityScore: number;
  requirementScore: number;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED';
  proposedAt: string;
  whyBreakdown: {
    distanceText: string;
    urgencyText: string;
    capacityText: string;
    requirementText: string;
  };
}

export interface DemoNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'MATCH_PROPOSED' | 'MATCH_ACCEPTED' | 'PICKUP_READY' | 'DONATION_COMPLETED' | 'SYSTEM';
  link?: string;
}

export interface DemoImpactMetrics {
  totalMealsRescued: number;
  totalDonations: number;
  activeMatches: number;
  co2OffsetKg: number;
  activeProvidersCount: number;
  activeRecipientsCount: number;
}

// ---------------------------------------------------------------------------
// Pre-populated realistic sample data
// ---------------------------------------------------------------------------

export const INITIAL_DEMO_USERS: Record<'provider' | 'recipient', DemoUser> = {
  provider: {
    id: 'usr-prov-001',
    name: 'Maya Sharma (Head Chef)',
    email: 'provider@demo.com',
    role: 'FOOD_PROVIDER',
    organization: 'Green Valley Kitchen & Catering',
    location: 'Solapur Central',
    avatarInitials: 'GV',
    latitude: 17.6599,
    longitude: 75.9064,
  },
  recipient: {
    id: 'usr-recip-001',
    name: 'Brother Thomas (Director)',
    email: 'recipient@demo.com',
    role: 'RECIPIENT',
    organization: 'Hope Shelter & Community Pantry',
    location: 'Solapur East (2.1 km away)',
    avatarInitials: 'HS',
    latitude: 17.6650,
    longitude: 75.9120,
  },
};

export const INITIAL_DEMO_DONATIONS: DemoDonation[] = [
  {
    id: 'don-101',
    providerId: 'usr-prov-001',
    providerOrg: 'Green Valley Kitchen & Catering',
    title: 'Fresh Prepared Lunch Meals (Rice & Vegetable Curry)',
    foodType: 'Cooked Meals',
    quantity: 50,
    quantityUnit: 'Meals',
    createdAt: '45 minutes ago',
    expiryHours: 2,
    expiryTime: 'In 1h 45m',
    storageRequirement: 'REFRIGERATED',
    dietary: ['Vegetarian', 'Nut-Free', 'Halal-Friendly'],
    status: 'AVAILABLE',
    approxLocation: 'Solapur Central Area • 2.1 km radius',
    exactAddress: '42 Market Cross Road, Commercial Complex, Solapur Central',
    latitude: 17.6599,
    longitude: 75.9064,
    contactPerson: 'Maya Sharma (Head Chef)',
    contactPhone: '+91 98765 43210',
    handlingNotes: 'Packed in food-grade thermal containers. Keep chilled or reheat above 65°C.',
    matchedCount: 3,
  },
  {
    id: 'don-102',
    providerId: 'usr-prov-001',
    providerOrg: 'Green Valley Kitchen & Catering',
    title: 'Artisan Whole Wheat Bread & Breakfast Rolls',
    foodType: 'Bakery',
    quantity: 80,
    quantityUnit: 'Meals',
    createdAt: '2 hours ago',
    expiryHours: 6,
    expiryTime: 'In 4h 30m',
    storageRequirement: 'AMBIENT',
    dietary: ['Vegetarian', 'Dairy-Free'],
    status: 'AVAILABLE',
    approxLocation: 'Solapur Central Area • 2.1 km radius',
    exactAddress: '42 Market Cross Road, Commercial Complex, Solapur Central',
    latitude: 17.6599,
    longitude: 75.9064,
    contactPerson: 'Maya Sharma (Head Chef)',
    contactPhone: '+91 98765 43210',
    handlingNotes: 'Freshly baked this morning, sealed in moisture-proof crates.',
    matchedCount: 2,
  },
  {
    id: 'don-103',
    providerId: 'usr-prov-001',
    providerOrg: 'Green Valley Kitchen & Catering',
    title: 'Fresh Farm Produce (Carrots, Greens, Potatoes)',
    foodType: 'Fresh Produce',
    quantity: 120,
    quantityUnit: 'Meals',
    createdAt: 'Yesterday',
    expiryHours: 24,
    expiryTime: 'Completed Today',
    storageRequirement: 'AMBIENT',
    dietary: ['Vegetarian', 'Vegan', 'Gluten-Free'],
    status: 'COMPLETED',
    approxLocation: 'Solapur Central Area',
    exactAddress: '42 Market Cross Road, Commercial Complex, Solapur Central',
    contactPerson: 'Maya Sharma (Head Chef)',
    contactPhone: '+91 98765 43210',
    handlingNotes: 'Successfully collected by Community Relief Center.',
    matchedCount: 4,
    reservedRecipientId: 'usr-recip-002',
    reservedRecipientName: 'Community Relief Center',
  },
];

export const INITIAL_DEMO_MATCHES: DemoMatch[] = [
  {
    id: 'mat-201',
    donationId: 'don-101',
    recipientId: 'usr-recip-001',
    recipientName: 'Hope Shelter & Community Pantry',
    recipientType: 'Emergency Shelter & Community Kitchen',
    matchScore: 91,
    distanceKm: 2.1,
    urgencyScore: 94,
    capacityScore: 90,
    requirementScore: 100,
    status: 'PROPOSED',
    proposedAt: '40 minutes ago',
    whyBreakdown: {
      distanceText: 'Within 2.1 km local radius (Travel time ~7 mins)',
      urgencyText: 'High urgency match prior to 2h expiry deadline',
      capacityText: 'Daily intake capacity of 75 meals comfortably accommodates 50 meals',
      requirementText: 'Matches refrigeration facility and Vegetarian dietary requirement',
    },
  },
  {
    id: 'mat-202',
    donationId: 'don-101',
    recipientId: 'usr-recip-003',
    recipientName: 'Shanti Old Age Home',
    recipientType: 'Senior Care Organization',
    matchScore: 78,
    distanceKm: 4.3,
    urgencyScore: 82,
    capacityScore: 75,
    requirementScore: 95,
    status: 'PROPOSED',
    proposedAt: '38 minutes ago',
    whyBreakdown: {
      distanceText: '4.3 km away (Travel time ~15 mins)',
      urgencyText: 'Compatible with current afternoon meal distribution',
      capacityText: 'Capacity of 40 meals requires partial batch coordination',
      requirementText: 'Full dietary and storage compliance',
    },
  },
  {
    id: 'mat-203',
    donationId: 'don-101',
    recipientId: 'usr-recip-004',
    recipientName: 'Solapur Youth Welfare Kitchen',
    recipientType: 'Youth Support & Food Program',
    matchScore: 71,
    distanceKm: 5.8,
    urgencyScore: 70,
    capacityScore: 85,
    requirementScore: 90,
    status: 'PROPOSED',
    proposedAt: '35 minutes ago',
    whyBreakdown: {
      distanceText: '5.8 km away (Travel time ~20 mins)',
      urgencyText: 'Lower urgency score due to travel buffer vs expiry window',
      capacityText: 'Capacity of 100 meals',
      requirementText: 'Full dietary compliance',
    },
  },
  {
    id: 'mat-204',
    donationId: 'don-102',
    recipientId: 'usr-recip-001',
    recipientName: 'Hope Shelter & Community Pantry',
    recipientType: 'Emergency Shelter & Community Kitchen',
    matchScore: 88,
    distanceKm: 2.1,
    urgencyScore: 85,
    capacityScore: 92,
    requirementScore: 100,
    status: 'PROPOSED',
    proposedAt: '1 hour ago',
    whyBreakdown: {
      distanceText: '2.1 km proximity',
      urgencyText: '4h+ shelf life window allows scheduled afternoon pickup',
      capacityText: '80 bread rolls fit daily pantry needs',
      requirementText: 'Ambient dry storage compatible',
    },
  },
];

export const INITIAL_DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: 'notif-301',
    userId: 'usr-prov-001',
    title: 'Top Candidate Matched',
    message: 'Hope Shelter & Community Pantry (Match Score 91/100) was recommended for your 50 Cooked Meals listing.',
    timestamp: '40 mins ago',
    read: false,
    type: 'MATCH_PROPOSED',
    link: '/donations/don-101',
  },
  {
    id: 'notif-302',
    userId: 'usr-recip-001',
    title: 'New Surplus Opportunity Available',
    message: '50 Fresh Cooked Meals available 2.1 km away from Green Valley Kitchen. Expiry in ~2 hours.',
    timestamp: '40 mins ago',
    read: false,
    type: 'MATCH_PROPOSED',
    link: '/matches/mat-201',
  },
  {
    id: 'notif-303',
    userId: 'usr-prov-001',
    title: 'Pickup Completed & Rescued',
    message: 'Donation #don-103 (120 Fresh Farm Produce) was marked as completed. Impact score updated.',
    timestamp: 'Today, 10:30 AM',
    read: true,
    type: 'DONATION_COMPLETED',
    link: '/donations/don-103',
  },
];

export const INITIAL_DEMO_IMPACT: DemoImpactMetrics = {
  totalMealsRescued: 4250,
  totalDonations: 128,
  activeMatches: 6,
  co2OffsetKg: 8500,
  activeProvidersCount: 34,
  activeRecipientsCount: 22,
};
