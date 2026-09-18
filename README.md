# PlatePing

PlatePing — check vanity license plate availability by state.

**Live demo:** [https://plateping-eight.vercel.app/](https://plateping-eight.vercel.app/)

## Overview

Pick a U.S. state, enter a vanity plate, and see whether that configuration is usable. For New Hampshire, Florida, Ohio, and Pennsylvania, PlatePing runs a live check against each state's own public DMV availability tool. For every other state, it validates the plate against that state's known character and format rules — those states don't expose a public online availability checker, and there is no unified national API for this data.

## Why this project is interesting

- There is no public API for vanity plate availability, in any state or nationally. Live checks are done with headless browser automation (Playwright) driving each state's real public-facing form, not a documented API integration.
- Each of the four live-checked states has a completely different web form and flow, so each one needed its own automation logic, error handling, and result parsing.
- The app is explicit about its limits in the UI (a dedicated [How it works](https://plateping-eight.vercel.app/how-it-works) page) instead of pretending to have full 50-state live data it doesn't have.

## Tech stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- react-simple-maps + d3-geo (interactive US map)
- Playwright (live availability checks)
- localStorage (recent checks history)

## Features

- Live availability checking for NH, FL, OH, and PA via real-time DMV lookups
- Format / character-rule validation for all other states
- Interactive US map that zooms into the selected state
- Recent checks history (stored locally per session)
- Dark / light theme support

## Screenshots

![Home screen](./public/screenshots/home.png)

![Live check result](./public/screenshots/live-check.png)

![Recent checks](./public/screenshots/recent-checks.png)

## Getting started

```bash
git clone https://github.com/Klepdev09/Plate-Validator.git
cd Plate-Validator
npm install
npx playwright install chromium   # required for local live checks (NH, FL, OH, PA)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Known limitations

- Only four states have live checking. That reflects what those DMVs expose publicly, not an arbitrary scope cut.
- Live checks depend on each state's public tool staying structurally the same. A redesign can break that integration until the selectors / flow are updated.
- Format-checked states report validity against known rules, not real-world availability.
