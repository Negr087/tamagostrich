'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import NoriTamagotchi from '@/components/Nori';
import EggHatch from '@/components/EggHatch';
import LandingPage from '@/components/LandingPage';
import { useAuthStore } from '@/store/auth';
import { useNavStore, Section } from '@/store/nav';
import { useAppearanceStore } from '@/store/appearance';
import { useNoriStore } from '@/store/nori';
import { fetchGLTF, GLB_PATHS } from '@/lib/petModels';
import { useLang } from '@/lib/i18n';

// Lazy-load heavy sections — they only download when first visited
const Profile     = dynamic(() => import('@/components/Profile'),     { ssr: false });
const Badges      = dynamic(() => import('@/components/Badges'),      { ssr: false });
const Goals       = dynamic(() => import('@/components/Goals'),       { ssr: false });
const Leaderboard = dynamic(() => import('@/components/Leaderboard'), { ssr: false });

const VALID_SECTIONS: Section[] = ['nori', 'profile', 'badges', 'goals', 'ranking'];

export default function Home() {
  const { isConnected, profile, loginMethod, setUser } = useAuthStore();
  const { activeSection, setActiveSection } = useNavStore();
  const { hasChosen } = useAppearanceStore();
  const { loadFromNostr } = useNoriStore();
  const { t } = useLang();
  const [amberToast, setAmberToast] = useState<string | null>(null);

  // Sync pet state from Nostr on login — runs here so it always fires
  // regardless of which section is active (fixes sync when URL is #goals etc.)
  const pubkey = profile?.pubkey;
  useEffect(() => {
    if (isConnected && pubkey) loadFromNostr(pubkey);
  }, [isConnected, pubkey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for Amber callback results written by /amber-result page via localStorage.
  // The /amber-result page (a dedicated route) processes the callback and publishes,
  // then stores the outcome here. This works whether Chrome opened it in the same tab
  // (same-tab: localStorage.getItem on mount) or a new tab (storage event).
  useEffect(() => {
    const RESULT_KEY = 'amber_publish_result';

    function applyResult(raw: string | null) {
      if (!raw) return;
      try {
        const result = JSON.parse(raw);
        if (Date.now() - result.ts > 15000) return; // ignore stale
        if (result.type === 'login') {
          if (result.ok) {
            setAmberToast(t.amberLoginSuccess);
            setTimeout(() => setAmberToast(null), 3000);
          }
        } else if (result.type === 'sign') {
          if (result.ok) {
            setAmberToast(t.shareSuccess);
            setTimeout(() => setAmberToast(null), 4000);
          } else {
            setAmberToast(`Error: ${result.err ?? 'publish failed'}`);
            setTimeout(() => setAmberToast(null), 6000);
          }
        }
        localStorage.removeItem(RESULT_KEY);
      } catch { /* ignore */ }
    }

    // Pick up a result already written (same-tab: /amber-result navigated back to /)
    applyResult(localStorage.getItem(RESULT_KEY));

    // Pick up a result written by a different tab (Chrome opened /amber-result in a new tab)
    const onStorage = (e: StorageEvent) => {
      if (e.key === RESULT_KEY) applyResult(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start downloading the user's current animal GLB as soon as they're connected,
  // so it's ready (or nearly) when they navigate to the nori tab.
  const { animalType } = useAppearanceStore();
  useEffect(() => {
    if (!isConnected) return;
    const path = GLB_PATHS[animalType];
    if (path) fetchGLTF(path);
  }, [isConnected, animalType]);

  // Restore section from URL hash on mount and listen for back/forward
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1) as Section;
      if (VALID_SECTIONS.includes(hash)) setActiveSection(hash);
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show egg hatch screen on first visit (after login)
  if (isConnected && !hasChosen) {
    return <EggHatch />;
  }

  return (
    <main className="min-h-screen bg-lc-black/80">
      <Navbar />
      {/* Amber intent result toast */}
      {amberToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl"
          style={{ background: 'linear-gradient(90deg,#b4f953,#84cc16)', color: '#0a0a0a' }}>
          {amberToast}
        </div>
      )}
      {!isConnected ? (
        <LandingPage />
      ) : activeSection === 'nori' ? (
        <NoriTamagotchi />
      ) : activeSection === 'profile' ? (
        <Profile />
      ) : activeSection === 'badges' ? (
        <Badges />
      ) : activeSection === 'goals' ? (
        <Goals />
      ) : activeSection === 'ranking' ? (
        <Leaderboard />
      ) : null}
    </main>
  );
}
