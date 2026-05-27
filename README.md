# sound-balance-electron

A desktop application built with **Electron**, **React**, and **TypeScript** for normalizing and processing audio files. It provides a graphical interface to configure and run FFmpeg-based audio filters on your music collection.

## Features

- **Audio Normalization** – Supports loudnorm and a wide range of FFmpeg audio filters.
- **Per‑filter Options** – Each filter comes with its own set of configurable parameters (threshold, ratio, attack, release, etc.) exposed through a dynamic UI.
- **Audio Codec Selection** – Choose from a comprehensive list of output codecs (AAC, MP3, FLAC, Opus, PCM, and many more) with encoder‑specific options.
- **Batch Processing** – Add entire folders of audio files, manage them in collections, and process multiple tracks concurrently.
- **Track Management** – View detailed metadata for each track, select which tracks to process, and see real‑time processing status.
- **Collections** – Organize your tracks into collections for easier batch management.
- **Persistent Settings** – All settings are stored locally and restored between sessions.
- **Concurrency Control** – Adjust the number of parallel FFmpeg processes to optimize performance.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or later)
- npm (comes with Node.js)
- [FFmpeg](https://ffmpeg.org/download.html) (the app bundles `ffmpeg-static`, but you may need it on your PATH for some features)

### Installation

```bash
# Clone the repository
git clone https://github.com/allpavel/sound-balance-electron.git
cd sound-balance-electron

# Install dependencies
npm install
```

### Development

```bash
npm run dev
```

This starts the Electron app in development mode with hot‑reloading for the renderer.

### Type Checking

```bash
npm run typecheck        # Run both Node and web type checks
npm run typecheck:node   # Check main + preload types
npm run typecheck:web    # Check renderer types
```

### Building

```bash
# For Windows
npm run build:win

# For macOS
npm run build:mac

# For Linux
npm run build:linux

# Or build unpacked for testing
npm run build:unpack
```

The distributable packages will be placed in the `dist/` folder.

## Usage

1. **Launch the application** – After building or running in dev mode, the main window will open.
2. **Add audio files** – Click the "Add" button to import audio files or folders.
3. **Organize with collections** – Create collections to group related tracks together.
4. **Configure settings** – Open the settings panel to:
   - Choose an **output directory** for processed files.
   - Select an **audio filter** and adjust its parameters.
   - Pick an **audio codec** and fine‑tune encoder options.
   - Set the **concurrency** level (number of parallel FFmpeg processes).
5. **Select tracks** – Use the checkboxes to select which tracks to process, or use the global filter to narrow down the list.
6. **Start processing** – Click the "Run" button. You can monitor the progress in real time and stop processing at any point.
7. **Review results** – After processing, a summary modal shows the number of successful and failed tracks.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Make your changes and ensure the code passes type checks and linting.
4. Write meaningful commit messages following the [Conventional Commits](https://www.conventionalcommits.org/) specification (the project uses Commitizen and Commitlint).
5. Open a pull request against the main branch.

## Feature Requests

Feature requests are welcome! Describe:

- The motivation behind the feature.
- How it would work from a user’s perspective.
- Any technical constraints or considerations you foresee.

## Acknowledgements

- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [Mantine](https://mantine.dev/)
- [FFmpeg](https://ffmpeg.org/)
- [electron-vite](https://electron-vite.org/)
