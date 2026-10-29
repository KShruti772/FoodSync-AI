'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DemoUser,
  DemoDonation,
  DemoMatch,
  DemoNotification,
  DemoImpactMetrics,
  INITIAL_DEMO_USERS,
  INITIAL_DEMO_DONATIONS,
  INITIAL_DEMO_MATCHES,
  INITIAL_DEMO_NOTIFICATIONS,
  INITIAL_DEMO_IMPACT,
} from './demo-data';
import {
  apiGetMe,
  apiGetDonations,
  apiGetDonationMatches,
  apiGetRecipientMatches,
  apiCreateDonation,
  apiAcceptMatch,
  apiRejectMatch,
  apiCompleteDonation,
  apiLogin,
  apiRegister,
} from './api';
import type { BackendUser, DonationCreatePayload } from './api';
import { mapApiDonation, mapApiMatch } from './api-mappers';
import { mapBackendUser } from './backend-user-mapper.mjs';
import type { RegisterPayload } from './api';

interface DemoContextType {
  user: DemoUser | null;
  isLoaded: boolean;
  dashboardError: string | null;
  donations: DemoDonation[];
  matches: DemoMatch[];
  notifications: DemoNotification[];
  impactMetrics: DemoImpactMetrics;
  unreadCount: number;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  createDonation: (data: {
    title: string;
    foodType: string;
    quantity: number;
    quantityUnit: string;
    expiryHours: number;
    storageRequirement: 'AMBIENT' | 'REFRIGERATED' | 'FROZEN';
    dietary: string[];
    handlingNotes: string;
  }) => Promise<string>;
  acceptMatch: (matchId: string) => Promise<void>;
  rejectMatch: (matchId: string) => Promise<void>;
  completePickup: (donationId: string) => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'foodsync_demo_user',
  TOKEN: 'foodsync_backend_token',
  DONATIONS: 'foodsync_demo_donations',
  MATCHES: 'foodsync_demo_matches',
  NOTIFICATIONS: 'foodsync_demo_notifications',
  IMPACT: 'foodsync_demo_impact',
};

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<DemoUser | null>(null);
  const [donations, setDonations] = useState<DemoDonation[]>(INITIAL_DEMO_DONATIONS);
  const [matches, setMatches] = useState<DemoMatch[]>(INITIAL_DEMO_MATCHES);
  const [notifications, setNotifications] = useState<DemoNotification[]>(INITIAL_DEMO_NOTIFICATIONS);
  const [impactMetrics, setImpactMetrics] = useState<DemoImpactMetrics>(INITIAL_DEMO_IMPACT);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const saveUser = (newUser: DemoUser | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  };

  const saveToken = (token: string | null) => {
    setAuthToken(token);
    if (token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    }
  };

  const fetchBackendData = async (token: string, backendUser: BackendUser) => {
    const apiDonations = await apiGetDonations(token);
    const apiMatches =
      backendUser.role === 'RECIPIENT'
        ? await apiGetRecipientMatches(token)
        : (await Promise.all(
            apiDonations.map((donation) => apiGetDonationMatches(token, donation.id)),
          )).flat();

    return {
      donations: apiDonations.map(mapApiDonation),
      matches: apiMatches.map((match) =>
        mapApiMatch(match, backendUser.organization_name || backendUser.email),
      ),
    };
  };

  const refreshBackendData = async (token: string, backendUser: BackendUser) => {
    const data = await fetchBackendData(token, backendUser);
    setDonations(data.donations);
    setMatches(data.matches);
    return data;
  };

  const refreshCurrentBackendData = async (token: string) => {
    const backendUser = await apiGetMe(token);
    await refreshBackendData(token, backendUser);
  };

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (savedToken) {
          setAuthToken(savedToken);
          const backendUser = await apiGetMe(savedToken);
          if (cancelled) return;
          saveUser(mapBackendUser(backendUser));
          setDonations([]);
          setMatches([]);
          setNotifications([]);
          try {
            const data = await fetchBackendData(savedToken, backendUser);
            if (!cancelled) {
              setDonations(data.donations);
              setMatches(data.matches);
            }
          } catch (error) {
            if (!cancelled) {
              setDashboardError(
                error instanceof Error ? error.message : 'Unable to load account dashboard data.',
              );
            }
          }
        } else {
          const savedDonations = localStorage.getItem(STORAGE_KEYS.DONATIONS);
          const savedMatches = localStorage.getItem(STORAGE_KEYS.MATCHES);
          const savedNotifs = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
          const savedImpact = localStorage.getItem(STORAGE_KEYS.IMPACT);

          if (savedDonations) setDonations(JSON.parse(savedDonations) as DemoDonation[]);
          if (savedMatches) setMatches(JSON.parse(savedMatches) as DemoMatch[]);
          if (savedNotifs) setNotifications(JSON.parse(savedNotifs) as DemoNotification[]);
          if (savedImpact) setImpactMetrics(JSON.parse(savedImpact) as DemoImpactMetrics);
        }
      } catch (error) {
        saveToken(null);
        saveUser(null);
        setDashboardError(
          error instanceof Error ? error.message : 'Unable to load the authenticated account.',
        );
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveDonations = (newDonations: DemoDonation[]) => {
    setDonations(newDonations);
    localStorage.setItem(STORAGE_KEYS.DONATIONS, JSON.stringify(newDonations));
  };

  const saveMatches = (newMatches: DemoMatch[]) => {
    setMatches(newMatches);
    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(newMatches));
  };

  const saveNotifications = (newNotifs: DemoNotification[]) => {
    setNotifications(newNotifs);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(newNotifs));
  };

  const saveImpact = (newImpact: DemoImpactMetrics) => {
    setImpactMetrics(newImpact);
    localStorage.setItem(STORAGE_KEYS.IMPACT, JSON.stringify(newImpact));
  };

  // Actions
  const login = async (email: string, password: string) => {
    const response = await apiLogin(email, password);
    const newUser = mapBackendUser(response.user);
    saveToken(response.token);
    saveUser(newUser);
    setDonations([]);
    setMatches([]);
    setNotifications([]);
    setDashboardError(null);
    try {
      await refreshBackendData(response.token, response.user);
    } catch (error) {
      setDashboardError(
        error instanceof Error ? error.message : 'Unable to load account dashboard data.',
      );
    }
    router.push('/dashboard');
  };

  const register = async (payload: RegisterPayload) => {
    const response = await apiRegister(payload);
    const newUser = mapBackendUser(response.user);
    saveToken(response.token);
    saveUser(newUser);
    setDonations([]);
    setMatches([]);
    setNotifications([]);
    setDashboardError(null);
    try {
      await refreshBackendData(response.token, response.user);
    } catch (error) {
      setDashboardError(
        error instanceof Error ? error.message : 'Unable to load account dashboard data.',
      );
    }
    router.push('/dashboard');
  };

  const logout = () => {
    saveToken(null);
    saveUser(null);
    setDonations([]);
    setMatches([]);
    setNotifications([]);
    setDashboardError(null);
    router.push('/login');
  };

  const createDonation = async (data: {
    title: string;
    foodType: string;
    quantity: number;
    quantityUnit: string;
    expiryHours: number;
    storageRequirement: 'AMBIENT' | 'REFRIGERATED' | 'FROZEN';
    dietary: string[];
    handlingNotes: string;
  }): Promise<string> => {
    if (authToken) {
      if (!user?.address || user.latitude == null || user.longitude == null) {
        throw new Error('Your registered address and location are required to create a donation.');
      }

      const preparedAt = new Date();
      const categoryByLabel: Record<string, string> = {
        'Cooked Meals': 'VEGETARIAN_COOKED',
        Bakery: 'BAKERY',
        'Fresh Produce': 'PRODUCE_RAW',
        Dairy: 'PACKAGED_GROCERY',
        'Packaged Goods': 'PACKAGED_GROCERY',
      };
      const payload: DonationCreatePayload = {
        title: data.title,
        food_type: categoryByLabel[data.foodType] || 'PACKAGED_GROCERY',
        perishable: ['Cooked Meals', 'Fresh Produce', 'Dairy'].includes(data.foodType),
        quantity_meals: Number(data.quantity),
        prepared_at: preparedAt.toISOString(),
        expiry_time: new Date(preparedAt.getTime() + data.expiryHours * 3_600_000).toISOString(),
        pickup_address: user.address,
        latitude: user.latitude,
        longitude: user.longitude,
        special_instructions: data.handlingNotes,
      };
      const created = await apiCreateDonation(authToken, payload);
      await refreshCurrentBackendData(authToken);
      return created.id;
    }

    const donationId = `don-${Date.now().toString().slice(-4)}`;

    const newDonation: DemoDonation = {
      id: donationId,
      providerId: user?.id || 'usr-prov-001',
      providerOrg: user?.organization || 'Green Valley Kitchen & Catering',
      title: data.title,
      foodType: data.foodType,
      quantity: Number(data.quantity),
      quantityUnit: data.quantityUnit,
      createdAt: 'Just now',
      expiryHours: Number(data.expiryHours),
      expiryTime: `In ${data.expiryHours} hours`,
      storageRequirement: data.storageRequirement,
      dietary: data.dietary.length > 0 ? data.dietary : ['General Edible'],
      status: 'AVAILABLE',
      approxLocation: 'Solapur Central Area • 2.1 km radius',
      exactAddress: '42 Market Cross Road, Commercial Complex, Solapur Central',
      contactPerson: user?.name || 'Maya Sharma',
      contactPhone: '+91 98765 43210',
      handlingNotes: data.handlingNotes || 'Handle with clean temperature-controlled containers.',
      matchedCount: 2,
    };

    // Generate candidate matches using deterministic weights simulation
    const newMatches: DemoMatch[] = [
      {
        id: `mat-${Date.now().toString().slice(-4)}-1`,
        donationId,
        recipientId: 'usr-recip-001',
        recipientName: 'Hope Shelter & Community Pantry',
        recipientType: 'Emergency Shelter & Community Kitchen',
        matchScore: 92,
        distanceKm: 2.1,
        urgencyScore: 95,
        capacityScore: 90,
        requirementScore: 100,
        status: 'PROPOSED',
        proposedAt: 'Just now',
        whyBreakdown: {
          distanceText: '2.1 km away (Travel time ~7 mins)',
          urgencyText: `Prioritized for pickup before ${data.expiryHours}h expiry window`,
          capacityText: `Daily capacity of 75 meals fits ${data.quantity} ${data.quantityUnit} batch`,
          requirementText: `Storage (${data.storageRequirement}) and dietary compatibility verified`,
        },
      },
      {
        id: `mat-${Date.now().toString().slice(-4)}-2`,
        donationId,
        recipientId: 'usr-recip-003',
        recipientName: 'Shanti Old Age Home',
        recipientType: 'Senior Care Organization',
        matchScore: 76,
        distanceKm: 4.3,
        urgencyScore: 80,
        capacityScore: 75,
        requirementScore: 90,
        status: 'PROPOSED',
        proposedAt: 'Just now',
        whyBreakdown: {
          distanceText: '4.3 km away (Travel time ~15 mins)',
          urgencyText: 'Compatible with standard afternoon distribution schedule',
          capacityText: 'Capacity of 40 meals',
          requirementText: 'Compatible storage facilities',
        },
      },
    ];

    const newNotif: DemoNotification = {
      id: `notif-${Date.now().toString().slice(-4)}`,
      userId: user?.id || 'usr-prov-001',
      title: 'Listing Published & Candidates Matched',
      message: `Your donation "${data.title}" (${data.quantity} ${data.quantityUnit}) was published. Top candidate: Hope Shelter (Score 92/100).`,
      timestamp: 'Just now',
      read: false,
      type: 'MATCH_PROPOSED',
      link: `/donations/${donationId}`,
    };

    saveDonations([newDonation, ...donations]);
    saveMatches([...newMatches, ...matches]);
    saveNotifications([newNotif, ...notifications]);

    return donationId;
  };

  const acceptMatch = async (matchId: string) => {
    if (authToken) {
      await apiAcceptMatch(authToken, matchId);
      await refreshCurrentBackendData(authToken);
      return;
    }

    const targetMatch = matches.find((m) => m.id === matchId);
    if (!targetMatch) return;
    const pickupDeadline = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // 1. Update Match status to ACCEPTED
    const updatedMatches = matches.map((m) => {
      if (m.id === matchId) {
        return { ...m, status: 'ACCEPTED' as const, pickupDeadline };
      }
      return m;
    });

    // 2. Update Donation status to RESERVED
    const updatedDonations = donations.map((d) => {
      if (d.id === targetMatch.donationId) {
        return {
          ...d,
          status: 'RESERVED' as const,
          reservedRecipientId: targetMatch.recipientId,
          reservedRecipientName: targetMatch.recipientName,
          reservationDeadline: pickupDeadline,
        };
      }
      return d;
    });

    // 3. Create notifications for both Recipient and Provider
    const notifRecipient: DemoNotification = {
      id: `notif-acc-${Date.now().toString().slice(-4)}`,
      userId: targetMatch.recipientId,
      title: 'Match Accepted — Pickup Details Unlocked',
      message: `You accepted match for donation #${targetMatch.donationId}. Full pickup address and donor contact are now revealed.`,
      timestamp: 'Just now',
      read: false,
      type: 'MATCH_ACCEPTED',
      link: `/matches/${matchId}`,
    };

    const notifProvider: DemoNotification = {
      id: `notif-prov-${Date.now().toString().slice(-4)}`,
      userId: 'usr-prov-001',
      title: 'Recipient Accepted Your Surplus Food',
      message: `${targetMatch.recipientName} accepted donation #${targetMatch.donationId}. Collect it by ${new Date(pickupDeadline).toLocaleString()}.`,
      timestamp: 'Just now',
      read: false,
      type: 'MATCH_ACCEPTED',
      link: `/donations/${targetMatch.donationId}`,
    };

    saveMatches(updatedMatches);
    saveDonations(updatedDonations);
    saveNotifications([notifRecipient, notifProvider, ...notifications]);
  };

  const rejectMatch = async (matchId: string) => {
    if (authToken) {
      await apiRejectMatch(authToken, matchId);
      await refreshCurrentBackendData(authToken);
      return;
    }

    const updatedMatches = matches.map((m) => {
      if (m.id === matchId) {
        return { ...m, status: 'REJECTED' as const };
      }
      return m;
    });

    saveMatches(updatedMatches);
  };

  const completePickup = async (donationId: string) => {
    if (authToken) {
      await apiCompleteDonation(authToken, donationId);
      await refreshCurrentBackendData(authToken);
      return;
    }

    const targetDonation = donations.find((d) => d.id === donationId);
    if (!targetDonation) return;

    // Transition donation status to COMPLETED
    const updatedDonations = donations.map((d) => {
      if (d.id === donationId) {
        return { ...d, status: 'COMPLETED' as const };
      }
      return d;
    });
    const updatedMatches = matches.map((match) =>
      match.donationId === donationId && match.status === 'ACCEPTED'
        ? { ...match, status: 'COMPLETED' as const, reservationOutcome: 'COLLECTED' }
        : match
    );

    // Update impact metrics
    const updatedImpact: DemoImpactMetrics = {
      ...impactMetrics,
      totalMealsRescued: impactMetrics.totalMealsRescued + targetDonation.quantity,
      co2OffsetKg: impactMetrics.co2OffsetKg + targetDonation.quantity * 2,
      totalDonations: impactMetrics.totalDonations + 1,
    };

    const completionNotif: DemoNotification = {
      id: `notif-comp-${Date.now().toString().slice(-4)}`,
      userId: targetDonation.providerId,
      title: 'Pickup Confirmed & Food Rescued!',
      message: `Donation #${donationId} (${targetDonation.quantity} ${targetDonation.quantityUnit}) was completed successfully. +${targetDonation.quantity} meals added to community impact!`,
      timestamp: 'Just now',
      read: false,
      type: 'DONATION_COMPLETED',
      link: `/donations/${donationId}`,
    };

    saveDonations(updatedDonations);
    saveMatches(updatedMatches);
    saveImpact(updatedImpact);
    saveNotifications([completionNotif, ...notifications]);
  };

  const markNotificationRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveNotifications(updated);
  };

  const markAllNotificationsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const unreadCount = user
    ? notifications.filter((n) => n.userId === user.id && !n.read).length
    : notifications.filter((n) => !n.read).length;

  return (
    <DemoContext.Provider
      value={{
        user,
        isLoaded,
        dashboardError,
        donations,
        matches,
        notifications,
        impactMetrics,
        unreadCount,
        login,
        register,
        logout,
        createDonation,
        acceptMatch,
        rejectMatch,
        completePickup,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}
