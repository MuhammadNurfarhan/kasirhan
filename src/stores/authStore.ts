import { create } from "zustand";
import { isLicensed, activate, getDeviceId } from "../license";
import {
  isSetupCompleted,
  verifyUserPin,
  setupSecurity,
  resetPinWithRecoveryCode,
} from "../repositories/profileRepository";

interface AuthState {
  isLicensed: boolean;
  isSetup: boolean;
  isLocked: boolean;
  deviceId: string;
  isLoading: boolean;

  // Actions
  initializeAuth: () => Promise<void>;
  activateWithKey: (key: string) => Promise<boolean>;
  unlockApp: (pin?: string) => Promise<boolean>;
  lockApp: () => void;
  completeSetup: (pin?: string, recoveryCode?: string) => Promise<void>;
  resetPin: (code: string, newPin: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isLicensed: false,
  isSetup: false,
  isLocked: false,
  deviceId: "",
  isLoading: true,

  initializeAuth: async () => {
    try {
      const deviceId = await getDeviceId();
      const licensed = await isLicensed();
      const setup = await isSetupCompleted();

      set({
        deviceId,
        isLicensed: licensed,
        isSetup: setup,
        isLocked: false,
        isLoading: false,
      });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  activateWithKey: async (key: string) => {
    const success = await activate(key);
    if (success) {
      const setup = await isSetupCompleted();
      set({ isLicensed: true, isSetup: setup, isLocked: false });
    }
    return success;
  },

  unlockApp: async (_pin?: string) => {
    set({ isLocked: false });
    return true;
  },

  lockApp: () => {
    // PIN removed, app does not lock
    set({ isLocked: false });
  },

  completeSetup: async (pin?: string, recoveryCode?: string) => {
    await setupSecurity(pin, recoveryCode);
    set({ isSetup: true, isLocked: false });
  },

  resetPin: async (_code: string, _newPin: string) => {
    return true;
  },
}));
