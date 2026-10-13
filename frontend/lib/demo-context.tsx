'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  ApiDonation,
  ApiDonationCreate,
  ApiMatch,
  ApiRecipientProfile,
  ApiRecipientProfileUpdate,
  apiAcceptMatch,
  apiCompleteDonation,
  apiCreateDonation,
  apiGetDonationMatches,
  apiGetDonations,
  apiGetImpactSummary,
  apiGetMe,
  apiGetNotifications,
  apiGetRecipientMatches,
  apiGetRecipientProfile,
  apiLogin,
  apiMarkNotificationRead,
  apiRegister,
  apiRejectMatch,
  apiUpdateRecipientProfile,
  mapApiDonationToDemo,
  mapApiImpactToDemo,
  mapApiMatchToDemo,
  mapApiNotificationToDemo,
  mapFoodTypeToApi,
} from './api';

interface DemoContextType {
  user: DemoUser | null;
  token: string | null;
  isLoaded: boolean;
  isLiveBackend: boolean;
  donations: DemoDonation[];
  matches: DemoMatch[];
  notifications: DemoNotification[];
  impactMetrics: DemoImpactMetrics;
  unreadCount: number;
  loginAs: (role: 'FOOD_PROVIDER' | 'RECIPIENT') => void;
  login: (email: string, password: string, role?: 'FOOD_PROVIDER' | 'RECIPIENT') => Promise<void>;
  register: (fullName: string, email: string, password: string, role: 'FOOD_PROVIDER' | 'RECIPIENT') => Promise<void>;
  logout: () => void;
  switchRole: () => void;
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
  completePickup: (donationId: string, payload?: { confirmedQuantityMeals?: number; notes?: string }) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  refreshData: () => Promise<void>;
  recipientProfile: ApiRecipientProfile | null;
  getRecipientProfile: () => Promise<ApiRecipientProfile | null>;
  updateRecipientProfile: (payload: ApiRecipientProfileUpdate) => Promise<ApiRecipientProfile>;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'foodsync_demo_user',
  TOKEN: 'foodsync_backend_token',
  DONATIONS: 'foodsync_demo_donations',
  MATCHES: 'foodsync_demo_matches',
  NOTIFICATIONS: 'foodsync_demo_notifications',
  IMPACT: 'foodsync_demo_impact',
  RECIPIENT_PROFILE: 'foodsync_demo_recipient_profile',
};

const EMPTY_IMPACT: DemoImpactMetrics = {
  totalMealsRescued: 0,
  totalDonations: 0,
  activeMatches: 0,
  co2OffsetKg: 0,
  activeProvidersCount: 0,
  activeRecipientsCount: 0,
};

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLiveBackend, setIsLiveBackend] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<DemoUser | null>(null);
  const [donations, setDonations] = useState<DemoDonation[]>([]);
  const [matches, setMatches] = useState<DemoMatch[]>([]);
  const [notifications, setNotifications] = useState<DemoNotification[]>([]);
  const [impactMetrics, setImpactMetrics] = useState<DemoImpactMetrics>(EMPTY_IMPACT);
  const [recipientProfile, setRecipientProfile] = useState<ApiRecipientProfile | null>(null);

  const mapBackendUser = (backendUser: any): DemoUser => {
    const role = backendUser.role === 'RECIPIENT' ? 'RECIPIENT' : 'FOOD_PROVIDER';
    const initials = (backendUser.organization_name || backendUser.email || 'FS')
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return {
      id: backendUser.id,
      name: backendUser.organization_name || backendUser.email,
      email: backendUser.email,
      role,
      organization: backendUser.organization_name || 'FoodSync Organization',
      location: backendUser.address || 'Solapur Central',
      avatarInitials: initials || 'FS',
      latitude: backendUser.latitude,
      longitude: backendUser.longitude,
    };
  };

  const saveUser = (newUser: DemoUser | null) => {
    setUser(newUser);
    if (typeof window !== 'undefined') {
      if (newUser) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    }
  };

  const saveToken = (newToken: string | null) => {
    setToken(newToken);
    if (typeof window !== 'undefined') {
      if (newToken) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
      } else {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      }
    }
  };

  const saveDonations = (newDonations: DemoDonation[]) => {
    setDonations(newDonations);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.DONATIONS, JSON.stringify(newDonations));
    }
  };

  const saveMatches = (newMatches: DemoMatch[]) => {
    setMatches(newMatches);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(newMatches));
    }
  };

  const saveNotifications = (newNotifs: DemoNotification[]) => {
    setNotifications(newNotifs);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(newNotifs));
    }
  };

  const saveImpact = (newImpact: DemoImpactMetrics) => {
    setImpactMetrics(newImpact);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.IMPACT, JSON.stringify(newImpact));
    }
  };

  // Reconcile and load authoritative data from FastAPI backend
  const loadLiveBackendData = useCallback(
    async (token: string, currentUser?: DemoUser | null, throwOnError: boolean = false) => {
      try {
        const activeRole = currentUser?.role || (user?.role ?? 'FOOD_PROVIDER');

      // 1. Fetch donations
      const apiDonations = await apiGetDonations(token).catch(() => []);

      // 2. Fetch matches based on role & profile
      let apiMatches: ApiMatch[] = [];
      if (activeRole === 'RECIPIENT') {
        apiMatches = await apiGetRecipientMatches(token).catch(() => []);
        const prof = await apiGetRecipientProfile(token).catch(() => null);
        if (prof) setRecipientProfile(prof);
      } else {
        const matchPromises = apiDonations.map((d) =>
          apiGetDonationMatches(d.id, token).catch(() => [])
        );
        const matchResults = await Promise.all(matchPromises);
        apiMatches = matchResults.flat();
      }

      // 3. Fetch notifications
      const apiNotifs = await apiGetNotifications(token).catch(() => []);

      // 4. Fetch impact summary
      const apiImpact = await apiGetImpactSummary().catch(() => null);

      // Map to UI models
      const donationMap = new Map<string, ApiDonation>(apiDonations.map((d) => [d.id, d]));

      const mappedMatches: DemoMatch[] = apiMatches.map((m) => {
        const parentDonation = donationMap.get(m.donation_id) || null;
        return mapApiMatchToDemo(m, parentDonation);
      });

      const matchCounts = new Map<string, number>();
      const acceptedRecipients = new Map<string, string>();
      for (const m of apiMatches) {
        matchCounts.set(m.donation_id, (matchCounts.get(m.donation_id) || 0) + 1);
        if (m.status === 'ACCEPTED') {
          acceptedRecipients.set(m.donation_id, `Community Recipient (${m.recipient_id.slice(-6)})`);
        }
      }

      const mappedDonations: DemoDonation[] = apiDonations.map((d) =>
        mapApiDonationToDemo(
          d,
          currentUser ? { organization_name: currentUser.organization, email: currentUser.email } : null,
          matchCounts.get(d.id) || 0,
          acceptedRecipients.get(d.id)
        )
      );

      const mappedNotifs: DemoNotification[] = apiNotifs.map(mapApiNotificationToDemo);

      const mappedImpact: DemoImpactMetrics = apiImpact
        ? mapApiImpactToDemo(apiImpact, mappedMatches.length)
        : EMPTY_IMPACT;

      // Duplicate prevention: guarantee uniqueness by entity ID
      const uniqueMatches = Array.from(new Map(mappedMatches.map((m) => [m.id, m])).values());
      const uniqueDonations = Array.from(new Map(mappedDonations.map((d) => [d.id, d])).values());
      const uniqueNotifs = Array.from(new Map(mappedNotifs.map((n) => [n.id, n])).values());

      setDonations(uniqueDonations);
      setMatches(uniqueMatches);
      setNotifications(uniqueNotifs);
      setImpactMetrics(mappedImpact);
      setIsLiveBackend(true);
    } catch (err) {
      console.warn('Failed to load backend state:', err);
      if (throwOnError) throw err;
    }
  }, [user?.role]);

  // Hydrate on mount
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;

      const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const savedDonations = localStorage.getItem(STORAGE_KEYS.DONATIONS);
      const savedMatches = localStorage.getItem(STORAGE_KEYS.MATCHES);
      const savedNotifs = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      const savedImpact = localStorage.getItem(STORAGE_KEYS.IMPACT);
      const savedRecipientProfile = localStorage.getItem(STORAGE_KEYS.RECIPIENT_PROFILE);
      const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

      if (savedUser) setUser(JSON.parse(savedUser));
      if (savedDonations) setDonations(JSON.parse(savedDonations));
      if (savedMatches) setMatches(JSON.parse(savedMatches));
      if (savedNotifs) setNotifications(JSON.parse(savedNotifs));
      if (savedImpact) setImpactMetrics(JSON.parse(savedImpact));
      if (savedRecipientProfile) setRecipientProfile(JSON.parse(savedRecipientProfile));

      if (savedToken) {
        setToken(savedToken);
        apiGetMe(savedToken)
          .then((backendUser) => {
            const mapped = mapBackendUser(backendUser);
            setUser(mapped);
            setIsLiveBackend(true);
            return loadLiveBackendData(savedToken, mapped);
          })
          .catch(() => {
            saveToken(null);
            saveUser(null);
            setIsLiveBackend(false);
          });
      } else {
        setIsLiveBackend(false);
      }
    } catch {
      // Fall back to memory defaults
    } finally {
      setIsLoaded(true);
    }
  }, [loadLiveBackendData]);

  // Actions
  const loginAs = (_role: 'FOOD_PROVIDER' | 'RECIPIENT') => {
    router.push('/login');
  };

  const login = async (email: string, password: string, _rolePreference?: 'FOOD_PROVIDER' | 'RECIPIENT') => {
    const response = await apiLogin(email, password);
    const newUser = mapBackendUser(response.user);
    saveToken(response.token);
    saveUser(newUser);
    setIsLiveBackend(true);
    await loadLiveBackendData(response.token, newUser, true);
    router.push('/dashboard');
  };

  const register = async (fullName: string, email: string, password: string, role: 'FOOD_PROVIDER' | 'RECIPIENT') => {
    const response = await apiRegister({
      email,
      password,
      role,
      organization_name: fullName,
      phone: '+91 9000000000',
      address: 'Solapur, Maharashtra',
      latitude: 17.6599,
      longitude: 75.9064,
    });
    const newUser = mapBackendUser(response.user);
    saveToken(response.token);
    saveUser(newUser);
    setIsLiveBackend(true);
    await loadLiveBackendData(response.token, newUser, true);
    router.push('/dashboard');
  };

  const logout = () => {
    saveToken(null);
    saveUser(null);
    setRecipientProfile(null);
    setDonations([]);
    setMatches([]);
    setNotifications([]);
    setImpactMetrics(EMPTY_IMPACT);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.RECIPIENT_PROFILE);
      localStorage.removeItem(STORAGE_KEYS.DONATIONS);
      localStorage.removeItem(STORAGE_KEYS.MATCHES);
      localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
      localStorage.removeItem(STORAGE_KEYS.IMPACT);
    }
    setIsLiveBackend(false);
    router.push('/login');
  };

  const switchRole = () => {
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
    const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
    if (!token) {
      throw new Error('Authentication required to create a donation.');
    }

    const payload: ApiDonationCreate = {
      title: data.title,
      food_type: mapFoodTypeToApi(data.foodType, data.dietary),
      perishable: data.storageRequirement !== 'AMBIENT',
      quantity_meals: Number(data.quantity),
      prepared_at: new Date().toISOString(),
      expiry_time: new Date(Date.now() + Number(data.expiryHours) * 3600 * 1000).toISOString(),
      pickup_address:
        user?.location && user.location.length >= 5
          ? `${user.organization}, ${user.location}`
          : '42 Market Cross Road, Commercial Complex, Solapur Central',
      latitude: user?.latitude ?? 17.6599,
      longitude: user?.longitude ?? 75.9064,
      special_instructions:
        data.handlingNotes || (data.dietary.length > 0 ? `Dietary: ${data.dietary.join(', ')}` : null),
    };

    const created = await apiCreateDonation(payload, token);
    await loadLiveBackendData(token, user, true);
    return created.id;
  };

  const acceptMatch = async (matchId: string): Promise<void> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
    if (!token) {
      throw new Error('Authentication required to accept a match.');
    }
    await apiAcceptMatch(matchId, token);
    await loadLiveBackendData(token, user, true);
  };

  const rejectMatch = async (matchId: string): Promise<void> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
    if (!token) {
      throw new Error('Authentication required to reject a match.');
    }
    await apiRejectMatch(matchId, token);
    await loadLiveBackendData(token, user, true);
  };

  const completePickup = async (
    donationId: string,
    payload?: { confirmedQuantityMeals?: number; notes?: string }
  ): Promise<void> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
    if (!token) {
      throw new Error('Authentication required to complete a pickup.');
    }
    await apiCompleteDonation(
      donationId,
      {
        confirmed_quantity_meals: payload?.confirmedQuantityMeals,
        notes: payload?.notes,
      },
      token
    );
    await loadLiveBackendData(token, user, true);
  };

  const markNotificationRead = async (id: string): Promise<void> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
    if (token) {
      try {
        await apiMarkNotificationRead(id, token);
      } catch {
        // Continue to update local state even if server already read
      }
    }
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveNotifications(updated);
  };

  const markAllNotificationsRead = async (): Promise<void> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
    if (token) {
      const unreadList = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadList.map((n) => apiMarkNotificationRead(n.id, token).catch(() => {}))
      );
    }
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const refreshData = async (): Promise<void> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
    if (token) {
      await loadLiveBackendData(token, user, true);
    }
  };

  const getRecipientProfile = async (): Promise<ApiRecipientProfile | null> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
    if (!token) return null;
    const profile = await apiGetRecipientProfile(token);
    setRecipientProfile(profile);
    return profile;
  };

  const updateRecipientProfile = async (
    payload: ApiRecipientProfileUpdate
  ): Promise<ApiRecipientProfile> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
    if (!token) {
      throw new Error('Authentication required to update recipient profile.');
    }
    const updated = await apiUpdateRecipientProfile(payload, token);
    setRecipientProfile(updated);
    await loadLiveBackendData(token, user, true);
    return updated;
  };

  const unreadCount = user
    ? notifications.filter((n) => n.userId === user.id && !n.read).length
    : notifications.filter((n) => !n.read).length;

  return (
    <DemoContext.Provider
      value={{
        user,
        token,
        isLoaded,
        isLiveBackend,
        donations,
        matches,
        notifications,
        impactMetrics,
        unreadCount,
        loginAs,
        login,
        register,
        logout,
        switchRole,
        createDonation,
        acceptMatch,
        rejectMatch,
        completePickup,
        markNotificationRead,
        markAllNotificationsRead,
        refreshData,
        recipientProfile,
        getRecipientProfile,
        updateRecipientProfile,
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
