# Complete Setup Guide 🚀

Welcome to the **Fabric Management System**. This guide covers the end-to-end setup, configuration, and testing of the application.

## 📋 Table of Contents
1.  [Verification Checklist](#part-1-verification-checklist)
2.  [Immediate Fixes](#part-2-immediate-fixes)
3.  [Optional Integrations](#part-3-optional-integrations)
4.  [Environment Variables](#part-4-environment-variables)
5.  [Testing Checklist](#part-5-testing-checklist)
6.  [Quick Start](#part-6-quick-start)
7.  [Troubleshooting](#part-7-troubleshooting)

---

## Part 1: Verification Checklist
Before starting, ensure the recent critical fixes have been applied:
- [x] **BaseFabricForm**: `fabricConstants.js` created and imported.
- [x] **Sales Order Form**: `SalesOrderForm.jsx` created and route registered.
- [x] **Design Upload**: `DesignUploadComponent.jsx` integrated.
- [x] **WhatsApp Inbox**: `WhatsAppInbox.jsx` and related components created.
- [x] **Services**: `BunnyNetService`, `GoogleDriveService`, `N8nService`, etc., exist.

---

## Part 2: Immediate Fixes
The following critical modules have been restored and enhanced.

### 1. Base Fabric Form
**Status**: Fixed "undefined BASE" error.
**Action**:
- Navigate to `/admin/fabric-master/new`.
- Verify dropdowns for Base, Width, and Finish are populated.

### 2. Sales Order Form
**Status**: Restored.
**Action**:
- Navigate to `/admin/sales-order/new`.
- Verify the form loads with Customer Details, Order Items, and **Design Upload** section.

### 3. WhatsApp Inbox
**Status**: New Feature.
**Action**:
- Navigate to `/admin/whatsapp-inbox`.
- Verify the three-column layout (List, Thread, Info) loads.

---

## Part 3: Optional Integrations
Configure these services to enable full functionality.

| Service | Purpose | Priority |
| :--- | :--- | :--- |
| **Bunny.net** | High-speed image CDN for designs. | ⭐ High |
| **WhatsApp** | Customer communication. | ⭐ High |
| **Google Drive** | Backup storage. | Low |
| **n8n** | Workflow automation. | Low |
| **KVM-1** | Server monitoring. | Low |

---

## Part 4: Environment Variables
Create a `.env` file in the project root: