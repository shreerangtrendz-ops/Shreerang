# Google OAuth Setup Complete Guide

Follow these steps exactly to configure Google Drive integration for Fabric Master.

## STEP 1: CREATE GOOGLE CLOUD PROJECT
=====================================

1. Go to **Google Cloud Console**: [https://console.cloud.google.com](https://console.cloud.google.com)
2. Click on the project dropdown at the top left of the page (next to "Google Cloud" logo).
3. In the modal that appears, click **"NEW PROJECT"** in the top right.
4. Enter project name: `Fabric Master Google Drive`
5. For "Location" or "Organization", you can leave it as "No organization" if you are using a personal Gmail account.
6. Click **"CREATE"**.
7. Wait for the project to be created (2-3 minutes). A notification will appear when done.
8. Click the notification or use the project dropdown to **Select the new project**. Ensure the top bar shows "Fabric Master Google Drive".

## STEP 2: ENABLE GOOGLE DRIVE API
===============================

1. In Google Cloud Console, open the sidebar (hamburger menu).
2. Go to **"APIs & Services"** > **"Library"**.
3. In the search bar, type `Google Drive API`.
4. Click on the card result labeled **"Google Drive API"**.
5. Click the blue **"ENABLE"** button.
6. Wait for the API to be enabled. You will be redirected to the API overview page.

## STEP 3: CREATE OAUTH 2.0 CREDENTIALS
====================================

1. In the sidebar under "APIs & Services", click **"Credentials"**.
2. Click **"CREATE CREDENTIALS"** at the top of the page.
3. Select **"OAuth client ID"**.
4. **Important:** If you see a message saying "To create an OAuth client ID, you must first configure your consent screen", click the **"CONFIGURE CONSENT SCREEN"** button. (If not, skip to Step 5).

## STEP 4: CONFIGURE OAUTH CONSENT SCREEN
======================================

1. You will be asked to choose User Type. Select **"External"**.
   - *Note: "Internal" is only available if you are a Google Workspace user.*
2. Click **"CREATE"**.
3. **App Information**:
   - **App name**: `Fabric Master`
   - **User support email**: Select your email address from the dropdown.
   - **App logo**: (Optional) Skip this.
4. **App Domain**: Skip these fields for now.
5. **Developer Contact Information**:
   - **Email addresses**: Enter your email address again.
6. Click **"SAVE AND CONTINUE"**.
7. **Scopes**:
   - Click **"ADD OR REMOVE SCOPES"**.
   - In the filter box, search for `drive`.
   - Select the checkboxes for:
     - `https://www.googleapis.com/auth/drive` (See, edit, create, and delete all of your Google Drive files)
     - `https://www.googleapis.com/auth/drive.file` (See, edit, create, and delete only the specific Google Drive files you use with this app)
   - Click **"UPDATE"**.
   - Verify the scopes are listed in the table.
   - Click **"SAVE AND CONTINUE"**.
8. **Test Users**:
   - *This step is critical while the app is in "Testing" mode.*
   - Click **"ADD USERS"**.
   - Enter your email address (the one you will use to log in).
   - Click **"ADD"**.
   - Click **"SAVE AND CONTINUE"**.
9. **Summary**: Review your settings and click **"BACK TO DASHBOARD"**.

## STEP 5: CREATE OAUTH CLIENT ID
==============================

1. Go back to **"APIs & Services"** > **"Credentials"**.
2. Click **"CREATE CREDENTIALS"**.
3. Select **"OAuth client ID"**.
4. **Application type**: Select **"Web application"**.
5. **Name**: Enter `Fabric Master Web`.
6. **Authorized JavaScript origins**:
   - Click "ADD URI".
   - Enter: `http://localhost:5173`
   - Click "ADD URI" again (optional).
   - Enter: `http://localhost:3000` (just in case).
7. **Authorized redirect URIs**:
   - Click "ADD URI".
   - Enter: `http://localhost:5173/auth/google/callback`
   - Click "ADD URI" again (optional).
   - Enter: `http://localhost:3000/auth/google/callback`
   *Note: This URI must match exactly what is in your code.*
8. Click **"CREATE"**.
9. A modal "OAuth client created" will appear.
10. **Copy the Client ID**.
11. **Copy the Client Secret**.
12. Click **"OK"**.

## STEP 6: ADD YOUR CREDENTIALS TO .ENV FILE
==========================================

1. Open your project in your code editor (VS Code, etc.).
2. Find the `.env` file in the root directory.
3. Add or update the following lines: