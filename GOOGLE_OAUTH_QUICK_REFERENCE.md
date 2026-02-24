# Google OAuth Quick Reference Card

Use this checklist to ensure you haven't missed any critical configuration steps.

## QUICK SETUP CHECKLIST
=====================

- [ ] **Create Google Cloud Project** (Name: "Fabric Master Google Drive")
- [ ] **Enable Google Drive API** (Library > Search > Enable)
- [ ] **Configure OAuth Consent Screen**
  - [ ] User Type: External
  - [ ] App Name & Email filled
  - [ ] **Scopes Added**: `drive` and `drive.file`
  - [ ] **Test Users Added**: Your specific email address
- [ ] **Create OAuth Client ID**
  - [ ] Type: Web application
  - [ ] **Authorized JavaScript origins**: `http://localhost:5173`
  - [ ] **Authorized redirect URIs**: `http://localhost:5173/auth/google/callback`
- [ ] **Get Credentials**
  - [ ] Copy Client ID
  - [ ] Copy Client Secret
- [ ] **Configure Project**
  - [ ] Add variables to `.env`
  - [ ] Restart dev server
- [ ] **Verification**
  - [ ] Log in via Settings page
  - [ ] Grant permissions in popup
  - [ ] Confirm "Connected" status

## IMPORTANT LINKS
================
* **Google Cloud Console**: [https://console.cloud.google.com](https://console.cloud.google.com)
* **Google Drive API Overview**: [https://developers.google.com/drive/api](https://developers.google.com/drive/api)
* **OAuth 2.0 Protocols**: [https://developers.google.com/identity/protocols/oauth2](https://developers.google.com/identity/protocols/oauth2)
* **Google API Scopes**: [https://developers.google.com/identity/protocols/oauth2/scopes](https://developers.google.com/identity/protocols/oauth2/scopes)

## CREDENTIALS TO SAVE
====================
*Store these securely. Do not commit them to public repositories.*

* **Project ID**: ___________________________
* **Client ID**: ___________________________
* **Client Secret**: ___________________________
* **Redirect URI**: `http://localhost:5173/auth/google/callback`