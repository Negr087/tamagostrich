import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NDKUser } from '@nostr-dev-kit/ndk';
import { NostrProfile, parseProfile, LoginMethod, resetUserRelays } from '@/lib/nostr';

interface AuthState {
  isConnected: boolean;
  isLoading: boolean;
  user: NDKUser | null;
  profile: NostrProfile | null;
  loginMethod: LoginMethod | null;
  error: string | null;
  
  // Actions
  setUser: (user: NDKUser | null, method: LoginMethod | null) => void;
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
      error: null,
      
      setUser: (user, method) => {
        if (user) {
          set({
            isConnected: true,
            user,
            profile: parseProfile(user),
            loginMethod: method,
            error: null,
          });
        } else {
          set({
            isConnected: false,
            user: null,
            profile: null,
            loginMethod: null,
          });
        }
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error, isLoading: false }),
      
      logout: () => {
        resetUserRelays();
        set({
          isConnected: false,
          user: null,
          profile: null,
          loginMethod: null,
          error: null,
        });
      },
    }),
    {
      name: 'nostr-auth',
      partialize: (state) => ({
        loginMethod: state.loginMethod,
        profile: state.profile,
      }),
    }
  )
);
