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
- **Decay pasivo** — Si no tenés actividad, los stats bajan gradualmente (100 pts en 72 h). Si llegan a 0 la mascota muere, perdés un nivel y podés revivirla pagando 21 sats
- **Sistema de XP y niveles** — 21 niveles con umbrales de XP progresivos; cada interacción suma XP
- **Logros (achievements)** — 40+ badges desbloqueables por zaps, notas, seguidores, rachas diarias y más
- **Racha diaria (streak)** — Contador de días consecutivos de actividad
- **Premios en sats** — 8 milestones por nivel y racha (de 21 a 420 sats), pagados vía NWC (NIP-47) a la lightning address del usuario
- **Landing page** — Página de bienvenida con egg animado, features, how-it-works y preview de stats para usuarios no conectados
- **Perfil Nostr** — Avatar, banner, bio, NIP-05, stats sociales y timeline con imágenes/videos
- **Badges NIP-58 reales** — La app tiene su propia identidad emisora: cada logro desbloqueado se convierte en un badge firmado (kind 30009 + award kind 8) que se puede mostrar en el perfil (kind 30008) y verificar desde cualquier cliente Nostr
- **Red de confianza (Web of Trust)** — Solo alimentan a la mascota las interacciones de gente que seguís o a quien siguen tus seguidos (2 saltos). Las cuentas descartables no suman XP
- **Identidad verificada para premios** — Checklist visible de lud16, NIP-05 verificado y seguidores mínimos antes de cobrar
- **Tarjeta de identidad** — Imagen descargable/compartible con tu perfil, NIP-05 verificado, mascota, stats y QR de tu npub
- **Mascotas de otros** — Tocá a alguien en el ranking o en el log de actividad (o buscalo por npub / NIP-05) para ver su mascota 3D, su nivel y cómo lo conocés en tu red
- **Alimentar mascotas ajenas** — Mandá un zap NIP-57 (21/100/500 sats, con WebLN o QR) a la mascota de un amigo; el recibo la alimenta en tiempo real
- **3 métodos de login** — Extensión NIP-07 (Alby), nsec, Bunker NIP-46 con QR (compatible con Amber)
- **Sesión persistente** — La sesión se mantiene al refrescar o cerrar y volver a abrir

## Quick Start

```bash
npm install
npm run dev
npm test        # tests (vitest)
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
│   ├── progression.ts          # Reglas de XP/niveles (compartidas cliente/servidor)
│   ├── rewardMilestones.ts     # Premios en sats
│   ├── rewardLedger.ts         # Registro de pagos en Redis (servidor)
│   ├── identityChecks.ts       # NIP-05 + seguidores (anti-sybil, servidor)
│   ├── relayQuery.ts           # Consultas a relays con firmas verificadas (servidor)
│   ├── nwc.ts / lnurl.ts       # Pagos NWC (NIP-47) y LNURL-pay
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
| Nivel 3 | 21 sats | Llegar al nivel 3 |
| Nivel 5 | 50 sats | Llegar al nivel 5 |
| Racha 7 días | 77 sats | 7 días consecutivos de actividad Nostr |
| Nivel 10 | 210 sats | Llegar al nivel 10 |
| Racha 14 días | 140 sats | 14 días consecutivos |
| Nivel 15 | 300 sats | Llegar al nivel 15 |
| Racha 21 días | 210 sats | 21 días consecutivos |
| Nivel 21 (máx) | 420 sats | Llegar al nivel máximo |

La lista vive en `src/lib/rewardMilestones.ts`. El pago es automático vía **NWC (NIP-47)** a la `lud16` del perfil Nostr del usuario. Compatible con cualquier wallet NWC: Primal, Rizful, Coinos, Alby, etc.

### Configuración (`.env.local` / variables de Vercel)

> **Los premios están desactivados por defecto.** Para activarlos, fondeá la wallet NWC y seteá `NEXT_PUBLIC_REWARDS_ENABLED=true`. Con el flag apagado se ocultan de la UI y la API rechaza los reclamos.

```bash
# Interruptor general de premios en sats (default: apagado)
NEXT_PUBLIC_REWARDS_ENABLED=true

# Wallet que paga los premios (obligatorio)
NWC_CONNECTION_STRING="nostr+walletconnect://..."

# Registro de pagos (obligatorio — sin esto el servidor NO paga).
# Upstash Redis free tier; en Vercel: Marketplace → Upstash → se setean KV_REST_API_URL/TOKEN solos.
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="..."

# Anti-sybil (opcionales, con estos defaults)
REWARDS_DAILY_CAP_SATS=2100       # tope global de sats pagados por día
REWARDS_REQUIRE_NIP05=true        # exigir NIP-05 verificado
REWARDS_MIN_FOLLOWERS=10          # seguidores mínimos (kind 3)

# Identidad emisora de badges NIP-58 (opcional — sin esto se oculta la sección de badges)
BADGE_ISSUER_NSEC="nsec1..."      # usá una clave NUEVA, solo para la app

# Lightning address que cobra la revivida de 21 sats (debe soportar LNURL-verify)
NEXT_PUBLIC_REVIVE_LN_ADDRESS="vos@tuwallet.com"
```

### Seguridad del sistema de premios

El estado de la mascota (kind 30078) lo firma el propio usuario, así que **el servidor no confía en él** para decidir si ya se pagó:

- **Registro en el servidor** — cada `pubkey:milestone` se reserva atómicamente en Redis (`HSETNX`) antes de pagar. Si el pago falla de forma segura se libera; si el resultado es incierto (timeout de la wallet) queda bloqueado para revisión manual, nunca se paga dos veces.
- **Firmas verificadas** — todos los eventos traídos de relays se verifican y se exige que el autor sea el pubkey reclamante.
- **Estado consistente** — el nivel debe corresponder al XP, y el XP debe poder explicarse por los contadores de acciones.
- **Identidad** — NIP-05 verificado + mínimo de seguidores, para que generar claves descartables no alcance.
- **Tope diario** global de sats.
- **Invoice verificado** — el monto del bolt11 devuelto por la lightning address debe coincidir exactamente con el premio.
- **Zaps verificados (NIP-57)** — solo cuentan los zap receipts firmados por el `nostrPubkey` del LNURL del usuario.

## NIPs implementados

| NIP | Descripción | Uso |
|-----|-------------|-----|
| NIP-01 | Basic protocol | Perfiles y notas |
| NIP-02 | Contact list | Following + Web of Trust de 2 saltos |
| NIP-05 | DNS verification | Verificación (cliente y servidor), requisito para premios, búsqueda de usuarios |
| NIP-07 | Browser extension | Login con Alby/nos2x |
| NIP-46 | Nostr Connect | Login con bunker/Amber (QR) |
| NIP-47 | Nostr Wallet Connect | Pagos automáticos de sats al alcanzar milestones |
| NIP-57 | Zaps | Zap receipts (kind 9735) verificados contra el `nostrPubkey` del LNURL; envío de zaps (kind 9734) para alimentar mascotas ajenas |
| NIP-58 | Badges | Emisión (30009 + 8), visualización y profile badges (30008) |
| NIP-65 | Relay list | Relays propios del usuario |
| NIP-78 | App-specific data | Sync cross-device del estado de la mascota |

## Cómo funciona el sync

El estado completo (stats, log de actividad, XP, nivel y logros) se guarda como evento kind 30078 en los relays del usuario. Al abrir la app en cualquier dispositivo:

1. Se fetchea el evento `tamagostrich-pet-state` de los relays
2. Si el estado remoto es más reciente → se aplica y se calcula el decay acumulado
3. Los goals (XP/nivel) se mezclan tomando el mayor de local y remoto — salvo que un dispositivo haya registrado más muertes (`deaths`), en cuyo caso su XP manda para que la pérdida de nivel no se deshaga
4. Si el fetch inicial falla no se publica nada (para no pisar el estado de otro dispositivo) y se reintenta con backoff
5. Cualquier cambio en los stats se publica automáticamente (debounced 10 s)
6. Al cerrar sesión se hace un flush inmediato para no perder progreso

## Login

- **Extensión NIP-07** — Alby, nos2x u otra extensión del browser
- **nsec** — Clave privada directa (hex o formato `nsec1...`)
- **Bunker NIP-46** — URL `bunker://` o QR para escanear con Amber (Android)

---

Built with ⚡ for La Crypta — IDENTITY Hackathon 2026
