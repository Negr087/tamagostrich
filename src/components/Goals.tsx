'use client';

import { useState } from 'react';
import { useGoalsStore, ACHIEVEMENTS, levelProgress, MAX_LEVEL } from '@/store/goals';
import { useAuthStore } from '@/store/auth';
import { REWARD_MILESTONES } from '@/lib/rewardMilestones';
import { useLang } from '@/lib/i18n';
import { flushSync } from '@/store/nori';

type ClaimState = 'idle' | 'loading' | 'success' | 'error' | 'no_lud16';

export default function Goals() {
  const { xp, level, unlockedAchievements, streakDays, claimedRewards, markRewardClaimed } = useGoalsStore();
  const { user } = useAuthStore();
  const { t, lang } = useLang();
  const { current, needed, pct } = levelProgress(xp, level);
  const isMaxLevel = level >= MAX_LEVEL;
  const unlockCount = unlockedAchievements.length;

  const [claimStates, setClaimStates] = useState<Record<string, ClaimState>>({});
  const [errorMsgs, setErrorMsgs] = useState<Record<string, string>>({});

  async function handleClaim(milestoneId: string) {
    if (!user?.pubkey) return;
    setClaimStates(s => ({ ...s, [milestoneId]: 'loading' }));
    setErrorMsgs(s => ({ ...s, [milestoneId]: '' }));

    // Publish latest goals state to Nostr first so the server can verify it.
    // Then wait 1.5 s for the event to propagate to relay indexes.
    await flushSync();
    await new Promise(r => setTimeout(r, 1500));

    try {
      const res = await fetch('/api/claim-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pubkey: user.pubkey, milestone: milestoneId }),
      });
      const data = await res.json();

      if (!res.ok) {
        const isNoLud16 = res.status === 400 && data.error?.includes('lightning address');
        setClaimStates(s => ({ ...s, [milestoneId]: isNoLud16 ? 'no_lud16' : 'error' }));
        setErrorMsgs(s => ({ ...s, [milestoneId]: data.error ?? t.goalsRewardError }));
        return;
      }

      markRewardClaimed(milestoneId);
      flushSync(); // persist claimed state to Nostr immediately
      setClaimStates(s => ({ ...s, [milestoneId]: 'success' }));
    } catch {
      setClaimStates(s => ({ ...s, [milestoneId]: 'error' }));
      setErrorMsgs(s => ({ ...s, [milestoneId]: t.goalsRewardError }));
    }
  }

  return (
    <div className="min-h-screen pt-24">
      <div className="max-w-2xl mx-auto px-6">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-lc-white tracking-tight">{t.goalsTitle}</h1>
          <p className="text-lc-muted mt-1">{t.goalsSubtitle}</p>
        </div>

        {/* Level card */}
        <div className="lc-card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-lc-olive/30 border border-lc-green/30">
                <span className="text-[10px] font-bold text-lc-muted uppercase tracking-wider">{t.goalsLevel}</span>
                <span className="text-3xl font-black text-lc-green leading-none">{level}</span>
              </div>
              <div>
                <div className="text-lc-white font-semibold text-lg">
                  {isMaxLevel ? t.goalsMaxLevel : t.goalsNextLevel(level + 1)}
                </div>
                <div className="text-lc-muted text-xs mt-0.5">
                  {t.goalsXPTotal}: {xp.toLocaleString()}
                  {streakDays > 0 && (
                    <span className="ml-3">🔥 {t.goalsStreak(streakDays)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* XP bar */}
          <div className="h-2.5 bg-lc-border/40 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #b4f953, #d946ef)' }}
            />
          </div>
          {!isMaxLevel && (
            <div className="flex justify-between text-[11px] text-lc-muted mt-1.5">
              <span>{current.toLocaleString()} / {needed.toLocaleString()} XP</span>
              <span>{Math.round(pct)}%</span>
            </div>
          )}
        </div>

        {/* ── Sats rewards ─────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-lc-white">{t.goalsRewardsTitle}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(180,249,83,0.12)', color: '#b4f953', border: '1px solid rgba(180,249,83,0.25)' }}>
              ⚡ NWC
            </span>
          </div>
          <p className="text-xs text-lc-muted mb-4">{t.goalsRewardsSubtitle}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REWARD_MILESTONES.map((m) => {
              const reached   = m.requiredLevel  !== undefined ? level      >= m.requiredLevel
                              : m.requiredStreak !== undefined ? streakDays >= m.requiredStreak
                              : false;
              const claimed   = claimedRewards.includes(m.id);
              const state     = claimStates[m.id] ?? 'idle';
              const isLoading = state === 'loading';
              const isSuccess = state === 'success' || claimed;
              const isError   = state === 'error' || state === 'no_lud16';
              const errMsg    = errorMsgs[m.id];

              const label = lang === 'es' ? m.labelEs : m.labelEn;
              const isMax = m.requiredLevel === MAX_LEVEL;

              // Progress hint shown when not yet reached
              const progressHint = m.requiredLevel !== undefined
                ? (lang === 'es' ? `Nivel ${level}/${m.requiredLevel}` : `Level ${level}/${m.requiredLevel}`)
                : (lang === 'es' ? `${streakDays}/${m.requiredStreak} días` : `${streakDays}/${m.requiredStreak} days`);

              return (
                <div
                  key={m.id}
                  className="lc-card p-5 flex flex-col gap-3"
                  style={{
                    borderColor: isSuccess ? 'rgba(180,249,83,0.4)' : reached ? 'rgba(180,249,83,0.2)' : undefined,
                    opacity: reached ? 1 : 0.55,
                  }}
                >
                  {/* Top row */}
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{m.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-lc-white text-sm">
                        {label}
                        {isMax && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>MAX</span>
                        )}
                      </div>
                      <div className="text-lc-muted text-xs mt-0.5">
                        {m.sats} sats
                      </div>
                    </div>

                    {/* Status badge */}
                    {isSuccess && (
                      <span className="text-[11px] font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(180,249,83,0.12)', color: '#b4f953' }}>
                        {t.goalsRewardClaimed(m.sats)}
                      </span>
                    )}
                    {!reached && !isSuccess && (
                      <span className="text-[10px] text-lc-muted font-semibold">
                        {progressHint}
                      </span>
                    )}
                  </div>

                  {/* Claim button */}
                  {reached && !isSuccess && (
                    <button
                      onClick={() => handleClaim(m.id)}
                      disabled={isLoading}
                      className="lc-pill-primary w-full py-2.5 text-sm font-bold tracking-wide disabled:opacity-50"
                      style={isLoading ? {} : { background: 'linear-gradient(90deg, #b4f953, #84cc16)' }}
                    >
                      {isLoading ? t.goalsRewardClaiming : t.goalsRewardClaim(m.sats)}
                    </button>
                  )}

                  {/* Error message */}
                  {isError && errMsg && (
                    <p className="text-[11px] leading-relaxed" style={{ color: state === 'no_lud16' ? '#f97316' : '#ef4444' }}>
                      {state === 'no_lud16' ? t.goalsRewardNoLud16 : errMsg}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Achievements ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-lc-white">{t.goalsAchievements}</h2>
          <span className="text-sm text-lc-muted">
            <span className="text-lc-green font-semibold">{unlockCount}</span>
            <span> / {ACHIEVEMENTS.length}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pb-12">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = unlockedAchievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                className="lc-card p-4 flex flex-col items-center text-center transition-all duration-300"
                style={{ opacity: unlocked ? 1 : 0.35 }}
              >
                <span className="text-3xl mb-2">{ach.emoji}</span>
                <div className="font-semibold text-lc-white text-sm">
                  {lang === 'es' ? ach.nameEs : ach.nameEn}
                </div>
                <div className="text-xs text-lc-muted mt-1 line-clamp-2">
                  {lang === 'es' ? ach.descEs : ach.descEn}
                </div>
                {unlocked && (
                  <div className="text-[10px] text-lc-green font-semibold mt-2">
                    {t.goalsUnlocked}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
