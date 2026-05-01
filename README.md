# darksouls-notifications

Dark Souls themed email notification extension

## Features
- Dark Souls theme for email notifications
- Supports both Chrome and Firefox browsers
- Supports Gmail, Outlook, Yahoo, ProtonMail, Yandex, Zoho
- Supports new messages, replies and forwards
- Adjustable volume control via extension settings

## How to run

1. Clone the repository: `git clone https://github.com/username/darksouls-notifications.git`
2. Install node.js on your system if it's not already installed.
3. Navigate to the project directory
4. Run `npm run pack:chrome` for chrome extension or `npm run pack:firefox` for firefox extension.
5. Extensions will be generated in the `dist` folder.

Chrome needs to pack extension separately through "Pack Extension" command on "chrome://extensions/" page.
Just unpack chrome.zip from dist folder and pack it with chrome.

## Settings

To adjust the volume:
1. **Quick access**: Left-click the extension icon to open the volume control popup
2. **Full settings**: Right-click the extension icon and select "Options" (Chrome) or "Preferences" (Firefox)
3. Adjust the volume slider to your preferred level (0-100%)
4. Click "Test Sound" to preview the volume
5. Settings are automatically saved and synced across your browser
