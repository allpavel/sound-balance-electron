# Contributing to sound-balance-electron

Thank you for your interest in contributing! This document provides guidelines and workflows to help you get started.

## Table of Contents

- [Contributing to sound-balance-electron](#contributing-to-sound-balance-electron)
  - [Table of Contents](#table-of-contents)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Setup](#setup)
  - [Development Workflow](#development-workflow)
  - [Commit Conventions](#commit-conventions)
  - [Code Style](#code-style)
  - [Pull Request Process](#pull-request-process)
  - [Reporting Bugs](#reporting-bugs)
  - [Feature Requests](#feature-requests)

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm (comes with Node)
- Git

### Setup

1. **Fork** the repository and clone your fork:

```bash
git clone https://github.com/<your-username>/sound-balance-electron.git
cd sound-balance-electron
```

1. **Install dependencies:**

```bash
npm install
```

1. **Start the development environment:**

```bash
   npm run dev
```

This launches the Electron app with hot‑reloading for the renderer process.

## Development Workflow

- Create a new branch from main for each feature or bugfix.
- Make your changes and ensure the code passes type checks and linting.
- [Lefthook](https://github.com/evilmartians/lefthook) runs pre‑commit hooks automatically. This will check formatting, lint your code, and validate commit messages.
- Always run `npm run typecheck` (or `npm run typecheck:node` / `npm run typecheck:web` for specific targets) before pushing.

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) to keep history clean and enable automated changelogs.

**Format:** `<type>(<scope>): <description>`

**Allowed types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`

Examples:

- `feat(audio): add support for crystalizer filter`
- `fix(ui): resolve track selection reset after processing`
- `docs(readme): update installation instructions`

To make this easier, the project includes [Commitizen](https://commitizen.github.io/cz-cli/). This will launch an interactive prompt that builds a valid commit message.

Commit messages will also be checked automatically by Lefthook using [commitlint](https://commitlint.js.org/).

## Code Style

Biome is the single source of truth for both formatting and linting. Configuration is in biome.json.

- **Formatting:** Indentation 2 spaces, single quotes, trailing commas, etc. are handled by Biome.
- **Linting:** Biome lints TypeScript/JavaScript and React code. No additional ESLint or Prettier configurations are needed.

## Pull Request Process

1. Ensure your branch is up‑to‑date with main and all conflicts are resolved.
2. Verify that `npm run typecheck` passes and Biome reports no errors.
3. Push your branch and open a Pull Request against the main branch.
4. In the PR description, clearly explain:
   - What problem is solved or feature added.
   - Any relevant screenshots or recordings for UI changes.
   - How to test the changes.
5. A maintainer will review your submission. Be open to feedback and iterate if needed.

## Reporting Bugs

Use the GitHub [Issues](https://github.com/allpavel/sound-balance-electron/issues) tab to report bugs.

Please include:

- Steps to reproduce the issue.
- Expected behavior vs. actual behavior.
- Environment details: OS, Node version, Electron version (can be found in package.json), and whether you ran in dev or production mode.
- Any relevant logs or screenshots.

## Feature Requests

Feature requests are welcome! Describe:

- The motivation behind the feature.
- How it would work from a user’s perspective.
- Any technical constraints or considerations you foresee.
