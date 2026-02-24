# Quick Start Guide

Welcome to the Shreerang Trendz System.

## 🌐 For Customers (Website)

**1. Browse & Shop:**
- Go to the **Home Page** to see featured collections.
- Click **Shop** to browse the full catalog. Use filters on the left to find specific fabrics.
- Click on a product to view details and add it to your **Cart**.

**2. Checkout:**
- Open your cart and click **Checkout**.
- Enter your shipping details.
- Choose a payment method (Bank Transfer, Cheque, or COD).
- You will receive an Order ID to track your shipment.

**3. Track Order:**
- Click **Track Order** in the footer.
- Enter your Order ID (e.g., `SO-2025-0001`) to see live status.

---

## 🛡️ For Admins (Office Team)

**1. Access the Dashboard:**
- Log in at `/login`.
- You will be redirected to the **Admin Dashboard** (`/admin`).

**2. Managing Fabrics:**
- Go to **Fabric & Design > Fabric Master**.
- Use the tabs to manage Base Fabrics, Finish Fabrics, and Fancy Fabrics.
- Click **+ Add New** to create a new entry.

**3. Uploading Designs:**
- Go to **Fabric & Design > Design Upload**.
- Drag & drop images. The system will auto-generate design numbers.

**4. Calculating Costs:**
- Go to **Costing > Cost Sheet Generator**.
- Select a Design and a Costing Path (e.g., Mill Print).
- Enter rates for each stage. The system calculates the final selling price.

**5. Managing Orders:**
- Go to **Orders > Sales Orders** to view website orders.
- Go to **Orders > Order Forms** to create manual orders for offline customers.

**6. Production Tracking:**
- Create **Purchase Orders** for raw materials in **Production > Purchase Orders**.
- Assign work to job workers in **Production > Job Management**.

---

## ❓ FAQ

**Q: I can't log in.**
A: Ensure you are using the correct email and password. If you are an admin, make sure your account has the 'admin' role in Supabase.

**Q: Images are not loading.**
A: Check your internet connection. If the issue persists, the image URL might be broken in the database.

**Q: How do I add a new user?**
A: Currently, users register via the website. An admin can then upgrade their role in the database if needed.