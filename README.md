# Tamagostrich

Tu mascota virtual que vive en el protocolo Nostr. Nori es un avestruz bebé que se alimenta de tu actividad social — zaps, reacciones, menciones y seguidores la mantienen feliz y con energía. Si la ignorás, sufre.

## ¿Qué es?

Tamagostrich es un tamagotchi descentralizado donde el estado de tu mascota vive **en Nostr**, no en un servidor. Tus stats, nivel y logros se sincronizan entre dispositivos vía NIP-78 (kind 30078) y la mascota reacciona en tiempo real a tu actividad en la red.

## Features

- **Mascota 3D** — 9 animales renderizados con Three.js (GLB), con animación de idle y rotación controlable
- **Huevo de bienvenida** — Al conectarse por primera vez aparece un huevo animado que se rompe y revela a Nori
- **Selector de mascota y color** — Elegí entre 9 animales 3D y una paleta de colores
- **Actividad en tiempo real** — Zaps, reacciones, reposts, menciones y nuevos seguidores animan a Nori
- **Stats cross-device** — Felicidad, Energía y Social sincronizados vía Nostr (NIP-78)
- **Decay pasivo** — Si no tenés actividad, los stats bajan gradualmente (100 pts en 24 h)
- **Sistema de XP y niveles** — 21 niveles con umbrales de XP progresivos; cada interacción suma XP
- **Logros (achievements)** — 40+ badges desbloqueables por zaps, notas, seguidores, rachas diarias y más
- **Racha diaria (streak)** — Contador de días consecutivos de actividad
- **Premios en sats** — Al llegar al nivel 10 (210 sats) y al nivel máximo (420 sats), el app paga automáticamente vía NWC (NIP-47) a la lightning address del usuario
- **Landing page** — Página de bienvenida con egg animado, features, how-it-works y preview de stats para usuarios no conectados
- **Perfil Nostr** — Avatar, banner, bio, NIP-05, stats sociales y timeline con imágenes/videos
- **Badges NIP-58** — Visualización de badges recibidos
- **3 métodos de login** — Extensión NIP-07 (Alby), nsec, Bunker NIP-46 con QR (compatible con Amber)
- **Sesión persistente** — La sesión se mantiene al refrescar o cerrar y volver a abrir

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
- [Three.js](https://threejs.org/) — modelos 3D GLB
- [Zustand](https://zustand-demo.pmnd.rs/) — state management con persistencia en localStorage
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools) — utilidades Nostr

## Estructura

```
src/
├── app/
│   ├── layout.tsx              # Root layout + SessionRestorer
│   ├── page.tsx                # Página principal — rutas entre secciones
│   └── globals.css             # Design system La Crypta
├── components/
│   ├── LandingPage.tsx         # Landing page para usuarios no conectados
│   ├── EggHatch.tsx            # Pantalla de bienvenida (huevo → Nori)
│   ├── Nori.tsx                # Mascota 3D + stats + log de actividad
│   ├── PetSelector.tsx         # Selector de animal y color
│   ├── Goals.tsx               # Sistema de XP, niveles y logros
│   ├── Profile.tsx             # Perfil con timeline (imágenes/videos inline)
│   ├── Badges.tsx              # Badges NIP-58
│   ├── Navbar.tsx              # Nav responsive + menú de usuario
│   ├── LoginModal.tsx          # Modal con 3 métodos de auth + QR bunker
│   └── SessionRestorer.tsx     # Restaura sesión y signer de NDK al cargar
├── lib/
│   ├── nostr.ts                # NDK, login, relays, sync de mascota (NIP-78)
│   ├── noriEvents.ts           # Listener de eventos Nostr en tiempo real
│   ├── petModels.ts            # Carga GLB, materiales, dispatch por animal
│   ├── i18n.ts                 # Soporte ES/EN
│   └── use-nostr-connect.ts    # Hook NIP-46 con polling (compatible Amber)
└── store/
    ├── auth.ts                 # Autenticación (Zustand + persist)
    ├── nori.ts                 # Stats de la mascota + sync Nostr
    ├── goals.ts                # XP, niveles, logros y rachas
    ├── appearance.ts           # Animal y color elegidos
    ├── nav.ts                  # Sección activa
    ├── profileCache.ts         # Cache de perfil Nostr
    └── badgesCache.ts          # Cache de badges NIP-58
```

## Animales disponibles

| Animal | Archivo |
|--------|---------|
| 🪶 Nori (avestruz bebé) | `mascota.glb` — predeterminado |
| 🦩 Avestruz | `ostrich.glb` |
| 🦙 Llama | `llama.glb` |
| 🐂 Toro | `toro.glb` |
| 🦍 Gorila | `gorila.glb` |
| 🐯 Tigre | `tigre.glb` |
| 🐱 Gato | `gato.glb` |
| 🐿️ Ardilla | `ardilla.glb` |
| 🦉 Búho | `buho.glb` |

## Premios en sats

| Milestone | Sats | Requisito |
|-----------|------|-----------|
| Nivel 5 | 50 sats | Llegar al nivel 5 |
| Racha 7 días | 77 sats | 7 días consecutivos de actividad Nostr |
| Nivel 10 | 210 sats | Llegar al nivel 10 |
| Racha 21 días | 210 sats | 21 días consecutivos de actividad Nostr |
| Nivel 21 (máx) | 420 sats | Llegar al nivel máximo |

El pago es automático vía **NWC (NIP-47)**. El operador configura su wallet en `.env.local`:

```bash
NWC_CONNECTION_STRING="nostr+walletconnect://..."
```

Compatible con cualquier wallet NWC: Primal, Rizful, Coinos, Alby, Mutiny, etc. Los sats se envían a la `lud16` (lightning address) del perfil Nostr del usuario. El estado de "ya reclamado" se guarda en el evento NIP-78 del usuario para evitar doble cobro.

## NIPs implementados

| NIP | Descripción | Uso |
|-----|-------------|-----|
| NIP-01 | Basic protocol | Perfiles y notas |
| NIP-02 | Contact list | Following |
| NIP-05 | DNS verification | Badge verificado en perfil |
| NIP-07 | Browser extension | Login con Alby/nos2x |
| NIP-46 | Nostr Connect | Login con bunker/Amber (QR) |
| NIP-47 | Nostr Wallet Connect | Pagos automáticos de sats al alcanzar milestones |
| NIP-57 | Zaps | Detección de zap receipts (kind 9735) |
| NIP-58 | Badges | Visualización de badges recibidos |
| NIP-65 | Relay list | Relays propios del usuario |
| NIP-78 | App-specific data | Sync cross-device del estado de la mascota |

## Cómo funciona el sync

El estado completo (stats, log de actividad, XP, nivel y logros) se guarda como evento kind 30078 en los relays del usuario. Al abrir la app en cualquier dispositivo:

1. Se fetchea el evento `tamagostrich-pet-state` de los relays
2. Si el estado remoto es más reciente → se aplica y se calcula el decay acumulado
3. Los goals (XP/nivel) siempre se mezclan tomando el mayor de local y remoto
4. Cualquier cambio en los stats se publica automáticamente (debounced 10 s)
5. Al cerrar sesión se hace un flush inmediato para no perder progreso

## Login

- **Extensión NIP-07** — Alby, nos2x u otra extensión del browser
- **nsec** — Clave privada directa (hex o formato `nsec1...`)
- **Bunker NIP-46** — URL `bunker://` o QR para escanear con Amber (Android)

---

Built with ⚡ for La Crypta — IDENTITY Hackathon 2026
