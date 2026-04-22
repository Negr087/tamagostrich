'use client';

import { useState } from 'react';
import { ANIMAL_META, AnimalType } from '@/lib/petModels';
import { PALETTE, useAppearanceStore } from '@/store/appearance';
import { useLang } from '@/lib/i18n';

const ANIMALS = Object.entries(ANIMAL_META) as [AnimalType, typeof ANIMAL_META[AnimalType]][];

interface PetSelectorProps {
  onClose?: () => void; // undefined = first-time screen (no close button)
}

export default function PetSelector({ onClose }: PetSelectorProps) {
  const { bodyColor, animalType, setBodyColor, setAnimalType, setHasChosen } = useAppearanceStore();
  const { lang } = useLang();

  const [selectedAnimal, setSelectedAnimal] = useState<AnimalType>(animalType);
  const [selectedColor,  setSelectedColor]  = useState<string>(bodyColor);

  const isFirstTime = !onClose;

  function handleConfirm() {
    setAnimalType(selectedAnimal);
    setBodyColor(selectedColor);
    if (isFirstTime) setHasChosen(true);
    onClose?.();
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        background: isFirstTime
          ? 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a0a 100%)'
          : 'rgba(0,0,0,0.82)',
        zIndex: 200,
        backdropFilter: isFirstTime ? 'none' : 'blur(4px)',
      }}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl border border-lc-border/50 p-6"
        style={{ background: '#111118', boxShadow: '0 0 60px rgba(180,249,83,0.08)' }}
      >
        {/* Close button (in-app only) */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-lc-muted hover:text-lc-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            ✕
          </button>
        )}

        {/* Title */}
        <div className="text-center mb-6">
          <h2
            className="text-2xl font-extrabold mb-1"
            style={{
              background: 'linear-gradient(90deg, #d946ef, #a855f7, #b4f953)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {isFirstTime
              ? (lang === 'es' ? '¡Elegí tu mascota!' : 'Choose your pet!')
              : (lang === 'es' ? 'Cambiar mascota' : 'Change pet')}
          </h2>
          {isFirstTime && (
            <p className="text-sm text-lc-muted">
              {lang === 'es' ? 'Tu compañero digital en Nostr' : 'Your digital Nostr companion'}
            </p>
          )}
        </div>

        {/* Animal grid */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {ANIMALS.map(([type, meta]) => {
            const isSelected = selectedAnimal === type;
            return (
              <button
                key={type}
                onClick={() => {
                  setSelectedAnimal(type);
                  // Suggest animal's default color if user hasn't customized yet
                  if (selectedColor === bodyColor && bodyColor === '#9370DB' && isFirstTime) {
                    setSelectedColor(meta.defaultColor);
                  }
                }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-150 active:scale-95"
                style={{
                  borderColor: isSelected ? '#b4f953' : 'rgba(255,255,255,0.08)',
                  background: isSelected ? 'rgba(180,249,83,0.08)' : 'rgba(255,255,255,0.03)',
                  boxShadow: isSelected ? '0 0 12px rgba(180,249,83,0.2)' : 'none',
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                <span className="text-3xl leading-none">{meta.emoji}</span>
                <span
                  className="text-[11px] font-semibold leading-tight text-center"
                  style={{ color: isSelected ? '#b4f953' : '#a3a3a3' }}
                >
                  {lang === 'es' ? meta.nameEs : meta.nameEn}
                </span>
              </button>
            );
          })}
        </div>

        {/* Color palette */}
        <div className="mb-6">
          <p className="text-[10px] font-bold text-lc-muted/60 uppercase tracking-[0.15em] mb-2.5">
            {lang === 'es' ? 'Color' : 'Color'}
          </p>
          <div className="flex gap-2 flex-wrap">
            {PALETTE.map(({ hex, nameEs, nameEn }) => (
              <button
                key={hex}
                onClick={() => setSelectedColor(hex)}
                className="rounded-full transition-all duration-150 hover:scale-110"
                style={{
                  width: selectedColor === hex ? 28 : 24,
                  height: selectedColor === hex ? 28 : 24,
                  background: hex,
                  boxShadow: selectedColor === hex
                    ? `0 0 0 2px #111118, 0 0 0 4px ${hex}`
                    : 'none',
                }}
                title={lang === 'es' ? nameEs : nameEn}
              />
            ))}
          </div>
        </div>

        {/* Preview chip */}
        <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <span className="text-2xl">{ANIMAL_META[selectedAnimal].emoji}</span>
          <span className="text-sm font-medium text-lc-white">
            {lang === 'es' ? ANIMAL_META[selectedAnimal].nameEs : ANIMAL_META[selectedAnimal].nameEn}
          </span>
          <div className="w-4 h-4 rounded-full ml-1 border border-white/20" style={{ background: selectedColor }} />
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          className="lc-pill-primary w-full py-3 text-sm font-bold tracking-wide transition-opacity hover:opacity-90"
        >
          {isFirstTime
            ? (lang === 'es' ? '¡Comenzar!' : 'Let\'s go!')
            : (lang === 'es' ? 'Guardar' : 'Save')}
        </button>
      </div>
    </div>
  );
}
