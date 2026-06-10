# 🏴‍☠️ Grand Line Archive — One Piece Wiki

> **A premium, animated One Piece wiki application** covering characters and Devil Fruits from **Episode 1 to Episode 109** (Pre-Alabasta Finale).

Built by **Libertas** 🕊️ — a passionate One Piece fan and developer.

---

## 📋 Project Overview

This is a **modern, fully-featured One Piece wiki** that transforms the traditional wiki experience into an immersive, animated interface. The application focuses on the **East Blue Saga through the Alabasta Saga**, capturing the journey of the Straw Hat Pirates up to the climactic battle with Sir Crocodile.

### 🎯 Key Features

- **🎨 Premium Design** — Deep ocean aesthetic with animated waves, bubbles, and atmospheric lighting
- **🎴 Wanted Poster Cards** — Hover to flip each character card into a vintage wanted poster with bounty, status stamp, and challenge button
- **🔍 Live Search & Filtering** — Real-time search across names, epithets, affiliations, and Devil Fruits
- **📊 Animated Radar Charts** — SVG-powered stat visualization that draws itself in with pulsing vertices
- **⚔️ Duel Mode** — Recruit any two characters for a head-to-head animated stat battle
- **📱 Fully Responsive** — Works beautifully on desktop, tablet, and mobile devices
- **⚡ Zero Dependencies** — No frameworks, no build tools, just pure HTML/CSS/JS

---

## 🗂️ Data Architecture

The entire wiki is **data-driven** via `data.js`. This means:

- **No code changes needed** to add new characters, groups, or Devil Fruits
- **Groups become sections** — each group in `data.js` automatically renders as a titled section on the page
- **Complete control** over site title, tagline, footer, and all content

### 📁 File Structure

```
OnePieceWiki/
├── index.html          # Main application (never needs editing)
├── data.js             # All wiki data (edit this to change content)
└── README.md           # This file
```

---

## 🚀 Quick Start

### 1. Local Development

Simply open `index.html` in your browser. The app will automatically load `data.js` and render the entire wiki.

### 2. Netlify Deployment

1. Push these files to your GitHub repository
2. Connect the repository to Netlify
3. Set the publish directory to the folder containing `index.html`
4. Deploy — the app will be live at your Netlify subdomain

### 3. Custom Domain (Optional)

Add your custom domain in Netlify settings and configure DNS records as instructed.

---

## 📝 Data Structure

### Site Configuration

```javascript
window.WIKI_DATA = {
  site: {
    title: "GRAND LINE ARCHIVE",
    tagline: "Records of pirates, marines & cursed fruits...",
    badge: "⊹ LOG POSE SET · EAST BLUE → ALABASTA ⊹",
    footer: "Grand Line Archive · © Libertas 🕊️ · All rights reserved"
  },
  // ...
}
```

### Character Object

```javascript
{
  id: "luffy",                    // Unique identifier
  name: "Monkey D. Luffy",        // Display name
  hue: 355,                       // Theme color (0-360)
  initials: "L",                  // Crest initials
  role: "CAPTAIN",                // Small caps tag
  epithet: "Straw Hat Luffy",     // Nickname
  affiliation: "Straw Hat Pirates (Captain)",
  devil_fruit: "Gomu Gomu no Mi (Rubber Human)",
  bounty: 30000000,               // null = undisclosed
  status: "wanted",               // wanted | marine | royal | warlord | rogue
  abilities: ["...", "..."],      // Powers list
  feats: ["...", "..."],          // Notable achievements
  stats: {                        // 0-100 values
    Strength: 80,
    Speed: 65,
    Durability: 90,
    Skill: 60,
    Intelligence: 30
  }
}
```

### Group Structure

```javascript
groups: [
  {
    id: "crew",
    title: "The Straw Hat Crew",
    tagline: "MAIN CREW · THE GOING MERRY",
    characters: [ /* array of character objects */ ]
  },
  {
    id: "eastblue",
    title: "East Blue & Loguetown",
    tagline: "WHERE THE VOYAGE BEGAN",
    characters: [ /* array of character objects */ ]
  }
  // ... more groups
]
```

### Devil Fruit Object

```javascript
{
  name: "Gomu Gomu no Mi",
  type: "Paramecia",
  user: "Monkey D. Luffy",
  hue: 355,
  description: "Grants the user's body the properties of rubber..."
}
```

---

## 🎮 Features Deep Dive

### 🔍 Search & Filtering

- **Live search** — filters as you type
- **Context-aware chips** — changes based on current view (Characters vs Devil Fruits)
- **Sorting options** — Archive Order, Bounty, Name, Power

### 🃏 Wanted Poster Cards

- **Hover to flip** — reveals vintage parchment poster
- **Status stamps** — color-coded based on character status
- **Bounty display** — formatted with currency symbol
- **Challenge button** — quick access to Duel Mode

### 📊 Radar Charts

- **Self-drawing animation** — SVG polygon draws itself in
- **Pulsing vertices** — highlights each stat point
- **5-axis visualization** — Strength, Speed, Durability, Skill, Intelligence

### ⚔️ Duel Mode

- **Recruit fighters** — click ⚔ on any card
- **Tray system** — golden tray slides up from bottom
- **Animated battle** — stat bars fill with winners highlighted in gold
- **Verdict** — declares the winner with category breakdown

### 🌊 Atmospheric Effects

- **Light rays** — drifting through the ocean depths
- **Rising bubbles** — 26 randomly generated and animated
- **Parallax waves** — two-layer scrolling ocean surface
- **Sailing ship** — pirate ship that bobs and sails across the screen
- **Compass needle** — wobbling navigation indicator

---

## 🎨 Design Philosophy

### Color Palette

- **Abyss** — Deep navy background (`#020a18`)
- **Surf** — Ocean blue accents (`#1c6fd1`)
- **Foam** — Light cyan highlights (`#5ec8f2`)
- **Gold** — Bounty and victory accents (`#f2c14e`)

### Typography

- **Pirata One** — Pirate display font for headers
- **Spectral** — Elegant serif for body text
- **IBM Plex Mono** — Technical font for metadata

### Animation Principles

- **Staggered reveals** — elements animate in sequence
- **Hover states** — cards lift, crests scale, buttons glow
- **Micro-interactions** — subtle movements that feel alive
- **Reduced motion support** — respects user preferences

---

## 📊 Current Data Coverage

### Groups

1. **The Straw Hat Crew** — Luffy, Zoro, Nami, Usopp, Sanji, Chopper
2. **East Blue & Loguetown** — Buggy, Alvida, Smoker
3. **Drum Island** — Wapol, Dalton
4. **Alabasta & Baroque Works** — Ace, Mr. 5, Miss Valentine, Mr. 3, Nico Robin, Sir Crocodile, Vivi

### Devil Fruits

13 Devil Fruits documented with full descriptions, types, users, and visual representations.

---

## 🔧 Technical Details

### Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS 13+, Android 10+)

### Performance

- **Zero external dependencies** (except Google Fonts)
- **CSS-only animations** where possible
- **Efficient DOM updates** via event delegation
- **Lazy loading** for images (when used)

### Accessibility

- ✅ Keyboard navigation
- ✅ Reduced motion support
- ✅ Semantic HTML structure
- ✅ ARIA labels on interactive elements

---

## 📈 Future Enhancements

### Planned Features

- [ ] **Episode markers** — filter characters by episode appearance
- [ ] **Relationships graph** — visual connection between characters
- [ ] **Voice actor credits** — add seiyuu information
- [ ] **Quote database** — memorable lines from each character
- [ ] **Arc timeline** — chronological story progression

### Data Expansion

- [ ] **Skypiea Saga** — Enel, Wyper, God's Guards
- [ ] **Water 7 Saga** — Franky, Iceburg, Galley-La
- [ ] **Thriller Bark** — Moria, Oars, Brook
- [ ] **Marineford** — Whitebeard, Admirals, Warlords

---

## 🤝 Contributing

This project is open for contributions! If you want to add characters, fix bugs, or improve the design:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

### Adding New Characters

Simply add a new character object to the appropriate group in `data.js` following the schema above.

### Adding New Groups

Create a new group object in the `groups` array with an `id`, `title`, `tagline`, and `characters` array.

---

## 📜 License

This project is created by **Libertas** 🕊️ for the One Piece community.

**All rights reserved.**

---

## 🙏 Acknowledgments

- **Eiichiro Oda** — Creator of One Piece
- **Toei Animation** — For bringing the Straw Hats to life
- **One Piece Wiki** — For comprehensive episode information
- **Google Fonts** — For Pirata One, Spectral, and IBM Plex Mono

---

## 📬 Contact

**Built with ❤️ by Libertas**

*One Piece belongs to Eiichiro Oda and Toei Animation. This is a fan-made project for educational and entertainment purposes.*

---

**⚓ Set sail for the Grand Line! ⚓**