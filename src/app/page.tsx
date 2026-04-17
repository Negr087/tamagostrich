'use client';

import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import NoriTamagotchi from '@/components/Nori';
import { useAuthStore } from '@/store/auth';
import { useNavStore } from '@/store/nav';

// Lazy-load heavy sections — they only download when first visited
const Profile = dynamic(() => import('@/components/Profile'), { ssr: false });
const Badges  = dynamic(() => import('@/components/Badges'),  { ssr: false });

export default function Home() {
  const { isConnected } = useAuthStore();
  const { activeSection } = useNavStore();

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
