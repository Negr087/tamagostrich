'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import NoriTamagotchi from '@/components/Nori';
import { useAuthStore } from '@/store/auth';
import { useNavStore, Section } from '@/store/nav';

// Lazy-load heavy sections — they only download when first visited
const Profile = dynamic(() => import('@/components/Profile'), { ssr: false });
const Badges  = dynamic(() => import('@/components/Badges'),  { ssr: false });

const VALID_SECTIONS: Section[] = ['nori', 'profile', 'badges'];

export default function Home() {
  const { isConnected } = useAuthStore();
  const { activeSection, setActiveSection } = useNavStore();

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

  return (
    <main className="min-h-screen bg-lc-black/80">
      <Navbar />
      {!isConnected ? (
        <NoriTamagotchi />
      ) : activeSection === 'nori' ? (
        <NoriTamagotchi />
      ) : activeSection === 'profile' ? (
        <Profile />
      ) : activeSection === 'badges' ? (
        <Badges />
      ) : null}
    </main>
  );
}
