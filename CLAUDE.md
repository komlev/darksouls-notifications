# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dark Souls themed email notification browser extension for Gmail. When a user sends an email through Gmail, the extension displays a Dark Souls-style "EMAIL SENT" notification with glow effects and plays a sound effect.

## Architecture

This is a multi-browser extension project that supports both Chrome (Manifest V3) and Firefox (Manifest V2). The project uses a shared codebase with browser-specific manifest files and icons.

### Key Components

- **script.js**: Main content script that runs on Gmail. Polls DOM for `#link_vsm` element (Gmail's email sent indicator), then displays the Dark Souls notification overlay with animations and sound.
- **style.css**: Contains Dark Souls themed styles using the OptimusPrinceps font, includes animation definitions for glow effects and fade transitions.
- **chrome/**: Chrome-specific files (manifest.json using v3, icon.png)
- **firefox/**: Firefox-specific files (manifest.json using v2, icon-48.png, icon-96.png)
- **scripts/pack.js**: Build script that creates distributable extensions by copying shared files + browser-specific files into a temp directory, zipping them, and placing the result in dist/

### Build System

The pack script creates browser-specific extension packages by:
1. Creating a temporary directory
2. Copying shared files (OptimusPrinceps.ttf, script.js, sound.mp3, style.css)
3. Copying browser-specific files (manifest.json and icons)
4. Zipping everything together
5. Moving the final package to dist/ (chrome.zip or firefox.xpi)
6. Cleaning up temporary files

## Common Commands

```bash
# Build Chrome extension (creates dist/chrome.zip)
npm run pack:chrome

# Build Firefox extension (creates dist/firefox.xpi)
npm run pack:firefox
```

Note: Chrome requires additional manual packing through chrome://extensions/ "Pack Extension" command. Unpack the chrome.zip from dist/ first, then pack it with Chrome.

## Known Issues

- Chrome extension needs manual repacking after build due to Chrome's extension signing requirements
