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

interface DemoContextType {
  user: DemoUser | null;
  isLoaded: boolean;
  donations: DemoDonation[];
  matches: DemoMatch[];
  notifications: DemoNotification[];
  impactMetrics: DemoImpactMetrics;
  unreadCount: number;
  loginAs: (role: 'FOOD_PROVIDER' | 'RECIPIENT') => void;
  login: (email: string, role?: 'FOOD_PROVIDER' | 'RECIPIENT') => void;
  register: (fullName: string, email: string, role: 'FOOD_PROVIDER' | 'RECIPIENT') => void;
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
  }) => string;
  acceptMatch: (matchId: string) => void;
  rejectMatch: (matchId: string) => void;
  completePickup: (donationId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'foodsync_demo_user',
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

  // Hydrate from localStorage safely on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const savedDonations = localStorage.getItem(STORAGE_KEYS.DONATIONS);
      const savedMatches = localStorage.getItem(STORAGE_KEYS.MATCHES);
      const savedNotifs = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      const savedImpact = localStorage.getItem(STORAGE_KEYS.IMPACT);

      if (savedUser) setUser(JSON.parse(savedUser));
      if (savedDonations) setDonations(JSON.parse(savedDonations));
      if (savedMatches) setMatches(JSON.parse(savedMatches));
      if (savedNotifs) setNotifications(JSON.parse(savedNotifs));
      if (savedImpact) setImpactMetrics(JSON.parse(savedImpact));
    } catch {
      // Fall back to memory defaults
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Sync to localStorage
  const saveUser = (newUser: DemoUser | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  };

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
  const loginAs = (role: 'FOOD_PROVIDER' | 'RECIPIENT') => {
    const demoProfile = role === 'FOOD_PROVIDER' ? INITIAL_DEMO_USERS.provider : INITIAL_DEMO_USERS.recipient;
    saveUser(demoProfile);
    router.push('/dashboard');
  };

  const login = (email: string, rolePreference?: 'FOOD_PROVIDER' | 'RECIPIENT') => {
    const isRecipient =
      rolePreference === 'RECIPIENT' ||
      email.toLowerCase().includes('recipient') ||
      email.toLowerCase().includes('shelter') ||
      email.toLowerCase().includes('ngo');

    const newUser: DemoUser = {
      id: isRecipient ? 'usr-recip-001' : 'usr-prov-001',
      name: isRecipient ? 'Brother Thomas (Director)' : 'Maya Sharma (Head Chef)',
      email: email.trim() || (isRecipient ? 'recipient@demo.com' : 'provider@demo.com'),
      role: isRecipient ? 'RECIPIENT' : 'FOOD_PROVIDER',
      organization: isRecipient ? 'Hope Shelter & Community Pantry' : 'Green Valley Kitchen & Catering',
      location: isRecipient ? 'Solapur East (2.1 km away)' : 'Solapur Central',
      avatarInitials: isRecipient ? 'HS' : 'GV',
    };

    saveUser(newUser);
    router.push('/dashboard');
  };

  const register = (fullName: string, email: string, role: 'FOOD_PROVIDER' | 'RECIPIENT') => {
    const initials = fullName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || (role === 'FOOD_PROVIDER' ? 'FP' : 'RO');

    const newUser: DemoUser = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      name: fullName,
      email,
      role,
      organization: role === 'FOOD_PROVIDER' ? `${fullName}'s Kitchen` : `${fullName} Relief Center`,
      location: 'Solapur Urban District',
      avatarInitials: initials,
    };

    saveUser(newUser);
    router.push('/dashboard');
  };

  const logout = () => {
    saveUser(null);
    router.push('/login');
  };

  const switchRole = () => {
    if (!user || user.role === 'FOOD_PROVIDER') {
      loginAs('RECIPIENT');
    } else {
      loginAs('FOOD_PROVIDER');
    }
  };

  const createDonation = (data: {
    title: string;
    foodType: string;
    quantity: number;
    quantityUnit: string;
    expiryHours: number;
    storageRequirement: 'AMBIENT' | 'REFRIGERATED' | 'FROZEN';
    dietary: string[];
    handlingNotes: string;
  }): string => {
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

  const acceptMatch = (matchId: string) => {
    const targetMatch = matches.find((m) => m.id === matchId);
    if (!targetMatch) return;

    // 1. Update Match status to ACCEPTED
    const updatedMatches = matches.map((m) => {
      if (m.id === matchId) {
        return { ...m, status: 'ACCEPTED' as const };
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
      message: `${targetMatch.recipientName} accepted donation #${targetMatch.donationId}. Status transitioned to RESERVED. Coordinate pickup.`,
      timestamp: 'Just now',
      read: false,
      type: 'MATCH_ACCEPTED',
      link: `/donations/${targetMatch.donationId}`,
    };

    saveMatches(updatedMatches);
    saveDonations(updatedDonations);
    saveNotifications([notifRecipient, notifProvider, ...notifications]);
  };

  const rejectMatch = (matchId: string) => {
    const updatedMatches = matches.map((m) => {
      if (m.id === matchId) {
        return { ...m, status: 'REJECTED' as const };
      }
      return m;
    });

    saveMatches(updatedMatches);
  };

  const completePickup = (donationId: string) => {
    const targetDonation = donations.find((d) => d.id === donationId);
    if (!targetDonation) return;

    // Transition donation status to COMPLETED
    const updatedDonations = donations.map((d) => {
      if (d.id === donationId) {
        return { ...d, status: 'COMPLETED' as const };
      }
      return d;
    });

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
