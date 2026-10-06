# Decoration Portal Company Dashboard

## Goal
Build a polished `/company` home dashboard that follows the supplied Decoration Portal specification, using typed mock data and the existing project primitives.

## Implementation
- Define the complete rose, canvas, surface, border, typography, shadow, and spacing system in the global design tokens, with Cormorant Garamond and DM Sans loaded from the document head.
- Add a reusable company shell with the fixed, collapsible sidebar; exact grouped navigation; conditional company switcher; footer branding; and mobile-safe behavior.
- Create the sticky six-action home bar with permission-aware controls and notification badge.
- Build typed fixture and hook modules that isolate all dashboard data from presentation code for a future data-source swap.
- Build the four equal module cards, including the working BS/AD calendar toggle and inventory conflict state.
- Build conditional profile and staff-only section states, the Team Required month stepper and date popovers, the search overlay with click/double-space/Escape/outside-close behavior, and the independently scrolling Upcoming Functions list.
- Add stable skeleton, empty, and restricted-permission render paths without layout shift.
- Keep `/` usable by redirecting it to `/company`.

## Verification
- Run focused type/build checks through the project harness.
- Exercise sidebar collapse, calendar toggle, month controls, role popovers, search keyboard behavior, and expandable function details in the browser.
- Capture desktop and narrow viewport screenshots, plus a loading-state screenshot.
- Verify metadata for every content route.
- Search the finished source for every prohibited module term and confirm no matches.
