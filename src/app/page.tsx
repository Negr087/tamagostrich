'use client';

import { useEffect } from 'react';
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

// Lazy-load heavy sections — they only download when first visited
const Profile = dynamic(() => import('@/components/Profile'), { ssr: false });
const Badges  = dynamic(() => import('@/components/Badges'),  { ssr: false });
const Goals   = dynamic(() => import('@/components/Goals'),   { ssr: false });

const VALID_SECTIONS: Section[] = ['nori', 'profile', 'badges', 'goals'];

export default function Home() {
  const { isConnected, profile } = useAuthStore();
  const { activeSection, setActiveSection } = useNavStore();
  const { hasChosen } = useAppearanceStore();
  const { loadFromNostr } = useNoriStore();

  // Sync pet state from Nostr on login — runs here so it always fires
  // regardless of which section is active (fixes sync when URL is #goals etc.)
  const pubkey = profile?.pubkey;
  useEffect(() => {
    if (isConnected && pubkey) loadFromNostr(pubkey);
  }, [isConnected, pubkey]); // eslint-disable-line react-hooks/exhaustive-deps

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
      ) : null}
    </main>
  );
}
