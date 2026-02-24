# Google OAuth Visual Guide

This guide describes the visual elements you will encounter during the setup process to help you navigate the Google Cloud Console interface.

## 1. Google Cloud Console Header
- **Project Dropdown**: Located at the top left, next to the "Google Cloud" logo. It shows the currently selected project name. Click this to create a "New Project".

## 2. API Library Page
- **Search Bar**: Centered at the top of the main content area. Use this to type "Google Drive API".
- **Enable Button**: A prominent blue button labeled "ENABLE" usually located near the top of the API details page.

## 3. OAuth Consent Screen
- **User Type Radio Buttons**: Two large options, "Internal" and "External". "External" is the common choice for personal Gmail accounts.
- **Scopes Table**: A list showing permissions. You need to click "ADD OR REMOVE SCOPES" above this table to open a side drawer where you can search for "drive".
- **Test Users Section**: A simple list where you click "ADD USERS" to type in email addresses. This is **crucial** for testing.

## 4. Credentials Page
- **Create Credentials Button**: Located at the top bar of the main content area. Dropdown menu includes "API key", "OAuth client ID", etc.
- **Origins vs Redirect URIs**:
  - **Authorized JavaScript origins**: This is for the domain only (e.g., `http://localhost:5173`). No path allowed.
  - **Authorized redirect URIs**: This requires the full path (e.g., `http://localhost:5173/auth/google/callback`).

## 5. The "App Not Verified" Screen (During Login)
- When you first log in with a test app, Google shows a scary warning icon.
- **Advanced Link**: Small text link on the left side, usually saying "Advanced".
- **Go to ... (unsafe) Link**: After clicking Advanced, a new link appears at the bottom saying "Go to Fabric Master (unsafe)". Click this to proceed.

## 6. The Permissions Dialog
- A standard Google modal asking "Fabric Master wants access to your Google Account".
- **Checkboxes**: Ensure you check the boxes related to Google Drive access if they are presented as optional (sometimes "Select all" is needed).
- **Allow Button**: Blue button at the bottom right.