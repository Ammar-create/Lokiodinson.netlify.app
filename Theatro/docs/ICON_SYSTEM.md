# Theatro — Icon System

Comprehensive SVG icon architecture.

---

## Principles

1. **All inline SVG** — No external icon files
2. **CSS-controlled** — `currentColor` for theming
3. **Configurable** — Size, stroke width, className props
4. **No raster images** — CSS animations for loading states
5. **Categorized** — 13 categories for organization

---

## Icon Structure

### Base Component
```javascript
// src/assets/icons/IconBase.js
export function IconBase({
  children,
  size = 24,
  color = 'currentColor',
  strokeWidth = 2,
  className = '',
  ...props
}) {
  return `
    <svg
      width="${size}"
      height="${size}"
      viewBox="0 0 24 24"
      fill="none"
      stroke="${color}"
      stroke-width="${strokeWidth}"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="icon ${className}"
      ${Object.entries(props).map(([k, v]) => `${k}="${v}"`).join(' ')}
    >
      ${children}
    </svg>
  `;
}
```

### Icon Definition
```javascript
// src/assets/icons/navigation/Back.js
import { IconBase } from '../IconBase.js';

export function Back({ size, color, strokeWidth, className } = {}) {
  return IconBase({
    size, color, strokeWidth, className,
    children: `
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    `
  });
}
```

### Usage
```javascript
import { Back } from './assets/icons/navigation/index.js';

// In template
button.innerHTML = Back({ size: 20, color: '#94a3b8' });
```

---

## Categories

### 1. Navigation (`navigation/`)
Directional and structural icons.

| Icon | Description |
|------|-------------|
| `Back` | Left arrow, return |
| `Forward` | Right arrow, proceed |
| `Home` | House icon |
| `Hamburger` | Three lines, menu |
| `Close` | X mark |
| `ChevronLeft` | < |
| `ChevronRight` | > |
| `ChevronUp` | ^ |
| `ChevronDown` | v |

### 2. Actions (`actions/`)
User actions and operations.

| Icon | Description |
|------|-------------|
| `Send` | Paper airplane |
| `Edit` | Pencil |
| `Delete` | Trash can |
| `Save` | Floppy disk |
| `Copy` | Two rectangles |
| `Add` | Plus |
| `Remove` | Minus |
| `Refresh` | Circular arrow |
| `Regenerate` | Circular arrows |
| `Branch` | Git branch symbol |
| `Download` | Arrow down to line |
| `Upload` | Arrow up from line |
| `Export` | Arrow out of box |
| `Import` | Arrow into box |

### 3. Media (`media/`)
Audio, video, image operations.

| Icon | Description |
|------|-------------|
| `Image` | Picture frame |
| `ImageGenerate` | Picture with sparkle |
| `Microphone` | Mic icon |
| `MicrophoneOff` | Mic with slash |
| `Speaker` | Sound waves |
| `SpeakerOff` | Muted speaker |
| `Play` | Triangle |
| `Pause` | Two bars |
| `Stop` | Square |
| `Waveform` | Audio visualization |

### 4. Scenario (`scenario/`)
Scene and story elements.

| Icon | Description |
|------|-------------|
| `Scenario` | Script/document |
| `ScenarioAdd` | Document with plus |
| `Scene` | Theater masks |
| `Location` | Map pin |
| `Time` | Clock |
| `Weather` | Cloud/sun |
| `Event` | Calendar with star |

### 5. Character (`character/`)
Character-related icons.

| Icon | Description |
|------|-------------|
| `Character` | Person silhouette |
| `CharacterAdd` | Person with plus |
| `AvatarPlaceholder` | Circle with person |
| `UserCharacter` | Person with star |
| `Personality` | Brain |
| `Appearance` | Eye |
| `Voice` | Sound wave |

### 6. Controllers (`controllers/`)
Controller system indicators.

| Icon | Description |
|------|-------------|
| `MainController` | Brain network |
| `ScenarioController` | Theater with gear |
| `CreativeController` | Sparkle wand |
| `MediaController` | Image + sound |
| `Debug` | Bug |

### 7. UI (`ui/`)
Interface elements.

| Icon | Description |
|------|-------------|
| `Settings` | Gear |
| `Menu` | Dots or lines |
| `Search` | Magnifying glass |
| `Filter` | Funnel |
| `Sort` | Up/down arrows |
| `Palette` | Paint colors |
| `Theme` | Sun/moon combo |
| `Sun` | Sun |
| `Moon` | Moon |
| `Panel` | Side panel |
| `PanelCollapse` | Arrow pointing right |
| `PanelExpand` | Arrow pointing left |
| `Eye` | Visible |
| `EyeOff` | Hidden |

### 8. Emotions (`emotions/`)
Relationship and mood indicators.

| Icon | Description |
|------|-------------|
| `Heart` | Love |
| `HeartBroken` | Cracked heart |
| `Anger` | Angry face |
| `Suspicion` | Eye with question |
| `Trust` | Handshake |
| `Neutral` | Straight face |
| `Romance` | Two hearts |
| `Friendship` | Two people |
| `Rivalry` | Crossed swords |
| `Jealousy` | Eye with fire |

### 9. Status (`status/`)
System and operation states.

| Icon | Description |
|------|-------------|
| `Check` | Checkmark |
| `Warning` | Triangle ! |
| `Error` | Circle X |
| `Info` | Circle i |
| `Loading` | Animated spinner |
| `StreamingDots` | Three bouncing dots |
| `Connected` | Plug connected |
| `Disconnected` | Plug disconnected |

### 10. Providers (`providers/`)
API provider indicators.

| Icon | Description |
|------|-------------|
| `ProviderP` | P badge |
| `ProviderA` | A badge |
| `ProviderCustom` | Gear badge |
| `ModelText` | T badge |
| `ModelImage` | I badge |
| `ModelAudio` | S badge |

### 11. Features (`features/`)
Feature toggles and modes.

| Icon | Description |
|------|-------------|
| `AutoImprove` | Magic wand |
| `AutoScenario` | Robot head |
| `Streaming` | Flowing lines |
| `Memory` | Brain with layers |
| `Relationship` | Web of dots |
| `Timeline` | Horizontal line with dots |
| `Branch` | Tree branch |
| `Lock` | Padlock |

### 12. Decorative (`decorative/`)
Branding and aesthetics.

| Icon | Description |
|------|-------------|
| `EmptyState` | Box with wind |
| `EmptyChat` | Speech bubbles |
| `EmptyCharacters` | Person with question |
| `LogoFull` | Complete logo |
| `LogoMark` | Icon only |
| `Theatre` | Theater building |
| `Masks` | Comedy/tragedy |
| `StageCurtain` | Curtains |

### 13. Placeholders (`placeholders/`)
Avatar fallbacks.

| Icon | Description |
|------|-------------|
| `AvatarGeneric1-6` | Various abstract shapes |
| `AvatarInitial` | Letter in circle |
| `AvatarPattern` | Geometric pattern |

---

## Index Files

Each category has an index for clean imports:

```javascript
// src/assets/icons/navigation/index.js
export { Back } from './Back.js';
export { Forward } from './Forward.js';
export { Home } from './Home.js';
// ...

// Main index
export * from './navigation/index.js';
export * from './actions/index.js';
// ...
```

---

## Animated Icons

### Loading Spinner (CSS)
```javascript
// src/assets/icons/status/Loading.js
export function Loading({ size = 24, color, strokeWidth, className } = {}) {
  return `
    <svg
      width="${size}"
      height="${size}"
      viewBox="0 0 24 24"
      class="icon loading-icon ${className}"
    >
      <style>
        .loading-icon {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="${color || 'currentColor'}"
        stroke-width="${strokeWidth || 2}"
        stroke-dasharray="31.4 31.4"
        stroke-linecap="round"
      />
    </svg>
  `;
}
```

### Streaming Dots (CSS)
```javascript
// src/assets/icons/status/StreamingDots.js
export function StreamingDots({ size = 24, color } = {}) {
  return `
    <svg
      width="${size}"
      height="${size}"
      viewBox="0 0 24 24"
      class="streaming-dots"
    >
      <style>
        .streaming-dots circle {
          animation: bounce 0.6s ease-in-out infinite;
        }
        .streaming-dots circle:nth-child(2) {
          animation-delay: 0.1s;
        }
        .streaming-dots circle:nth-child(3) {
          animation-delay: 0.2s;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      </style>
      <circle cx="6" cy="12" r="2" fill="${color || 'currentColor'}" />
      <circle cx="12" cy="12" r="2" fill="${color || 'currentColor'}" />
      <circle cx="18" cy="12" r="2" fill="${color || 'currentColor'}" />
    </svg>
  `;
}
```

---

## Icon Guidelines

### Design
- 24×24 viewBox as default
- 2px stroke width as default
- Consistent line caps and joins
- Simple, recognizable shapes
- No fills (except status/placeholder)

### Naming
- PascalCase
- Noun form (not verb)
- Specific over generic (`Trash` not `Delete`)

### Accessibility
```javascript
function AccessibleIcon({ icon, label, decorative = false }) {
  const ariaLabel = decorative ? '' : `aria-label="${label}"`;
  const role = decorative ? '' : 'role="img"';
  
  return icon.replace('<svg', `<svg ${role} ${ariaLabel}`);
}
```