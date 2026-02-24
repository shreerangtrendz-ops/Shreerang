# Implementation Checklist

## Immediate Actions
- [ ] **Environment Setup**
    - [ ] Copy `.env.example` to `.env`
    - [ ] Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
    - [ ] Run `npm install`
    - [ ] Start dev server: `npm run dev`

- [ ] **Smoke Tests**
    - [ ] Navigate to `/admin/fabric-master/new` (Verify Fabric Form)
    - [ ] Navigate to `/admin/sales-order/new` (Verify Sales Order Form)
    - [ ] Navigate to `/admin/design-manager` (Verify Design Upload)
    - [ ] Navigate to `/admin/whatsapp-inbox` (Verify WhatsApp Inbox)

## WhatsApp Integration (Priority 1)
- [ ] **Meta Setup**
    - [ ] Create App in Meta Developers
    - [ ] Add WhatsApp Product
    - [ ] Get Phone Number ID & Business Account ID
    - [ ] Generate Permanent Access Token
- [ ] **Configuration**
    - [ ] Set `VITE_WHATSAPP_BUSINESS_ACCOUNT_ID`
    - [ ] Set `VITE_WHATSAPP_PHONE_NUMBER_ID`
    - [ ] Set `VITE_WHATSAPP_ACCESS_TOKEN`
    - [ ] Configure Webhook URL in Meta
- [ ] **Testing**
    - [ ] Send test message from Admin Inbox
    - [ ] Receive test message from personal WhatsApp

## Bunny.net Setup (Priority 1)
- [ ] **Account Setup**
    - [ ] Create Storage Zone
    - [ ] Create Pull Zone (CDN)
- [ ] **Configuration**
    - [ ] Set `VITE_BUNNY_NET_API_KEY`
    - [ ] Set `VITE_BUNNY_NET_STORAGE_ZONE`
    - [ ] Set `VITE_BUNNY_NET_CDN_URL`
- [ ] **Testing**
    - [ ] Upload image via Design Manager
    - [ ] Verify image loads via CDN URL

## Database Verification
- [ ] Check `whatsapp_conversations` table exists
- [ ] Check `whatsapp_messages` table exists
- [ ] Check `designs` table exists and has `bunny_url` column
- [ ] Check `sales_orders` table has `order_details` JSONB column

## Feature Testing
- [ ] **Fabric Master**
    - [ ] Create a "Cotton 60x60" fabric
    - [ ] Verify SKU generation
- [ ] **Sales Order**
    - [ ] Create order for a Customer
    - [ ] Attach a Design
    - [ ] Submit and verify in list
- [ ] **WhatsApp**
    - [ ] Send message with media attachment
    - [ ] Link a Sales Order to a conversation

## Security & Performance
- [ ] Verify RLS policies are active (try accessing as anon)
- [ ] Check browser console for errors during navigation
- [ ] Verify large images are optimized/rejected (>10MB)

## Documentation
- [ ] Review `USER_GUIDE.md`
- [ ] Review `TROUBLESHOOTING.md`