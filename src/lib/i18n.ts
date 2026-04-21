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

    // Badges
    badgesTitle: 'Insignias',
    badgesSubtitle: 'Insignias Nostr otorgadas a tu perfil (NIP-58)',
    badgesNone: 'Sin insignias aún',
    badgesNoneDesc: 'Las insignias que recibas de la red Nostr aparecerán acá',
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

    // Badges
    badgesTitle: 'Badges',
    badgesSubtitle: 'Nostr badges awarded to your profile (NIP-58)',
    badgesNone: 'No badges yet',
    badgesNoneDesc: 'Badges you receive from the Nostr network will appear here',
  },
};

export type Translations = typeof T.es;

export function useLang() {
  const { lang, setLang } = useLangStore();
  return { t: T[lang], lang, setLang };
}
