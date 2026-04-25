import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NDKUser } from '@nostr-dev-kit/ndk';
import { NostrProfile, parseProfile, LoginMethod, resetUserRelays, clearNip46Session, clearNsecSession } from '@/lib/nostr';
import type { Nip46Session } from '@/lib/nostr';
import { useProfileCache } from './profileCache';
import { useBadgesCache } from './badgesCache';
import { useGoalsStore } from './goals';
import { flushSync } from './nori';

interface AuthState {
  isConnected: boolean;
  isLoading: boolean;
  user: NDKUser | null;
  profile: NostrProfile | null;
  loginMethod: LoginMethod | null;
  nip46Session: Nip46Session | null;
  error: string | null;

  // Actions
  setUser: (user: NDKUser | null, method: LoginMethod | null, nip46Session?: Nip46Session) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  restoreSession: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isConnected: false,
      isLoading: false,
      user: null,
      profile: null,
      loginMethod: null,
      nip46Session: null,
      error: null,

      setUser: (user, method, nip46Session = undefined) => {
        if (user) {
          set({
            isConnected: true,
            user,
            profile: parseProfile(user),
            loginMethod: method,
            nip46Session: nip46Session ?? null,
            error: null,
          });
        } else {
          set({
            isConnected: false,
            user: null,
            profile: null,
            loginMethod: null,
            nip46Session: null,
          });
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error, isLoading: false }),

      // Restore session from persisted profile (used on page load)
      restoreSession: () => set((state) => {
        if (state.profile) {
          return { isConnected: true };
        }
        return {};
      }),

      logout: () => {
        // Flush any unsent progress to Nostr before clearing session
        flushSync();
        resetUserRelays();
        clearNip46Session();
        clearNsecSession();
        useProfileCache.getState().reset();
        useBadgesCache.getState().reset();
        // Goals (XP, level, achievements) are NOT reset on logout — they persist
        // in localStorage and get merged on next login via loadFromSync's Math.max.
        // Resetting here caused level loss when re-logging in from a device that
        // hadn't synced its highest state to Nostr yet.
        set({
          isConnected: false,
          user: null,
          profile: null,
          loginMethod: null,
          nip46Session: null,
          error: null,
        });
      },
    }),
    {
      name: 'nostr-auth',
      partialize: (state) => ({
        loginMethod: state.loginMethod,
        profile: state.profile,
        nip46Session: state.nip46Session,
      }),
    }
  )
);
