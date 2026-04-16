import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NDKUser } from '@nostr-dev-kit/ndk';
import { NostrProfile, parseProfile, LoginMethod, resetUserRelays, clearNip46Session } from '@/lib/nostr';
import type { Nip46Session } from '@/lib/nostr';

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

      logout: () => {
        resetUserRelays();
        clearNip46Session();
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
        isConnected: state.isConnected,
        loginMethod: state.loginMethod,
        profile: state.profile,
        nip46Session: state.nip46Session,
      }),
    }
  )
);
