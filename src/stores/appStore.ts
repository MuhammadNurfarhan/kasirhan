import { create } from 'zustand';
import { BusinessProfile } from '../types';
import { getBusinessProfile, saveBusinessProfile } from '../repositories/profileRepository';
import { DEFAULT_BUSINESS_PROFILE } from '../utils/defaults';

import * as ScreenOrientation from 'expo-screen-orientation';

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
  isSellMode: boolean;

  // Actions
  setScreen: (screen: AppScreen) => void;
  loadProfile: () => Promise<void>;
  updateProfile: (profile: BusinessProfile) => Promise<void>;
  enterSellMode: () => Promise<void>;
  exitSellMode: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentScreen: 'cashier',
  profile: DEFAULT_BUSINESS_PROFILE,
  isLoadingProfile: true,
  isSellMode: false,

  setScreen: (screen: AppScreen) => set({ currentScreen: screen }),

  enterSellMode: async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } catch {}
    set({ isSellMode: true, currentScreen: 'cashier' });
  },

  exitSellMode: async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch {}
    set({ isSellMode: false });
  },

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
