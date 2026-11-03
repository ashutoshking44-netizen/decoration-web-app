import type { IllustrationVariant } from "./error-definitions";

interface ErrorIllustrationProps {
  variant?: IllustrationVariant;
}

export function ErrorIllustration({ variant = "notFound" }: ErrorIllustrationProps) {
  // Center coordinates for magnifying glass
  const magX = 360;
  const magY = 245;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 580,
        margin: "0 auto",
        position: "relative",
      }}
    >
      <svg
        viewBox="0 0 570 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: "100%",
          height: "auto",
          overflow: "visible",
          display: "block",
        }}
      >
        <defs>
          {/* Soft shadow for the entire card and magnifying glass */}
          <filter id="softCardShadow" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow
              dx="0"
              dy="14"
              stdDeviation="16"
              floodColor="#1d1a1c"
              floodOpacity="0.08"
            />
          </filter>
          <filter id="glassShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="4"
              dy="14"
              stdDeviation="12"
              floodColor="#1d1a1c"
              floodOpacity="0.18"
            />
          </filter>

          {/* Airplane shadow */}
          <filter id="planeShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="2" dy="5" stdDeviation="4" floodColor="#ef5b78" floodOpacity="0.25" />
          </filter>

          {/* Gradients */}
          <linearGradient
            id="browserBarGrad"
            x1="0"
            y1="0"
            x2="300"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ef5b78" />
            <stop offset="100%" stopColor="#d84865" />
          </linearGradient>

          <linearGradient
            id="planeWing1"
            x1="0"
            y1="0"
            x2="44"
            y2="30"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ff708d" />
            <stop offset="100%" stopColor="#ef5b78" />
          </linearGradient>
          <linearGradient
            id="planeWing2"
            x1="0"
            y1="0"
            x2="44"
            y2="30"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#d84865" />
            <stop offset="100%" stopColor="#b8304c" />
          </linearGradient>
        </defs>

        {/* 1. Ground Shadow Oval */}
        <ellipse cx="310" cy="375" rx="220" ry="15" fill="#f5ebee" opacity="0.9" />

        {/* 2. Soft Background Blush Clouds */}
        {/* Upper Left Cloud */}
        <path
          d="M 90 155 C 90 142 102 132 115 132 C 123 122 140 120 150 130 C 162 130 172 140 172 155 C 172 165 162 170 150 170 L 105 170 C 95 170 90 165 90 155 Z"
          fill="#fde7ed"
        />
        {/* Upper Right Cloud */}
        <path
          d="M 450 155 C 450 142 462 132 475 132 C 485 122 502 122 512 132 C 525 132 535 142 535 155 C 535 165 525 170 512 170 L 465 170 C 455 170 450 165 450 155 Z"
          fill="#fde7ed"
        />

        {/* 3. Paper Airplane Flight Path (Dashed Loop Curve) */}
        <path
          d="M 395 120 C 375 65 435 55 422 100 C 412 145 455 140 488 92"
          fill="none"
          stroke="#f3a4b5"
          strokeWidth="2.2"
          strokeDasharray="4 4"
          strokeLinecap="round"
        />

        {/* 4. Folded Origami Paper Airplane in Brand Rose */}
        <g transform="translate(488, 82) rotate(22)" filter="url(#planeShadow)">
          <path d="M 0 24 L 46 0 L 26 34 L 18 21 Z" fill="url(#planeWing1)" />
          <path d="M 46 0 L 18 21 L 0 24 Z" fill="url(#planeWing2)" />
          <path d="M 18 21 L 26 34 L 23 23 Z" fill="#992038" />
        </g>

        {/* 5. Botanical Leaves ON THE LEFT (Delicate Rose Flora Branch) */}
        <g>
          {/* Main Stem */}
          <path
            d="M 98 370 Q 86 280 78 190"
            stroke="#d84865"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />

          {/* Top Terminal Leaf */}
          <path d="M 78 190 C 72 172 82 160 88 165 C 92 172 86 185 78 190 Z" fill="#ef5b78" />

          {/* Pair 1 */}
          <path d="M 77 205 C 56 195 50 206 54 214 C 62 222 73 214 77 205 Z" fill="#d84865" />
          <path d="M 80 215 C 98 206 106 216 102 224 C 94 232 84 224 80 215 Z" fill="#f78da2" />

          {/* Pair 2 */}
          <path d="M 80 245 C 54 235 48 248 53 258 C 63 268 76 256 80 245 Z" fill="#f78da2" />
          <path d="M 83 255 C 105 244 114 256 110 266 C 100 276 88 266 83 255 Z" fill="#d84865" />

          {/* Pair 3 */}
          <path d="M 84 290 C 58 280 50 294 56 304 C 68 314 80 302 84 290 Z" fill="#d84865" />
          <path d="M 88 300 C 112 288 122 302 116 312 C 105 324 93 312 88 300 Z" fill="#fbaec0" />

          {/* Pair 4 */}
          <path d="M 89 335 C 64 326 58 340 65 350 C 77 360 86 346 89 335 Z" fill="#ef5b78" />
          <path d="M 94 345 C 118 334 126 348 120 358 C 110 368 98 356 94 345 Z" fill="#d84865" />

          {/* Base Foliage Leaf */}
          <path d="M 98 370 C 80 365 72 380 84 388 C 96 394 102 380 98 370 Z" fill="#b8304c" />
        </g>

        {/* 6. Botanical Leaves ON THE RIGHT (Lush Rose Floral Fronds) */}
        <g>
          {/* Far Right Tall Leaf - Pointing Up-Right */}
          <path
            d="M 400 355 C 460 330 505 255 515 178 C 475 220 440 270 400 355 Z"
            fill="#ef5b78"
          />
          {/* Central Vein on Tall Leaf */}
          <path d="M 400 355 Q 460 270 515 178" stroke="#d84865" strokeWidth="1.5" fill="none" />

          {/* Upper Secondary Leaf */}
          <path
            d="M 410 360 C 480 350 535 300 545 235 C 495 270 450 310 410 360 Z"
            fill="#d84865"
          />
          {/* Vein */}
          <path d="M 410 360 Q 480 310 545 235" stroke="#b8304c" strokeWidth="1.5" fill="none" />

          {/* Middle Outer Leaf - Pointing Right */}
          <path
            d="M 405 365 C 480 380 545 355 558 290 C 505 315 450 340 405 365 Z"
            fill="#f78da2"
          />

          {/* Lower Base Leaf */}
          <path
            d="M 390 370 C 445 385 500 375 520 330 C 475 345 430 355 390 370 Z"
            fill="#b8304c"
          />

          {/* Ground bush leaf */}
          <path
            d="M 395 372 C 430 395 480 390 495 360 C 460 365 425 365 395 372 Z"
            fill="#992038"
          />
        </g>

        {/* 7. Browser Window Card (Tilted -5 degrees) */}
        <g transform="translate(145, 140) rotate(-5)" filter="url(#softCardShadow)">
          {/* Card Body */}
          <rect
            x="0"
            y="0"
            width="285"
            height="200"
            rx="16"
            fill="#ffffff"
            stroke="#f0e9ea"
            strokeWidth="2"
          />

          {/* Top Bar (Solid Rose Gradient) */}
          <path
            d="M 0 16 Q 0 0 16 0 L 269 0 Q 285 0 285 16 L 285 48 L 0 48 Z"
            fill="url(#browserBarGrad)"
          />

          {/* Three White Window Dots */}
          <circle cx="22" cy="24" r="4.2" fill="#ffffff" />
          <circle cx="36" cy="24" r="4.2" fill="#ffffff" />
          <circle cx="50" cy="24" r="4.2" fill="#ffffff" />

          {/* Content Wireframe Bars */}
          <rect x="25" y="72" width="145" height="18" rx="9" fill="#fde7ed" />
          <rect x="25" y="108" width="210" height="18" rx="9" fill="#fde7ed" />
          <rect x="25" y="144" width="100" height="16" rx="8" fill="#fff5f7" />
        </g>

        {/* 8. Magnifying Glass in Front */}
        <g filter="url(#glassShadow)">
          {/* Sturdy Handle Angled Down-Right (~45 degrees) */}
          <g transform={`translate(${magX}, ${magY})`}>
            {/* Deep Ink Angled Handle */}
            <rect
              x="44"
              y="44"
              width="24"
              height="70"
              rx="12"
              transform="rotate(-45 44 44)"
              fill="#1d1a1c"
            />
            {/* Handle subtle edge highlight */}
            <rect
              x="48"
              y="48"
              width="6"
              height="54"
              rx="3"
              transform="rotate(-45 44 44)"
              fill="#3a3538"
              opacity="0.35"
            />
          </g>

          {/* Outer Lens Frame (Thick Deep Ink Ring) */}
          <circle cx={magX} cy={magY} r="70" fill="#ffffff" stroke="#1d1a1c" strokeWidth="11" />

          {/* Contextual Face / Icon inside Lens */}
          {variant === "notFound" && (
            <g>
              {/* Left Eye */}
              <circle cx={magX - 19} cy={magY - 14} r="5.5" fill="#1d1a1c" />
              {/* Right Eye */}
              <circle cx={magX + 19} cy={magY - 14} r="5.5" fill="#1d1a1c" />
              {/* Sad Frown Curved Mouth */}
              <path
                d={`M ${magX - 22} ${magY + 24} Q ${magX} ${magY + 4} ${magX + 22} ${magY + 24}`}
                fill="none"
                stroke="#1d1a1c"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
            </g>
          )}

          {(variant === "unauthorized" || variant === "forbidden") && (
            <g transform={`translate(${magX}, ${magY})`}>
              <rect x="-18" y="-4" width="36" height="28" rx="6" fill="#1d1a1c" />
              <path
                d="M -12 -4 V -16 C -12 -23 12 -23 12 -16 V -4"
                fill="none"
                stroke="#1d1a1c"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              <circle cx="0" cy="8" r="3" fill="#ffffff" />
            </g>
          )}

          {variant === "timeout" && (
            <g transform={`translate(${magX}, ${magY})`}>
              <circle cx="0" cy="0" r="22" fill="none" stroke="#1d1a1c" strokeWidth="4" />
              <polyline
                points="0,-12 0,0 10,6"
                fill="none"
                stroke="#1d1a1c"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {variant === "offline" && (
            <g transform={`translate(${magX}, ${magY})`}>
              <path
                d="M -22 -10 C -12 -20 12 -20 22 -10"
                fill="none"
                stroke="#1d1a1c"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M -15 -2 C -7 -10 7 -10 15 -2"
                fill="none"
                stroke="#1d1a1c"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="0" cy="14" r="3.5" fill="#1d1a1c" />
              <line
                x1="-24"
                y1="22"
                x2="24"
                y2="-22"
                stroke="#ef4444"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </g>
          )}

          {(variant === "server" ||
            variant === "badRequest" ||
            variant === "conflict" ||
            variant === "rateLimit" ||
            variant === "generic") && (
            <g transform={`translate(${magX}, ${magY})`}>
              <path
                d="M -22 16 L 0 -22 L 22 16 Z"
                fill="none"
                stroke="#1d1a1c"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="0"
                y1="-8"
                x2="0"
                y2="4"
                stroke="#1d1a1c"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="0" cy="11" r="2.5" fill="#1d1a1c" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
