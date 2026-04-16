# 🪶 Tamagostrich

Tu mascota virtual que vive en el protocolo Nostr. Nori es un avestruz que se alimenta de tu actividad social — zaps, reacciones, menciones y seguidores la mantienen feliz y con energía. Si la ignorás, sufre.

## ¿Qué es?

Tamagostrich es un tamagotchi descentralizado donde el estado de tu mascota vive **en Nostr**, no en un servidor. Tus stats se sincronizan entre dispositivos via NIP-78 (kind 30078) y la mascota reacciona en tiempo real a tu actividad en la red.

## Features

- 🪶 **Mascota 3D** — Nori renderizada con Three.js, con animaciones por tipo de evento
- ⚡ **Actividad en tiempo real** — Zaps, reacciones, menciones y nuevos seguidores la animan
- 📊 **Stats cross-device** — Felicidad, Energía y Social sincronizados via Nostr (NIP-78)
- 😴 **Decay pasivo** — Si no tenés actividad, los stats bajan con el tiempo
- 👤 **Perfil Nostr** — Avatar, banner, bio, NIP-05, stats sociales y timeline con imágenes/videos
- 🏅 **Badges NIP-58** — Visualización de badges recibidos
- 🔑 **3 métodos de login** — Extensión NIP-07 (Alby), nsec, Bunker NIP-46 con QR (compatible con Amber)
- 🔒 **Sesión persistente** — La sesión se mantiene al refrescar o volver atrás

## Quick Start

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000)

## Stack

- [Next.js](https://nextjs.org/) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [NDK v3](https://ndk.fyi/) — Nostr Dev Kit
- [Three.js](https://threejs.org/) — 3D mascota
- [Zustand](https://zustand-demo.pmnd.rs/) — State management
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools) — Utilidades Nostr

## Estructura

```
src/
├── app/
│   ├── layout.tsx          # Root layout + SessionRestorer
│   ├── page.tsx            # Página principal (secciones)
│   └── globals.css         # Design system La Crypta
├── components/
│   ├── Nori.tsx            # Mascota 3D + stats + log de actividad
│   ├── Profile.tsx         # Perfil con timeline (imágenes/videos inline)
│   ├── Badges.tsx          # Badges NIP-58
│   ├── Navbar.tsx          # Nav responsive + menú de usuario
│   ├── LoginModal.tsx      # Modal con 3 métodos de auth + QR bunker
│   └── SessionRestorer.tsx # Restaura sesión y signer de NDK al cargar
├── lib/
│   ├── nostr.ts            # NDK, login, relays, sync de mascota (NIP-78)
│   ├── noriEvents.ts       # Listener de eventos Nostr para la mascota
│   └── use-nostr-connect.ts # Hook NIP-46 con polling (compatible Amber)
└── store/
    ├── auth.ts             # Estado de autenticación (Zustand + persist)
    ├── nori.ts             # Estado de la mascota + sync Nostr
    └── nav.ts              # Sección activa
```

## NIPs Implementados

| NIP | Descripción | Uso |
|-----|-------------|-----|
| NIP-01 | Basic protocol | Perfiles y notas |
| NIP-02 | Contact list | Following |
| NIP-05 | DNS verification | Badge verificado |
| NIP-07 | Browser extension | Login con Alby/nos2x |
| NIP-46 | Nostr Connect | Login con bunker/Amber (QR) |
| NIP-58 | Badges | Visualización de badges |
| NIP-65 | Relay list | Relays propios del usuario |
| NIP-78 | App-specific data | Sync cross-device del estado de la mascota |

## Cómo funciona el sync

El estado de Nori (Felicidad, Energía, Social, log de actividad) se guarda como un evento kind 30078 en los relays de Nostr. Al abrir la app en cualquier dispositivo:

1. Se fetchea el evento `tamagostrich-pet-state` de los relays
2. Si el estado remoto es más reciente → se aplica y se calcula el decay acumulado
3. Cualquier cambio en los stats se publica automáticamente (debounced 10s)

## Login

- **Extensión NIP-07** — Alby, nos2x u otra extensión del browser
- **nsec** — Clave privada directa (hex o formato `nsec1...`)
- **Bunker NIP-46** — URL `bunker://` o QR para escanear con Amber (Android)

---

Built with ⚡ for La Crypta — IDENTITY Hackathon 2026
