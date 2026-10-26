# Official Apple iOS Liquid Glass Icon Suite — Decoration

This folder contains the complete, official Apple **Icon Composer** document suite and exported high-resolution app icon assets for the **Decoration** application.

---

## 🎨 Native Apple Icon Composer Packages (`.icon`)

These are native Apple Icon Composer documents designed with Apple's **Design Generation 27** specifications (iOS 18+ / macOS Sequoia+), utilizing multi-group Liquid Glass 3D materials, Fresnel specular reflections, and realistic light refraction:

1. **`Decoration.icon`** *(Primary — Warm Luxury Champagne & Pearl Ivory)*
   - A copy is also conveniently placed on your Desktop: `~/Desktop/Decoration.icon`.
   - Double-click to open directly in **Icon Composer.app**.
2. **`Decoration-Obsidian.icon`** *(Dark Mode — Smoked Obsidian Titanium & Glowing Glass)*
   - Ultra-sleek dark edition with radiant tinted glass highlights.
3. **`Decoration-StudioPearl.icon`** *(Minimalist Studio Porcelain)*
   - Clean, minimalist aesthetic with crisp Apple studio lighting.

### 🛠️ Interactive Layer & Group Architecture

Inside **Icon Composer**, every element is an independent, high-resolution vector SVG organized into 4 semantic groups. You can select, recolor, reposition, scale, or customize the glass refraction of any individual element:

- **Group 1: House Architecture**
  - `house_frame.svg`: Roof gable beam and vertical wall frame
  - `windows.svg`: 4-pane architectural window with smooth rounded corners
  - `swoosh.svg`: Foundation ribbon wave
- **Group 2: Pendant Lamp**
  - `lamp.svg`: Suspension cord, fixture collar, bell dome shade, and light bulb
- **Group 3: Floral Blossom**
  - `petals.svg`: Elegant rose quartz blooming petals
- **Group 4: Botanical Leaves**
  - `leaves.svg`: Sage olive botanical leaves

---

## 📁 Exported High-Resolution Assets (`icon/exports/`)

Pre-rendered from Icon Composer at master Retina resolution with zero pixelation or blur:

| File | Resolution | Description |
| :--- | :--- | :--- |
| `AppIcon-1024.png` | 1024 × 1024 | Primary iOS App Icon with official superellipse squircle mask |
| `AppIcon-Dark-1024.png` | 1024 × 1024 | Official iOS Dark Mode edition |
| `AppIcon-Pearl-1024.png` | 1024 × 1024 | Studio Pearl Porcelain edition |
| `AppIcon-Tinted-1024.png` | 1024 × 1024 | Monochromatic adaptive tinted edition for iOS customizable home screens |
| `AppIcon-Square-1024.png` | 1024 × 1024 | Full-bleed square (App Store & Xcode asset catalogs) |
| `AppIcon-Square-Dark-1024.png` | 1024 × 1024 | Full-bleed square Dark Mode |
| `apple-touch-icon.png` | 180 × 180 | iOS Safari Web Clip Home Screen Icon |
| `apple-touch-icon-dark.png` | 180 × 180 | Dark Mode Web Clip Icon |
| `favicon.ico` | Multi-size | Multi-resolution favicon (16×16, 32×32, 48×48) |
| `favicon-32x32.png` | 32 × 32 | High-DPI browser tab icon |
| `favicon-16x16.png` | 16 × 16 | Standard browser tab icon |

---

## 📐 Standalone Vector SVGs (`icon/svg/`)

Pure mathematical SVG vectors in `viewBox="0 0 1024 1024"` for use in Illustrator, Figma, or web styling:

- `house_frame.svg`
- `lamp.svg`
- `windows.svg`
- `swoosh.svg`
- `petals.svg`
- `leaves.svg`
- `decoration_full_vector.svg` (Full-color unified vector emblem)

---

## 🚀 How to Open & Edit in Icon Composer

1. **In Finder**: Double-click `/Users/xito/Desktop/Decoration.icon` or `icon/Decoration.icon`.
2. **In Terminal**:
   ```bash
   open -a "Icon Composer" ~/Desktop/Decoration.icon
   ```
3. In Icon Composer, you can:
   - Rotate the 3D canvas in real-time to preview dynamic lighting and reflections.
   - Click each layer in the left sidebar to tweak tint color, opacity, or glass refraction.
   - Switch renditions between Default, Dark, and Tinted.
