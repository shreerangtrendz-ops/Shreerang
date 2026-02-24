# Google OAuth Troubleshooting Guide

If you encounter issues while connecting Google Drive, consult the solutions below.

## ISSUE 1: "Popup not appearing"
==============================
**Symptoms**: You click "Connect Google Drive" but nothing happens, or a window flashes and closes instantly.

**Solutions**:
1. **Check .env file**: Ensure `VITE_GOOGLE_CLIENT_ID` is present in your `.env` file and you have restarted the dev server.
2. **Browser Blocking**: Look for a "Popup blocked" icon in your browser's address bar (usually right side). Click it and allow popups from localhost.
3. **Console Errors**: Open Chrome DevTools (F12) > Console. Look for red errors.
   - If you see `gapi is not defined` or `google is not defined`, check your internet connection (the script loads from Google's servers).
4. **Cache**: Clear your browser cache or try a hard refresh (Ctrl+Shift+R).

## ISSUE 2: "Invalid Client ID" or "400 Error: invalid_request"
============================
**Symptoms**: The popup opens but shows a Google error page immediately saying "Error 400: invalid_request".

**Solutions**:
1. **Verify ID**: Check your `VITE_GOOGLE_CLIENT_ID` in `.env`. It usually ends with `.apps.googleusercontent.com`.
2. **Whitespace**: Ensure there are no spaces at the beginning or end of the Client ID string in your `.env` file.
3. **Regenerate**: If you suspect the ID is corrupted, go to Google Cloud Console, delete the credential, create a new one, and update the `.env` file.
4. **Restart**: Did you restart `npm run dev` after changing `.env`? Vite loads env vars only on startup.

## ISSUE 3: "Redirect URI mismatch" or "400 Error: redirect_uri_mismatch"
================================
**Symptoms**: The popup shows an error saying the redirect URI does not match.

**Solutions**:
1. **Exact Match Required**: The URI in your code (`window.location.origin + '/auth/google/callback'`) must **exactly** match one of the URIs listed in Google Cloud Console > Credentials > Authorized redirect URIs.
2. **Trailing Slash**: `.../callback` is different from `.../callback/`. Check for trailing slashes.
3. **Protocol**: `http://` vs `https://`. Localhost usually uses `http`, production uses `https`.
4. **Port**: `localhost:5173` is different from `localhost:3000`. Ensure the port matches your running dev server.

## ISSUE 4: "Permission denied" or "Access blocked: App has not completed the Google verification process"
============================
**Symptoms**: You see a warning screen saying the app is not verified, or access is denied after logging in.

**Solutions**:
1. **Test Users**: Since your app is in "Testing" mode (in OAuth Consent Screen settings), **only users listed in the "Test Users" section can log in**. Go to Google Cloud Console > OAuth consent screen > Test users, and add your email.
2. **Unsafe Mode**: If you see the "App not verified" screen, look for a small "Advanced" link at the bottom left, click it, and then click "Go to Fabric Master (unsafe)".
3. **Scopes**: Verify you added the `.../auth/drive.file` scope in the console.

## ISSUE 5: "Token expired" or "401 Unauthorized"
=======================
**Symptoms**: The integration was working, but now uploads fail or the status shows disconnected.

**Solutions**:
1. **Re-authorize**: Access tokens expire (usually after 1 hour). If your refresh token logic isn't working or the token was revoked:
   - Go to Settings > Google Drive.
   - Click "Disconnect" (if needed).
   - Click "Connect Google Drive" to re-authenticate.
2. **Check Time**: Ensure your computer's system time is correct. OAuth relies on accurate timestamps.