# Troubleshooting Guide

## WhatsApp Issues

### Messages Not Sending
*   **Symptom**: Message stays "Sending..." or shows a red error.
*   **Checks**:
    1.  Verify internet connection.
    2.  Check if the 24-hour customer service window has expired (you can only send Templates after 24 hours).
    3.  Verify `VITE_WHATSAPP_ACCESS_TOKEN` in `.env`.

### Webhook Not Triggering
*   **Symptom**: Incoming messages don't appear in the inbox.
*   **Checks**:
    1.  Go to Meta Developer Portal > Webhooks.
    2.  Ensure the webhook URL is reachable and verified.
    3.  Click "Test" in the portal to send a sample event.

## Design Upload Issues

### File Upload Failed
*   **Symptom**: "Upload failed" toast notification.
*   **Checks**:
    1.  **File Size**: Ensure image is under 10MB.
    2.  **File Type**: Only JPG, PNG, WEBP are allowed.
    3.  **Bunny.net**: Verify `VITE_BUNNY_NET_API_KEY` is correct.

### Image Not Displaying
*   **Symptom**: Broken image icon in gallery.
*   **Checks**:
    1.  Verify `VITE_BUNNY_NET_CDN_URL` matches your Pull Zone hostname.
    2.  Check browser console (F12) for 403 or 404 errors.

## Sales Order Issues

### Form Validation Errors
*   **Symptom**: "Please fill required fields" but fields look full.
*   **Solution**:
    1.  Check for hidden required fields (e.g., Customer ID).
    2.  Ensure Quantity is a number greater than 0.

### Dropdowns Empty
*   **Symptom**: Customer or Fabric list is blank.
*   **Solution**:
    1.  Refresh the page.
    2.  Check network tab for failed API calls to Supabase.
    3.  Ensure RLS policies allow you to view these tables.

## Integration Issues

### Google Drive
*   **Error**: "popup_closed_by_user" or "access_denied".
*   **Solution**:
    1.  Ensure you are allowing the popup in your browser.
    2.  Verify the Authorized Javascript Origins in Google Cloud Console match your current domain (e.g., `http://localhost:3000`).

### n8n Workflows
*   **Symptom**: Workflow doesn't start.
*   **Solution**:
    1.  Check `VITE_N8N_API_URL`.
    2.  Ensure the n8n workflow is Active.
    3.  Check Execution Logs in n8n dashboard.

## General
**Still stuck?**
1.  Clear Browser Cache/Cookies.
2.  Check the browser Developer Console (F12) for red error messages.
3.  Contact the IT Support team with the error code.