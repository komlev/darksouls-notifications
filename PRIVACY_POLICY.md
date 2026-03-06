# Privacy Policy

**Last updated: March 4, 2026**

## Overview

Dark Souls Notifications is designed with privacy in mind. We do not collect, store, transmit, or share any personal data.

## What the Extension Does

The Extension monitors network requests made by your browser on supported email provider pages (Gmail, Outlook, Yahoo Mail, ProtonMail, Yandex Mail) to detect when you send an email. When a send action is detected, it triggers a local visual overlay and sound effect in your browser tab.

## Data Collection

**We collect no data.** Specifically:

- **Email content**: The Extension inspects outgoing request metadata locally in your browser to detect send actions. This data is never stored, logged, or transmitted anywhere.
- **Personal information**: No names, email addresses, or account information are accessed or stored.
- **Browsing history**: The Extension does not track or record the websites you visit.
- **Analytics**: No usage analytics or telemetry are collected.

## Local Storage

The Extension stores only one setting locally using your browser's built-in API:

- **Volume level** (a number from 0 to 100): Your preferred notification sound volume.

This setting is synced across your browser profile by your browser (not by us) and is never sent to any external server.

## Permissions

The Extension requires the following browser permissions:

| Permission | Reason |
|---|---|
| `webRequest` | To detect when an email send request is made |
| `storage` | To save your volume preference |
| Access to Gmail, Outlook, Yahoo, ProtonMail, Yandex Mail URLs | To listen for send actions on supported email providers only |

No permission is used beyond its stated purpose.

## Third Parties

The Extension does not communicate with any third-party servers. It has no backend, no telemetry, and no external dependencies at runtime.

## Changes to This Policy

If this policy changes, the updated version will be published in the repository. Continued use of the Extension after changes constitutes acceptance of the updated policy.

## Contact

If you have questions about this privacy policy, please open an issue on the GitHub repository.
