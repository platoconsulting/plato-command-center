# Plato Command Center

Plato Consulting LLC's agent command center. A pixel-art space station where ten AI agents carry client deliverables down a delivery line: Intake, Research Lab, Analysis Bay, Writers' Room, QA Deck, Client Dock.

**Status: demo mode.** Agents, log lines, and deliverable outlines are simulated. No API calls, no cost.

## Run it

Double-click `index.html`. No install or build step.

## What's on screen

- **Station map**: click an agent to open their file. Crates are color coded by deliverable type.
- **Send it a job**: pick a deliverable, type a client and a brief, and it goes down the line. Autopilot keeps sample jobs coming.
- **Line log**: every step each agent takes.
- **Agent rankings**: S to C tiers by average QA score, updated as jobs finish.
- **Client dock**: shipped deliverables. Click one to preview the outline or download it as Markdown.

## Files

- `index.html`: page layout
- `styles.css`: look and feel
- `data.js`: agents, deliverable types and their sections, log lines, sample clients. Edit this to change content.
- `app.js`: the simulation and the pixel map

## Test switch

`index.html#ff=180` fast-forwards 180 seconds of line time on load. Add `&doc` to open the newest deliverable.

## Next: live mode

Replace the simulated stage work with Claude calls, one per station, passing each stage's output to the next. That needs a small backend so the API key never reaches the browser.
