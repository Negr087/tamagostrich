# 🔐 Nostr Starter Kit

Starter kit para la hackathon **IDENTITY** de La Crypta — Abril 2026.

Conectate a Nostr con extensión (Alby), nsec, o bunker. Mirá tu perfil como si fuera Twitter.

## Quick Start

```bash
# Clonar
git clone https://github.com/lacrypta/nostr-starter
cd nostr-starter

# Instalar
npm install

# Correr
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000)

## Features

- 🔑 **3 métodos de login:** Extension (Alby/nos2x), nsec, Bunker (NIP-46)
- 👤 **Perfil completo:** Avatar, banner, bio, links, Lightning address
- 📊 **Stats:** Followers, following, cantidad de notas
- 📝 **Timeline:** Tus últimas notas con timestamps relativos
- 🌐 **Multi-relay:** Conecta a Damus, Nostr.band, nos.lol, Primal

## Stack

- [Next.js 16](https://nextjs.org/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [NDK](https://ndk.fyi/) (Nostr Dev Kit)
- [Zustand](https://zustand-demo.pmnd.rs/) (State)

## Estructura

```
src/
├── components/
│   ├── Navbar.tsx      # Navegación + botón login
│   ├── LoginModal.tsx  # Modal de autenticación
│   └── Profile.tsx     # Vista de perfil
├── lib/
│   └── nostr.ts        # Funciones Nostr
└── store/
    └── auth.ts         # Estado de autenticación
```

## NIPs Utilizados

- **NIP-01:** Basic protocol
- **NIP-02:** Contact list (following)
- **NIP-05:** DNS-based verification
- **NIP-07:** Browser extension
- **NIP-46:** Nostr Connect (bunker)

## Ideas para tu Proyecto

1. **Perfil Público** — Ver perfil de cualquier npub
2. **Editor de Perfil** — Actualizar kind 0
3. **Verificador NIP-05** — Check de identidad
4. **Social Feed** — Timeline de seguidos
5. **Nostr Login** — Auth para tu app con Nostr
6. **Badge System** — Badges verificables
7. **Reputation Score** — Basado en follows/WoT

## Recursos

- 📚 [Nostr Protocol](https://nostr.com)
- 📖 [NIPs](https://github.com/nostr-protocol/nips)
- 🛠️ [NDK Docs](https://ndk.fyi)
- 🦊 [Alby Extension](https://getalby.com)

## Hackathon

**IDENTITY — Nostr Identity & Social**

- 📅 Abril 2026
- ⭐ Nivel: Beginner
- 💰 Premios: 1,000,000 sats
- 📝 [Inscribite](https://tally.so/r/9qDNEY)

---

Built with ⚡ by [La Crypta](https://lacrypta.ar)
