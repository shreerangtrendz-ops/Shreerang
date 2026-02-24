# Quick Start Checklist

## 1. 5-Minute Setup
- [ ] **Clone Repository**: Pull the latest code to your local machine or server.
- [ ] **Install Dependencies**: Run `npm install` to set up the frontend environment.
- [ ] **Environment Variables**: Create `.env` and populate `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- [ ] **Start Dev Server**: Run `npm run dev` to verify the frontend loads.

## 2. 30-Minute Configuration
- [ ] **Database Setup**: Ensure all tables from `DATABASE_SCHEMA_DOCUMENTATION.md` are applied in Supabase.
- [ ] **Storage Buckets**: Create `design-images` and `sales-order-attachments` buckets in Supabase Storage.
- [ ] **Auth Configuration**: Enable Email/Password auth provider in Supabase.
- [ ] **Admin Account**: Manually create the first admin user or use the seed script.
- [ ] **WhatsApp Settings**: Go to *Admin > Settings > WhatsApp* and enter your Phone ID and Token.

## 3. 1-Hour Testing
- [ ] **Master Data**: Create 1 Base Fabric, 1 Finish Fabric, and add 3 Designs.
- [ ] **Uploads**: Test the *Bulk Image Upload* feature with dummy images.
- [ ] **Order Flow**: Create a dummy Sales Order and verifying calculations.
- [ ] **Bot Test**: Send "Show Designs" to your WhatsApp test number and verify response.
- [ ] **Permissions**: Log in as a 'Sales Team' user and verify restricted access.

## 4. Go-Live Checklist
- [ ] **Production Build**: Run `npm run build` and deploy the `dist` folder.
- [ ] **Domain Setup**: Point your domain to the hosting provider.
- [ ] **SSL**: Ensure HTTPS is active for both Frontend and n8n webhook URLs.
- [ ] **Meta Verification**: Ensure WhatsApp Business Account is verified for higher messaging limits.
- [ ] **Backup**: Enable Point-in-Time Recovery (PITR) in Supabase.