# Schiffli Fabric Master - Quick Start Guide

## 1. System Overview
Schiffli Fabric Master is a comprehensive enterprise resource planning (ERP) module designed specifically for fabric manufacturers and traders. It manages the entire lifecycle of fabrics from base material procurement to fancy finish production, including pricing, design management, and costing.

### Key Features
- **Fabric Hierarchy Management**: Base -> Fancy Base -> Finish -> Fancy Finish
- **Dynamic Pricing**: Track historical prices for fabrics, job work, and value additions
- **Design Management**: Upload and organize designs with Bunny.net integration
- **Schiffli Costing**: Automated calculator for complex Schiffli embroidery costing
- **Unit Management**: Manage job workers and value addition units
- **Analytics**: Real-time dashboards via Appsmith
- **WhatsApp Integration**: Send updates and details directly to clients

## 2. Prerequisites & Setup
1.  **Supabase Account**: Ensure your Supabase project is set up with the provided schema.
2.  **Bunny.net Account**: For image storage. API Key and Storage Zone Name required.
3.  **WhatsApp Business API**: Meta Developer account required for sending messages.
4.  **Appsmith Account**: For analytics dashboards.

### Environment Setup
Create a `.env` file in the root directory: