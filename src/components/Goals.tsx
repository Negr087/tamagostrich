'use client';

import { useGoalsStore, ACHIEVEMENTS, levelProgress, MAX_LEVEL } from '@/store/goals';
import { useLang } from '@/lib/i18n';

export default function Goals() {
  const { xp, level, unlockedAchievements, streakDays } = useGoalsStore();
  const { t, lang } = useLang();
  const { current, needed, pct } = levelProgress(xp, level);
  const isMaxLevel = level >= MAX_LEVEL;
  const unlockCount = unlockedAchievements.length;

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
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #b4f953, #d946ef)',
              }}
            />
          </div>
          {!isMaxLevel && (
            <div className="flex justify-between text-[11px] text-lc-muted mt-1.5">
              <span>{current.toLocaleString()} / {needed.toLocaleString()} XP</span>
              <span>{Math.round(pct)}%</span>
            </div>
          )}
        </div>

        {/* Achievements header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-lc-white">{t.goalsAchievements}</h2>
          <span className="text-sm text-lc-muted">
            <span className="text-lc-green font-semibold">{unlockCount}</span>
            <span> / {ACHIEVEMENTS.length}</span>
          </span>
        </div>

        {/* Achievements grid */}
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
