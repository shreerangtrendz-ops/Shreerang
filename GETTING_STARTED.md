# 🎯 GETTING STARTED

## Section 1: Welcome
Welcome to the **Fabric Management System**. This platform enables you to manage textile specifications, process sales orders, organize design assets, and communicate with customers via WhatsApp—all from a single dashboard.

## Section 2: Prerequisites
*   Node.js v16+ installed.
*   A code editor (VS Code recommended).
*   A Supabase project (URL & Key).

## Section 3: Installation
1.  **Clone**: `git clone <repo-url>`
2.  **Install**: `npm install`
3.  **Configure**: Copy `.env.example` to `.env` and fill in credentials.
4.  **Start**: `npm run dev`
5.  **Open**: Visit `http://localhost:5173` in your browser.

## Section 4: First Steps
1.  **Create a Fabric**: Go to **Fabric Master** > **Add New**. Fill in the base details (e.g., Cotton, 60x60).
2.  **Upload a Design**: Go to **Design Manager**. Drag an image to upload it to the CDN.
3.  **Create an Order**: Go to **Sales Orders** > **New**. Select the fabric and attach the design you just uploaded.
4.  **Send a Message**: Go to **WhatsApp Inbox**. Select a customer and say "Hello!".

## Section 5: Common Tasks
*   **Adding Fabric**: detailed inputs for GSM, Weave, and Width automatically generate a unique SKU.
*   **Processing Orders**: Status moves from Draft to Approved. You can print orders (future feature).
*   **Messaging**: Use Quick Replies (Ctrl+/) to save time.

## Section 6: Tips & Tricks
*   **Shortcuts**: Use `Tab` to navigate forms quickly.
*   **Search**: The Fabric Master supports global search for SKUs.
*   **Images**: Uploading high-res images? The system auto-optimizes them via Bunny.net.

## Section 7: Getting Help
*   Check the [Troubleshooting Guide](TROUBLESHOOTING_GUIDE.md).
*   Read the [User Guide](USER_GUIDE.md).
*   Contact support at `support@example.com`.