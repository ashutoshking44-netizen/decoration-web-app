# Application Assets

Store application media, vector icons, sample photos, and branding graphics in this directory.

---

## Directory Organization

- `images/`: High-resolution marketing images, stage decoration reference photos, banners, and backdrops.
- `icons/`: Custom SVG icons, symbols, and UI graphics.
- `placeholders/`: Fallback images and loading placeholders.

---

## How to Import in Code

### In TypeScript / React components:

```tsx
import logo from "@/assets/images/logo.png";
import stageGraphic from "@/assets/images/stage-placeholder.webp";

export function Header() {
  return <img src={logo} alt="Company Logo" className="h-10 w-auto" />;
}
```

### Static Public Assets:

For files that should be served directly at `/assets/...` without bundling through Vite, place them in `public/assets/`.
