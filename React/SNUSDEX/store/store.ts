import { create } from 'zustand';
import type { SnusProduct, UserCollection, UsageLog, Badge, Profile } from '@/lib/supabase';
import { RATING_STEPS, type RatingStep } from '@/lib/constants';

export type CollectionEntry = {
  date: string;
  ratings: {
    taste: number;
    taste_text: string;
    smell: number;
    smell_text: string;
    bite: number;
    bite_text: string;
    drip: number;
    drip_text: string;
    visuals: number;
    visuals_text: string;
    strength: number;
    strength_text: string;
  };
};

export type TempRatings = {
  taste: number;
  taste_text: string;
  smell: number;
  smell_text: string;
  bite: number;
  bite_text: string;
  drip: number;
  drip_text: string;
  visuals: number;
  visuals_text: string;
  strength: number;
  strength_text: string;
};

const defaultTempRatings: TempRatings = {
  taste: 5, taste_text: '',
  smell: 5, smell_text: '',
  bite: 5, bite_text: '',
  drip: 5, drip_text: '',
  visuals: 5, visuals_text: '',
  strength: 5, strength_text: '',
};

type AppStore = {
  // Auth
  userId: string | null;
  userEmail: string | null;
  username: string;
  featuredBadgeId: number | null;
  setAuth: (userId: string | null, email: string | null, username: string) => void;
  setFeaturedBadgeId: (id: number | null) => void;

  // Snus data
  globalSnusData: SnusProduct[];
  globalUserCollection: Record<number, CollectionEntry>;
  setSnusData: (data: SnusProduct[]) => void;
  setUserCollection: (col: Record<number, CollectionEntry>) => void;
  addToCollection: (snusId: number, entry: CollectionEntry) => void;
  updateCollectionEntry: (snusId: number, entry: CollectionEntry) => void;

  // Usage logs
  globalAllLogs: UsageLog[];
  globalActiveLogs: UsageLog[];
  globalInactiveLogs: UsageLog[];
  setUsageLogs: (all: UsageLog[], active: UsageLog[], inactive: UsageLog[]) => void;

  // Badges
  globalBadges: Badge[];
  globalUserBadges: Set<number>;
  globalBadgeProgress: number;
  setBadges: (badges: Badge[], userBadges: Set<number>, progress: number) => void;
  addUserBadge: (badgeId: number) => void;

  // Dex UI state
  dexSortMode: 'id' | 'alpha';
  dexFilterUnlocked: boolean;
  setDexSortMode: (mode: 'id' | 'alpha') => void;
  setDexFilterUnlocked: (val: boolean) => void;

  // Modal state
  snusDetailVisible: boolean;
  snusDetailId: number | null;
  snusDetailFromScan: boolean;
  scanModalVisible: boolean;
  badgeUnlockBadge: Badge | null;
  badgeUnlockXp: number;
  badgeUnlockVisible: boolean;
  badgesGridVisible: boolean;
  connectionsVisible: boolean;
  allScansVisible: boolean;
  settingsSubpageVisible: boolean;
  settingsSubpageTitle: string;

  openSnusDetail: (id: number, fromScan?: boolean) => void;
  closeSnusDetail: () => void;
  openScanModal: () => void;
  closeScanModal: () => void;
  showBadgeUnlock: (badge: Badge, xp: number) => void;
  closeBadgeUnlock: () => void;
  openBadgesGrid: () => void;
  closeBadgesGrid: () => void;
  openConnections: () => void;
  closeConnections: () => void;
  openAllScans: () => void;
  closeAllScans: () => void;
  openSettingsSubpage: (title: string) => void;
  closeSettingsSubpage: () => void;

  // Rating wizard
  currentSelectedSnusId: number | null;
  tempRatings: TempRatings;
  ratingStepIndex: number;
  ratingMode: 'info' | 'rating' | 'saved';
  setCurrentSnusId: (id: number | null) => void;
  setTempRatings: (r: TempRatings) => void;
  setRatingStep: (step: number) => void;
  setRatingMode: (mode: 'info' | 'rating' | 'saved') => void;
  setRatingValue: (cat: RatingStep, val: number) => void;
  setRatingText: (cat: RatingStep, text: string) => void;
  resetTempRatings: () => void;

  // Stats
  xpValue: number;
  levelValue: number;
  statCount: number;
  statFlow: number;
  statAvgPouches: number;
  statAvgMg: number;
  setStats: (xp: number, level: number, count: number, flow: number, avgPouches: number, avgMg: number) => void;
};

export const useStore = create<AppStore>((set, get) => ({
  // Auth
  userId: null,
  userEmail: null,
  username: '',
  featuredBadgeId: null,
  setAuth: (userId, email, username) => set({ userId, userEmail: email, username }),
  setFeaturedBadgeId: (id) => set({ featuredBadgeId: id }),

  // Snus data
  globalSnusData: [],
  globalUserCollection: {},
  setSnusData: (data) => set({ globalSnusData: data }),
  setUserCollection: (col) => set({ globalUserCollection: col }),
  addToCollection: (snusId, entry) => set(s => ({
    globalUserCollection: { ...s.globalUserCollection, [snusId]: entry }
  })),
  updateCollectionEntry: (snusId, entry) => set(s => ({
    globalUserCollection: { ...s.globalUserCollection, [snusId]: entry }
  })),

  // Usage logs
  globalAllLogs: [],
  globalActiveLogs: [],
  globalInactiveLogs: [],
  setUsageLogs: (all, active, inactive) => set({ globalAllLogs: all, globalActiveLogs: active, globalInactiveLogs: inactive }),

  // Badges
  globalBadges: [],
  globalUserBadges: new Set(),
  globalBadgeProgress: 0,
  setBadges: (badges, userBadges, progress) => set({ globalBadges: badges, globalUserBadges: userBadges, globalBadgeProgress: progress }),
  addUserBadge: (badgeId) => set(s => ({ globalUserBadges: new Set([...s.globalUserBadges, badgeId]) })),

  // Dex UI
  dexSortMode: 'id',
  dexFilterUnlocked: false,
  setDexSortMode: (mode) => set({ dexSortMode: mode }),
  setDexFilterUnlocked: (val) => set({ dexFilterUnlocked: val }),

  // Modals
  snusDetailVisible: false,
  snusDetailId: null,
  snusDetailFromScan: false,
  scanModalVisible: false,
  badgeUnlockBadge: null,
  badgeUnlockXp: 0,
  badgeUnlockVisible: false,
  badgesGridVisible: false,
  connectionsVisible: false,
  allScansVisible: false,
  settingsSubpageVisible: false,
  settingsSubpageTitle: '',

  openSnusDetail: (id, fromScan = false) => set({ snusDetailVisible: true, snusDetailId: id, snusDetailFromScan: fromScan, currentSelectedSnusId: id }),
  closeSnusDetail: () => set({ snusDetailVisible: false }),
  openScanModal: () => set({ scanModalVisible: true }),
  closeScanModal: () => set({ scanModalVisible: false }),
  showBadgeUnlock: (badge, xp) => set({ badgeUnlockBadge: badge, badgeUnlockXp: xp, badgeUnlockVisible: true }),
  closeBadgeUnlock: () => set({ badgeUnlockVisible: false }),
  openBadgesGrid: () => set({ badgesGridVisible: true }),
  closeBadgesGrid: () => set({ badgesGridVisible: false }),
  openConnections: () => set({ connectionsVisible: true }),
  closeConnections: () => set({ connectionsVisible: false }),
  openAllScans: () => set({ allScansVisible: true }),
  closeAllScans: () => set({ allScansVisible: false }),
  openSettingsSubpage: (title) => set({ settingsSubpageVisible: true, settingsSubpageTitle: title }),
  closeSettingsSubpage: () => set({ settingsSubpageVisible: false }),

  // Rating wizard
  currentSelectedSnusId: null,
  tempRatings: { ...defaultTempRatings },
  ratingStepIndex: 0,
  ratingMode: 'info',
  setCurrentSnusId: (id) => set({ currentSelectedSnusId: id }),
  setTempRatings: (r) => set({ tempRatings: r }),
  setRatingStep: (step) => set({ ratingStepIndex: step }),
  setRatingMode: (mode) => set({ ratingMode: mode }),
  setRatingValue: (cat, val) => set(s => ({ tempRatings: { ...s.tempRatings, [cat]: val } })),
  setRatingText: (cat, text) => set(s => ({ tempRatings: { ...s.tempRatings, [`${cat}_text`]: text } })),
  resetTempRatings: () => set({ tempRatings: { ...defaultTempRatings }, ratingStepIndex: 0, ratingMode: 'info' }),

  // Stats
  xpValue: 0,
  levelValue: 1,
  statCount: 0,
  statFlow: 0,
  statAvgPouches: 0,
  statAvgMg: 0,
  setStats: (xp, level, count, flow, avgPouches, avgMg) => set({ xpValue: xp, levelValue: level, statCount: count, statFlow: flow, statAvgPouches: avgPouches, statAvgMg: avgMg }),
}));
