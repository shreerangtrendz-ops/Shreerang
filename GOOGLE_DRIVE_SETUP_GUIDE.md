# Google Drive Integration Setup Guide

## 1. Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Create Project** and name it (e.g., "Shree Rang Trendz Inventory").
3. Once created, select the project.

## 2. Enable Google Drive API
1. In the sidebar, go to **APIs & Services > Library**.
2. Search for "Google Drive API".
3. Click **Enable**.

## 3. Configure OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Select **External** (unless you have a Google Workspace organization, then Internal is fine).
3. Fill in the App Name ("Shree Rang Trendz") and User Support Email.
4. Skip "Scopes" for now (or add `.../auth/drive.file`).
5. Add your email to "Test Users" if the app status is "Testing".

## 4. Create Credentials (Client ID)
1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Application Type: **Web application**.
4. Name: "Web Client 1".
5. **Authorized JavaScript Origins**:
   - `http://localhost:5173` (For local development)
   - `https://your-production-domain.com` (For production)
6. **Authorized Redirect URIs**:
   - `http://localhost:5173/auth/google/callback`
   - `https://your-production-domain.com/auth/google/callback`
7. Click **Create**.
8. Copy the **Client ID**. (You do NOT need the Client Secret for this frontend integration).

## 5. Configure Environment Variables
Create or update your `.env` file in the project root: