# Troubleshooting Guide

## Common Issues & Solutions

### 1. Dropdowns Not Loading
*Symptoms*: Dropdowns for Units, Fabrics, or Categories are empty.
*   **Check**: Is the `supabase` connection active? Check network tab.
*   **Check**: Are the tables (`job_work_units`, `fabric_master`) populated? Use the Admin Seed Data page to generate test data.
*   **Check**: RLS Policies. Ensure `SELECT` is allowed for `authenticated` users.

### 2. Image Upload Failures
*Symptoms*: "Upload failed" toast notification.
*   **Solution**: 
    1.  Verify `VITE_BUNNY_API_KEY` in `.env`.
    2.  Check file size. System limit is 10MB.
    3.  Check file type. Allowed: JPG, PNG, WEBP.
    4.  Verify Internet connection.

### 3. WhatsApp Messages Not Delivering
*Symptoms*: Success toast appears, but message not received on phone.
*   **Solution**:
    1.  Is the destination number a valid WhatsApp account?
    2.  If using a Test Number, have you verified the recipient in Meta Dashboard?
    3.  Check if the 24-hour support window is active (for non-template messages).
    4.  Review Supabase `whatsapp_messages` table for `status` = 'failed' logs.

### 4. Import Errors (CSV)
*Symptoms*: "Validation Failed" during bulk import.
*   **Solution**:
    1.  Download the **Template** again to ensure correct headers.
    2.  Ensure no empty rows.
    3.  Ensure `SKU` is unique if provided.
    4.  Check date formats (YYYY-MM-DD).

### 5. Appsmith Dashboard Empty
*Symptoms*: White screen or "Refused to connect".
*   **Solution**:
    1.  Check `VITE_APPSMITH_EMBED_URL`.
    2.  In Appsmith, ensure the application is **Public** or Share settings are correct.
    3.  Browser might be blocking third-party cookies/iframes. Check shield icon in address bar.