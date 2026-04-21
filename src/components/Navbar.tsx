'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useNavStore } from '@/store/nav';
import { useLang } from '@/lib/i18n';
import LoginModal from './LoginModal';

export default function Navbar() {
  const [showLogin, setShowLogin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { isConnected, profile, logout } = useAuthStore();
  const { activeSection, setActiveSection } = useNavStore();
  const { t, lang, setLang } = useLang();

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-lc-black/90 backdrop-blur-xl border-b border-lc-border/50">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="/logo.png" alt="Tamagostrich" className="w-10 h-10 sm:w-16 sm:h-16 object-contain" />
            <span
              className="hidden sm:inline font-bold text-lg tracking-tight"
              style={{
                background: 'linear-gradient(90deg, #d946ef, #a855f7, #b4f953)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'gradientShift 5s linear infinite',
              }}
            >
              Tamagostrich
            </span>
          </div>

          {/* Nav links — shown when logged in */}
          {isConnected && profile && (
            <div className="flex items-center gap-0.5 sm:gap-1">
              {([
                { id: 'nori' as const, label: t.navPet, icon: (
                  <img src="/huella.png" alt={t.navPet} width={20} height={20} style={{ filter: 'invert(85%) sepia(60%) saturate(500%) hue-rotate(40deg) brightness(1.1)', objectFit: 'contain' }} />
                )},
                { id: 'profile' as const, label: t.navProfile, icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b4f953" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                )},
                { id: 'badges' as const, label: t.navBadges, icon: (
                  <img src="/estrella.png" alt={t.navBadges} width={20} height={20} style={{ filter: 'invert(85%) sepia(60%) saturate(500%) hue-rotate(40deg) brightness(1.1)', objectFit: 'contain' }} />
                )},
                { id: 'goals' as const, label: t.navGoals, icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b4f953" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="6"/>
                    <circle cx="12" cy="12" r="2"/>
                  </svg>
                )},
              ]).map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => { setActiveSection(id); window.location.hash = id; }}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeSection === id
                      ? 'bg-lc-border/60'
                      : 'hover:bg-lc-border/30'
                  }`}
                >
                  {icon}
                  <span className="hidden sm:inline" style={{
                    background: 'linear-gradient(90deg, #d946ef, #a855f7, #b4f953)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'gradientShift 5s linear infinite',
                  }}>{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
              className="text-xs font-bold px-2.5 py-1 rounded-lg border border-lc-border/50 text-lc-muted hover:text-lc-white hover:border-lc-border transition-all"
              title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
            >
              {t.langToggle}
            </button>

            {isConnected && profile ? (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 sm:gap-2.5 py-1.5 pl-1.5 sm:pr-4 pr-2 bg-lc-dark hover:bg-lc-border rounded-full transition-all duration-200 border border-lc-border/50"
                >
                  {profile.picture ? (
                    <img
                      src={profile.picture}
                      alt={profile.name || 'Profile'}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-lc-border"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-lc-olive flex items-center justify-center text-lc-green text-sm font-semibold">
                      {(profile.name || profile.displayName || 'N')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:inline text-sm text-lc-white font-medium max-w-[120px] truncate">
                    {profile.displayName || profile.name || 'Anon'}
                  </span>
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-lc-dark border border-lc-border rounded-xl shadow-2xl overflow-hidden z-50">
                      <div className="p-4 border-b border-lc-border">
                        <div className="text-sm text-lc-white font-semibold truncate">
                          {profile.displayName || profile.name}
                        </div>
                        <div className="text-xs text-lc-muted truncate mt-0.5 font-mono">
                          {profile.npub.slice(0, 20)}...
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          setShowMenu(false);
                        }}
                        className="w-full p-3 text-left text-sm text-red-400 hover:bg-lc-border/50 transition flex items-center gap-2"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                          <polyline points="16 17 21 12 16 7"/>
                          <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        {t.disconnect}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="lc-pill text-sm flex items-center gap-2 font-semibold text-lc-black"
                style={{
                  background: 'linear-gradient(90deg, #d946ef, #a855f7, #b4f953)',
                  backgroundSize: '200% auto',
                  animation: 'gradientShift 5s linear infinite',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                {t.connect}
              </button>
            )}
          </div>
        </div>
      </nav>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
}
