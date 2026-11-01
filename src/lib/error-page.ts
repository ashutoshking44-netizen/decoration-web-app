export function renderErrorPage(
  status = 500,
  title = "Something went wrong",
  message = "An unexpected error occurred while processing your request. Please try again or head back home."
): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${status} - ${title} | Everest Events & Decor</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      :root {
        --brand: #ef5b78;
        --soft: #fde7ed;
        --ink: #1d1a1c;
        --mute: #6b6b6b;
        --bg: #fffafb;
        --line: #f0e9ea;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Poppins', system-ui, -apple-system, sans-serif;
        background: var(--bg);
        color: var(--ink);
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        overflow-x: hidden;
      }
      header {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: clamp(24px, 4vh, 44px) 16px 8px;
        position: relative;
        z-index: 10;
      }
      .logo {
        display: inline-flex;
        align-items: center;
        gap: 14px;
        text-decoration: none;
        color: #1d1a1c;
      }
      .logo-text {
        font-size: 25px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      main {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: clamp(16px, 2.5vh, 36px) clamp(24px, 5vw, 64px);
        max-width: 1380px;
        width: 100%;
        margin: 0 auto;
        position: relative;
        z-index: 1;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
        gap: clamp(36px, 6vw, 76px);
        align-items: center;
        width: 100%;
      }
      .code-wrap {
        position: relative;
        display: inline-block;
        width: fit-content;
      }
      .code {
        position: relative;
        z-index: 1;
        font-size: clamp(112px, 14vw, 172px);
        font-weight: 800;
        line-height: 0.9;
        color: #1d1a1c;
        letter-spacing: -0.04em;
      }
      .sparkle {
        position: absolute;
        top: -12px;
        right: -28px;
        display: flex;
        gap: 4.5px;
        z-index: 2;
      }
      .sparkle span {
        display: inline-block;
        width: 4px;
        background: #ef5b78;
        border-radius: 2px;
      }
      .title {
        font-size: clamp(34px, 4.5vw, 50px);
        font-weight: 700;
        color: #1d1a1c;
        margin: 6px 0 0;
        line-height: 1.15;
        letter-spacing: -0.02em;
      }
      .desc {
        font-size: clamp(15px, 1.7vw, 17px);
        line-height: 1.65;
        color: #6b6b6b;
        margin: 4px 0 20px;
        max-width: 520px;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .pill-btn {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 12px 30px;
        border-radius: 9999px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        border: 1.5px solid #f3a4b5;
        background: #fff;
        color: #ef5b78;
        transition: all 0.15s ease;
      }
      .banner {
        max-width: 1180px;
        width: 100%;
        margin: 0 auto;
        padding: 0 clamp(20px, 4vw, 64px) clamp(28px, 4.5vh, 44px);
        position: relative;
        z-index: 2;
      }
      .banner-box {
        background: #ffffff;
        border: 1.5px solid #f0e9ea;
        border-radius: 24px;
        padding: 18px 36px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 18px;
        box-shadow: 0 8px 24px rgba(60, 30, 40, 0.05);
      }
      .banner-left {
        display: flex;
        align-items: center;
        gap: 16px;
        flex: 1 1 320px;
      }
      .divider {
        width: 1px;
        height: 38px;
        background: #f0e9ea;
        margin: 0 10px;
      }
      .headset-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #fde7ed;
        color: #ef5b78;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .pri-btn {
        background: #ef5b78;
        color: #ffffff;
        border-radius: 9999px;
        padding: 12px 28px;
        font-size: 13.5px;
        font-weight: 600;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 9px;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(239, 91, 120, 0.32);
      }
      .illu-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      svg { display: block; }
    </style>
  </head>
  <body>
    <header>
      <a href="/" class="logo">
        <svg width="38" height="38" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="appLogoGrad" x1="2" y1="2" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ef5b78" />
              <stop offset="100%" stopColor="#d84865" />
            </linearGradient>
          </defs>
          <path d="M 6 4 C 6 2.8 7 2 8.2 2 H 18 C 25.5 2 31.5 8 31.5 15.5 C 31.5 23 25.5 29 18 29 H 12 C 8.7 29 6 26.3 6 23 Z" fill="url(#appLogoGrad)" />
          <path d="M 13.5 8.5 H 18 C 21.8 8.5 25 11.6 25 15.5 C 25 19.4 21.8 22.5 18 22.5 H 13.5 Z" fill="#ffffff" />
          <path d="M 6 23 C 6 20 8.5 18.5 10.5 19.5 C 12.5 20.5 13 23.5 11 26 C 9 28.5 6 27.5 6 23 Z" fill="#b8304c" opacity="0.85" />
        </svg>
        <span class="logo-text">Decoration</span>
      </a>
    </header>

    <main>
      <div class="grid">
        <div>
          <div class="code-wrap">
            <svg style="position: absolute; left: -54px; top: -28px; width: 148%; height: 148%; z-index: 0; pointer-events: none;" viewBox="0 0 340 190" fill="none">
              <path d="M 15 95 C 45 42, 115 28, 180 65 C 245 102, 295 62, 325 88 C 305 145, 225 168, 150 148 C 75 128, 25 138, 15 95 Z" fill="#fde7ed" />
            </svg>
            <div class="code">${status}</div>
            <div class="sparkle">
              <span style="height: 18px; transform: rotate(-25deg);"></span>
              <span style="height: 23px; transform: rotate(10deg); margin-top: -5px;"></span>
              <span style="height: 16px; transform: rotate(35deg);"></span>
            </div>
          </div>
          <h1 class="title">${title}</h1>
          <p class="desc">${message}</p>
          <div class="actions">
            <button class="pill-btn" onclick="location.reload()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef5b78" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Try Again
            </button>
            <a href="/" class="pill-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef5b78" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Go Home
            </a>
          </div>
        </div>

        <div class="illu-wrap">
          <svg width="520" height="380" viewBox="0 0 570 420" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="310" cy="375" rx="220" ry="15" fill="#f5ebee" opacity="0.9"/>
            <path d="M 90 155 C 90 142 102 132 115 132 C 123 122 140 120 150 130 C 162 130 172 140 172 155 C 172 165 162 170 150 170 L 105 170 C 95 170 90 165 90 155 Z" fill="#fde7ed"/>
            <path d="M 450 155 C 450 142 462 132 475 132 C 485 122 502 122 512 132 C 525 132 535 142 535 155 C 535 165 525 170 512 170 L 465 170 C 455 170 450 165 450 155 Z" fill="#fde7ed"/>
            <path d="M 395 120 C 375 65 435 55 422 100 C 412 145 455 140 488 92" fill="none" stroke="#f3a4b5" stroke-width="2.2" stroke-dasharray="4 4" stroke-linecap="round"/>
            <g transform="translate(488, 82) rotate(22)">
              <path d="M 0 24 L 46 0 L 26 34 L 18 21 Z" fill="#ff708d"/>
              <path d="M 46 0 L 18 21 L 0 24 Z" fill="#d84865"/>
            </g>
            <g>
              <path d="M 98 370 Q 86 280 78 190" stroke="#d84865" stroke-width="3" fill="none" stroke-linecap="round"/>
              <path d="M 78 190 C 72 172 82 160 88 165 C 92 172 86 185 78 190 Z" fill="#ef5b78"/>
              <path d="M 77 205 C 56 195 50 206 54 214 C 62 222 73 214 77 205 Z" fill="#d84865"/>
              <path d="M 80 215 C 98 206 106 216 102 224 C 94 232 84 224 80 215 Z" fill="#f78da2"/>
              <path d="M 80 245 C 54 235 48 248 53 258 C 63 268 76 256 80 245 Z" fill="#f78da2"/>
              <path d="M 83 255 C 105 244 114 256 110 266 C 100 276 88 266 83 255 Z" fill="#d84865"/>
              <path d="M 84 290 C 58 280 50 294 56 304 C 68 314 80 302 84 290 Z" fill="#d84865"/>
              <path d="M 88 300 C 112 288 122 302 116 312 C 105 324 93 312 88 300 Z" fill="#fbaec0"/>
              <path d="M 89 335 C 64 326 58 340 65 350 C 77 360 86 346 89 335 Z" fill="#ef5b78"/>
              <path d="M 94 345 C 118 334 126 348 120 358 C 110 368 98 356 94 345 Z" fill="#d84865"/>
              <path d="M 98 370 C 80 365 72 380 84 388 C 96 394 102 380 98 370 Z" fill="#b8304c"/>
            </g>
            <g>
              <path d="M 400 355 C 460 330 505 255 515 178 C 475 220 440 270 400 355 Z" fill="#ef5b78"/>
              <path d="M 400 355 Q 460 270 515 178" stroke="#d84865" stroke-width="1.5" fill="none"/>
              <path d="M 410 360 C 480 350 535 300 545 235 C 495 270 450 310 410 360 Z" fill="#d84865"/>
              <path d="M 410 360 Q 480 310 545 235" stroke="#b8304c" stroke-width="1.5" fill="none"/>
              <path d="M 405 365 C 480 380 545 355 558 290 C 505 315 450 340 405 365 Z" fill="#f78da2"/>
              <path d="M 390 370 C 445 385 500 375 520 330 C 475 345 430 355 390 370 Z" fill="#b8304c"/>
              <path d="M 395 372 C 430 395 480 390 495 360 C 460 365 425 365 395 372 Z" fill="#992038"/>
            </g>
            <g transform="translate(145, 140) rotate(-5)">
              <rect x="0" y="0" width="285" height="200" rx="16" fill="#ffffff" stroke="#f0e9ea" stroke-width="2"/>
              <path d="M 0 16 Q 0 0 16 0 L 269 0 Q 285 0 285 16 L 285 48 L 0 48 Z" fill="#ef5b78"/>
              <circle cx="22" cy="24" r="4.2" fill="#ffffff"/>
              <circle cx="36" cy="24" r="4.2" fill="#ffffff"/>
              <circle cx="50" cy="24" r="4.2" fill="#ffffff"/>
              <rect x="25" y="72" width="145" height="18" rx="9" fill="#fde7ed"/>
              <rect x="25" y="108" width="210" height="18" rx="9" fill="#fde7ed"/>
              <rect x="25" y="144" width="100" height="16" rx="8" fill="#fff5f7"/>
            </g>
            <g transform="translate(360, 245)">
              <rect x="44" y="44" width="24" height="70" rx="12" transform="rotate(-45 44 44)" fill="#1d1a1c"/>
              <circle cx="0" cy="0" r="70" fill="#ffffff" stroke="#1d1a1c" stroke-width="11"/>
              <circle cx="-19" cy="-14" r="5.5" fill="#1d1a1c"/>
              <circle cx="19" cy="-14" r="5.5" fill="#1d1a1c"/>
              <path d="M -22 24 Q 0 4 22 24" fill="none" stroke="#1d1a1c" stroke-width="4.5" stroke-linecap="round"/>
            </g>
          </svg>
        </div>
      </div>
    </main>

    <footer class="banner">
      <div class="banner-box">
        <div class="banner-left">
          <div class="headset-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef5b78" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
            </svg>
          </div>
          <div>
            <strong style="display:block; font-size:15.5px; font-weight:700; color:#1d1a1c; margin-bottom:2px;">Need Help?</strong>
            <span style="font-size:13.5px; color:#6b6b6b;">Contact our support team for assistance.</span>
          </div>
        </div>
        <div class="divider"></div>
        <a href="tel:9828223787" class="pri-btn">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
          Contact Support
        </a>
      </div>
    </footer>

    <div style="position: absolute; bottom: 0; left: 0; right: 0; width: 100%; pointer-events: none; z-index: 0; overflow: hidden; line-height: 0;">
      <svg viewBox="0 0 1440 180" preserveAspectRatio="none" fill="none" style="width: 100%; height: clamp(110px, 16vh, 190px); display: block;">
        <path d="M 0 100 C 360 40, 720 160, 1080 80 C 1260 40, 1380 60, 1440 70 L 1440 180 L 0 180 Z" fill="#fff5f7"/>
        <path d="M 0 120 C 320 80, 640 170, 960 110 C 1200 65, 1360 110, 1440 125 L 1440 180 L 0 180 Z" fill="#fde7ed"/>
        <path d="M 0 145 C 400 125, 750 180, 1100 135 C 1280 110, 1390 145, 1440 150 L 1440 180 L 0 180 Z" fill="#fad5df"/>
      </svg>
    </div>
  </body>
</html>`;
}
