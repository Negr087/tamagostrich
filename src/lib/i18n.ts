import { useLangStore } from '@/store/lang';
import { NoriAction, NoriMood } from '@/store/nori';

export const T = {
  es: {
    // Navbar
    navPet: 'Mascota',
    navProfile: 'Perfil',
    navBadges: 'Insignias',
    navGoals: 'Objetivos',
    connect: 'Conectar',
    disconnect: 'Desconectar',
    langToggle: 'EN',

    // Pet waiting screen
    petWaitingTitle: 'Tu Mascota te espera',
    petWaitingLine1: 'Tu mascota vive',
    petWaitingLine2: 'de tu actividad en Nostr.',
    petWaitingLine3: 'Zaps, reacciones y seguidores la mantienen feliz',
    petWaitingLine4: '¿La vas a mantener viva?',

    // Stat bars
    statHappiness: 'Felicidad',
    statEnergy: 'Energía',
    statSocial: 'Social',

    // Moods
    moods: {
      happy:    'Feliz',
      excited:  'Emocionada',
      resting:  'Descansando',
      sleeping: 'Durmiendo',
      sad:      'Triste',
      social:   'Social',
    } as Record<NoriMood, string>,

    // Action buttons
    actions: {
      zap_received:      'Recibir Zap',
      note_published:    'Publicar nota',
      reaction_received: 'Nueva reacción',
      repost_received:   'Reposteo',
      no_activity:       'Sin actividad',
      mention_received:  'Te mencionaron',
      new_follower:      'Nuevo seguidor',
    } as Record<NoriAction, string>,

    // Idle time
    idleNow: 'ahora mismo',
    idleMins: (n: number) => `hace ${n} min`,
    idleHours: (n: number) => `hace ${n} h`,
    idleDays: (n: number) => `hace ${Math.floor(n)} d`,

    // Pet canvas UI
    dragHint: 'Arrastrá · Scroll',
    connected: 'conectado',
    disconnected: 'desconectado',
    activityTitle: 'Actividad Nostr',
    activityEmpty: 'Tu Mascota está esperando actividad...',

    // Profile
    profileFollowing: 'Siguiendo',
    profileFollowers: 'Seguidores',
    profileNotes: 'Notas',
    profilePublicKey: 'Clave Pública',
    profilePosts: 'Posts',
    profileZaps: 'Zaps',
    profileGallery: 'Galería',
    profileGalleryEmpty: 'Sin fotos ni videos aún',
    profileGalleryEmptyDesc: 'Las fotos y videos de tus notas aparecerán acá',
    profileNoNotes: 'Sin notas aún',
    profileZapsEmpty: 'Sin zaps aún',
    profileZapsEmptyDesc: 'Los zaps que recibas aparecerán acá',
    profileSats: 'sats',
    profileConnectTitle: 'Tamagostrich',
    profileConnectDesc: 'Conectá tu identidad para explorar la red social descentralizada',

    // Goals
    goalsTitle: 'Objetivos',
    goalsSubtitle: 'Tu progreso en la identidad Nostr',
    goalsLevel: 'Nivel',
    goalsXPTotal: 'XP total',
    goalsStreak: (n: number) => `${n} día${n !== 1 ? 's' : ''} de racha`,
    goalsNextLevel: (n: number) => `Próximo: Nivel ${n}`,
    goalsMaxLevel: '¡Nivel máximo!',
    goalsAchievements: 'Logros',
    goalsUnlocked: '✓ Desbloqueado',
    goalsLevelUp: (n: number) => `¡Nivel ${n}! 🎉`,
    // Rewards
    goalsRewardsTitle: 'Recompensas en sats',
    goalsRewardsSubtitle: 'Alcanzá estos niveles y recibís sats directamente en tu wallet',
    goalsRewardClaim: (sats: number) => `Reclamar ${sats} sats`,
    goalsRewardClaiming: 'Enviando...',
    goalsRewardClaimed: (sats: number) => `⚡ ${sats} sats recibidos`,
    goalsRewardLocked: (lvl: number) => `Disponible en nivel ${lvl}`,
    goalsRewardNoLud16: 'Agregá un lightning address a tu perfil Nostr para recibir sats',
    goalsRewardError: 'No se pudo procesar. Intentá de nuevo.',

    // Badges
    badgesTitle: 'Insignias',
    badgesSubtitle: 'Insignias Nostr otorgadas a tu perfil (NIP-58)',
    badgesNone: 'Sin insignias aún',
    badgesNoneDesc: 'Las insignias que recibas de la red Nostr aparecerán acá',

    // Share
    shareBtn: 'Compartir en Nostr',
    shareModalTitle: 'Compartir tu progreso',
    shareModalSubtitle: 'Se va a publicar esta nota en tu perfil Nostr',
    sharePublish: 'Publicar',
    sharePublishing: 'Publicando...',
    shareSuccess: '¡Publicado! Tu progreso está en Nostr 🎉',
    shareError: 'No se pudo publicar. ¿Tenés signer activo?',
    shareEditPlaceholder: 'Editá tu mensaje antes de publicar...',
    shareAmberPending: 'Abrí Amber para firmar la publicación',
    shareAmberPendingSub: 'Esperando tu aprobación en Amber...',

    // Amber intent
    amberLoginBtn: 'Conectar con Amber',
    amberLoginDesc: 'Abre Amber para conectar tu identidad Nostr',
    amberLoginSuccess: '✓ Conectado con Amber',

    // Death & revival
    petDeadTitle: '💀 Tu mascota murió',
    petDeadDesc: 'Sus estadísticas llegaron a cero por falta de actividad en Nostr.',
    petReviveBtn: 'Revivir por 21 sats ⚡',
    petReviving: 'Procesando pago...',
    petReviveSuccess: '¡Revivida! 🎉',
    petReviveError: 'No se pudo procesar el pago. Intentá de nuevo.',
    petReviveManualTitle: 'Escaneá el QR o copiá la factura',
    petRevivePaid: '⚡ Pago recibido',
    petRevivePaidSub: 'Reviviendo tu mascota...',
    petReviveNoConfig: 'La resurrección no está configurada en este servidor.',
    petReviveCopy: 'Copiar factura',
    petReviveCopied: '¡Copiado!',
    petReviveOpenWallet: 'Abrir con wallet Lightning',
    petReviveWaiting: 'Esperando pago...',

    // Leaderboard
    navRanking: 'Ranking',
    leaderboardTitle: 'Ranking',
    leaderboardSubtitle: 'Los mejores Tamagostrich de Nostr',
    leaderboardLevel: 'Nivel',
    leaderboardStreak: 'Racha',
    leaderboardEmpty: 'Sin datos aún. ¡Sé el primero en el ranking!',
    leaderboardLoading: 'Cargando ranking...',
    leaderboardError: 'No se pudo cargar el ranking.',
    leaderboardUpdated: 'Actualizado hace',
    leaderboardDays: (n: number) => `${n}d`,
  },

  en: {
    // Navbar
    navPet: 'Pet',
    navProfile: 'Profile',
    navBadges: 'Badges',
    navGoals: 'Goals',
    connect: 'Connect',
    disconnect: 'Disconnect',
    langToggle: 'ES',

    // Pet waiting screen
    petWaitingTitle: 'Your Pet is waiting',
    petWaitingLine1: 'Your pet lives',
    petWaitingLine2: 'off your Nostr activity.',
    petWaitingLine3: 'Zaps, reactions and followers keep it happy',
    petWaitingLine4: 'Will you keep it alive?',

    // Stat bars
    statHappiness: 'Happiness',
    statEnergy: 'Energy',
    statSocial: 'Social',

    // Moods
    moods: {
      happy:    'Happy',
      excited:  'Excited',
      resting:  'Resting',
      sleeping: 'Sleeping',
      sad:      'Sad',
      social:   'Social',
    } as Record<NoriMood, string>,

    // Action buttons
    actions: {
      zap_received:      'Receive Zap',
      note_published:    'Publish note',
      reaction_received: 'New reaction',
      repost_received:   'Repost',
      no_activity:       'No activity',
      mention_received:  'Mentioned you',
      new_follower:      'New follower',
    } as Record<NoriAction, string>,

    // Idle time
    idleNow: 'just now',
    idleMins: (n: number) => `${n} min ago`,
    idleHours: (n: number) => `${n} h ago`,
    idleDays: (n: number) => `${Math.floor(n)} d ago`,

    // Pet canvas UI
    dragHint: 'Drag · Scroll',
    connected: 'connected',
    disconnected: 'disconnected',
    activityTitle: 'Nostr Activity',
    activityEmpty: 'Your Pet is waiting for activity...',

    // Profile
    profileFollowing: 'Following',
    profileFollowers: 'Followers',
    profileNotes: 'Notes',
    profilePublicKey: 'Public Key',
    profilePosts: 'Posts',
    profileZaps: 'Zaps',
    profileGallery: 'Gallery',
    profileGalleryEmpty: 'No photos or videos yet',
    profileGalleryEmptyDesc: 'Photos and videos from your notes will appear here',
    profileNoNotes: 'No notes yet',
    profileZapsEmpty: 'No zaps yet',
    profileZapsEmptyDesc: 'Zaps you receive will appear here',
    profileSats: 'sats',
    profileConnectTitle: 'Tamagostrich',
    profileConnectDesc: 'Connect your identity to explore the decentralized social network',

    // Goals
    goalsTitle: 'Goals',
    goalsSubtitle: 'Your Nostr identity progress',
    goalsLevel: 'Level',
    goalsXPTotal: 'Total XP',
    goalsStreak: (n: number) => `${n}-day streak`,
    goalsNextLevel: (n: number) => `Next: Level ${n}`,
    goalsMaxLevel: 'Max level!',
    goalsAchievements: 'Achievements',
    goalsUnlocked: '✓ Unlocked',
    goalsLevelUp: (n: number) => `Level ${n}! 🎉`,
    // Rewards
    goalsRewardsTitle: 'Sats rewards',
    goalsRewardsSubtitle: 'Reach these levels and receive sats directly to your wallet',
    goalsRewardClaim: (sats: number) => `Claim ${sats} sats`,
    goalsRewardClaiming: 'Sending...',
    goalsRewardClaimed: (sats: number) => `⚡ ${sats} sats received`,
    goalsRewardLocked: (lvl: number) => `Unlocks at level ${lvl}`,
    goalsRewardNoLud16: 'Add a lightning address to your Nostr profile to receive sats',
    goalsRewardError: 'Could not process. Please try again.',

    // Badges
    badgesTitle: 'Badges',
    badgesSubtitle: 'Nostr badges awarded to your profile (NIP-58)',
    badgesNone: 'No badges yet',
    badgesNoneDesc: 'Badges you receive from the Nostr network will appear here',

    // Share
    shareBtn: 'Share on Nostr',
    shareModalTitle: 'Share your progress',
    shareModalSubtitle: 'This note will be published to your Nostr profile',
    sharePublish: 'Publish',
    sharePublishing: 'Publishing...',
    shareSuccess: 'Published! Your progress is on Nostr 🎉',
    shareError: 'Could not publish. Is your signer active?',
    shareEditPlaceholder: 'Edit your message before publishing...',
    shareAmberPending: 'Open Amber to sign the post',
    shareAmberPendingSub: 'Waiting for your approval in Amber...',

    // Amber intent
    amberLoginBtn: 'Connect with Amber',
    amberLoginDesc: 'Opens Amber to connect your Nostr identity',
    amberLoginSuccess: '✓ Connected with Amber',

    // Death & revival
    petDeadTitle: '💀 Your pet died',
    petDeadDesc: 'Its stats reached zero from lack of Nostr activity.',
    petReviveBtn: 'Revive for 21 sats ⚡',
    petReviving: 'Processing payment...',
    petReviveSuccess: 'Revived! 🎉',
    petReviveError: 'Could not process payment. Please try again.',
    petReviveManualTitle: 'Scan the QR or copy the invoice',
    petRevivePaid: '⚡ Payment received',
    petRevivePaidSub: 'Reviving your pet...',
    petReviveNoConfig: 'Revival is not configured on this server.',
    petReviveCopy: 'Copy invoice',
    petReviveCopied: 'Copied!',
    petReviveOpenWallet: 'Open with Lightning wallet',
    petReviveWaiting: 'Waiting for payment...',

    // Leaderboard
    navRanking: 'Ranking',
    leaderboardTitle: 'Ranking',
    leaderboardSubtitle: 'Top Tamagostrich on Nostr',
    leaderboardLevel: 'Level',
    leaderboardStreak: 'Streak',
    leaderboardEmpty: 'No data yet. Be the first on the leaderboard!',
    leaderboardLoading: 'Loading ranking...',
    leaderboardError: 'Could not load ranking.',
    leaderboardUpdated: 'Updated',
    leaderboardDays: (n: number) => `${n}d ago`,
  },
};

export type Translations = typeof T.es;

export function useLang() {
  const { lang, setLang } = useLangStore();
  return { t: T[lang], lang, setLang };
}
