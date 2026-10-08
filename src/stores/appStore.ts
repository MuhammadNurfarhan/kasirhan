import { create } from 'zustand';
import { BusinessProfile } from '../types';
import { getBusinessProfile, saveBusinessProfile } from '../repositories/profileRepository';
import { DEFAULT_BUSINESS_PROFILE } from '../utils/defaults';

export type AppScreen =
  | 'cashier'
  | 'products'
  | 'history'
  | 'reports'
  | 'customers'
  | 'settings'
  | 'faq';

interface AppState {
  currentScreen: AppScreen;
  profile: BusinessProfile;
  isLoadingProfile: boolean;

  // Actions
  setScreen: (screen: AppScreen) => void;
  loadProfile: () => Promise<void>;
  updateProfile: (profile: BusinessProfile) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentScreen: 'cashier',
  profile: DEFAULT_BUSINESS_PROFILE,
  isLoadingProfile: true,

  setScreen: (screen: AppScreen) => set({ currentScreen: screen }),

  loadProfile: async () => {
    try {
      const p = await getBusinessProfile();
      if (p) {
        set({ profile: p, isLoadingProfile: false });
      } else {
        set({ profile: DEFAULT_BUSINESS_PROFILE, isLoadingProfile: false });
      }
    } catch {
      set({ isLoadingProfile: false });
    }
  },

  updateProfile: async (profile: BusinessProfile) => {
    await saveBusinessProfile(profile);
    set({ profile });
  },
}));
