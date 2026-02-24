# Google Drive Integration Guide

## Purpose
Sync your design images and fabric photos directly from Google Drive to the Fabric Master system without manual uploading.

## Setup Instructions
1. Navigate to **Admin > Settings > Google Drive**.
2. Click **Connect Google Drive**.
3. A popup will ask you to sign in with your Google Workspace account.
4. Grant permission to view files.

## Configuration
- **Root Folder**: Select the folder where your inventory is stored (e.g., "Shree Rang Trendz").
- **Auto-Sync**: Enable this to check for new files every hour/day.
- **Structure**: The system expects folders to be organized as: `Category > Type > Design`.

## FAQ
**Q: Does it delete files from Drive?**
A: No, the integration only *reads* files. It never deletes anything from your Google Drive.

**Q: Can I use a personal Gmail account?**
A: Yes, but a Google Workspace account is recommended for higher API limits.