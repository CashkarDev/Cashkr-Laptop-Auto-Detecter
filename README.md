# Cashkr Hardware Detector

An Electron desktop application that automatically detects laptop hardware specifications and uploads them to the Cashkr platform for instant device valuation.

## Features

- Detects hardware specs: Model, CPU, RAM, Storage, GPU
- Secure pairing via 6-digit code from Cashkr website
- Code-signed Windows builds (NSIS installer)
- Auto-update via GitHub Releases (electron-updater)

## Tech Stack

- **Electron** — Desktop framework
- **TypeScript** — Language
- **electron-builder** — Build & packaging
- **electron-updater** — Auto-update from GitHub Releases

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm start
```

## Build

| Command | Description |
|---|---|
| `pnpm run build:win` | Windows build |
| `pnpm run build:mac` | Mac build |
| `pnpm run build:win:stage` | Windows build (staging API) |
| `pnpm run build:win:prod` | Windows build (production API) |

## Publish (Build + GitHub Release)

Requires `GH_TOKEN` environment variable:

```bash
export GH_TOKEN=your_github_token
```

| Command | Description |
|---|---|
| `pnpm run publish:win` | Windows publish (default API) |
| `pnpm run publish:win:stage` | Windows publish (staging API) |
| `pnpm run publish:win:prod` | Windows publish (production API) |
| `pnpm run publish:mac` | Mac publish |

## Auto-Update Flow

1. App starts and checks for updates from GitHub Releases
2. If update available, a full-screen overlay blocks the UI
3. Download progress is shown with a progress bar
4. After download, app auto-restarts with the new version

## Project Structure

```
src/
  main.ts            — Electron main process + auto-updater
  preload.ts         — Secure IPC bridge (contextBridge)
  renderer.ts        — UI logic + update overlay handler
  hardwareDetection.ts — System hardware detection
index.html           — Main UI
styles.css           — Styling
```
