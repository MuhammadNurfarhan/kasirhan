import { create } from 'zustand';
import { isLicensed, activate, getDeviceId } from '../license';
import { isSetupCompleted, verifyUserPin, setupSecurity, resetPinWithRecoveryCode } from '../repositories/profileRepository';

interface AuthState {
  isLicensed: boolean;
  isSetup: boolean;
  isLocked: boolean;
  deviceId: string;
  isLoading: boolean;

  // Actions
  initializeAuth: () => Promise<void>;
  activateWithKey: (key: string) => Promise<boolean>;
  unlockApp: (pin: string) => Promise<boolean>;
  lockApp: () => void;
  completeSetup: (pin: string, recoveryCode: string) => Promise<void>;
  resetPin: (code: string, newPin: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isLicensed: false,
  isSetup: false,
  isLocked: true,
  deviceId: '',
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
        isLocked: setup ? true : false, // lock if already setup
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
      set({ isLicensed: true, isSetup: setup, isLocked: setup ? true : false });
    }
    return success;
  },

  unlockApp: async (pin: string) => {
    const valid = await verifyUserPin(pin);
    if (valid) {
      set({ isLocked: false });
      return true;
    }
    return false;
  },

  lockApp: () => {
    if (get().isSetup) {
      set({ isLocked: true });
    }
  },

  completeSetup: async (pin: string, recoveryCode: string) => {
    await setupSecurity(pin, recoveryCode);
    set({ isSetup: true, isLocked: false });
  },

  resetPin: async (code: string, newPin: string) => {
    const success = await resetPinWithRecoveryCode(code, newPin);
    if (success) {
      set({ isLocked: false });
    }
    return success;
  },
}));
