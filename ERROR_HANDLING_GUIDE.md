# Error Handling & Debugging Guide

This guide helps developers and admins troubleshoot issues in the Shreerang Trendz system.

## 1. Common Error Screens

**"Something went wrong" (Error Boundary)**
- **Cause:** A React component crashed due to unhandled data (e.g., accessing a property of `null`).
- **Solution:**
    1.  Check the browser console (F12) for the specific error.
    2.  If it says "Cannot read properties of undefined", it's likely missing data.
    3.  Report the page and action to the developer.

**"Network Error" / "Failed to fetch"**
- **Cause:** Internet connection issue or Supabase API is down.
- **Solution:** Refresh the page. Check your internet.

## 2. Debugging Tools

**Browser Console**
- Press **F12** -> **Console** tab.
- Look for red error messages.
- The system logs helpful context like `[DATA FETCH]` or `[ERROR]`.

**Debug Helpers**
- The system includes a global `ensureArray` utility to prevent crashes when lists are empty.
- `logError` sends formatted error details to the console.

## 3. Reporting Bugs
When reporting a bug, please include:
1.  **Page URL:** (e.g., `/admin/fabric-master`)
2.  **Action:** What were you doing? (e.g., "Clicked Save button")
3.  **Error Message:** Screenshot or text of the error.
4.  **Time:** When did it happen?

## 4. Troubleshooting Flowchart

1.  **Is the page blank?** -> Check Console for crash errors.
2.  **Is data missing?** -> Check Network tab for API failures.
3.  **Can't login?** -> Check Supabase Auth users list.
4.  **Images broken?** -> Check Supabase Storage bucket permissions.