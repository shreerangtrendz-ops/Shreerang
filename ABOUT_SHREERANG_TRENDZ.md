# Shreerang Trendz — Project Knowledge Base
## Last Updated: 28-Feb-2026

This document serves as the master reference for all development work on the Shreerang Trendz platform. Use this to avoid repeating the same prompts.

---

## 🏢 Company Overview
**Shreerang Trendz Pvt. Ltd.** is a textile converter and value-addition business headquartered in **Surat, Gujarat** — India's textile capital.
- Procures grey fabrics → adds value through dyeing, printing, Schiffli embroidery → sells wholesale across India
- - 15+ years in trade, Pan-India delivery reach
  - - Contact: Corporate at 4081-4084, 4th Floor, Millennium-4 Textile Market, Bhathena, Udhna, Surat-395002
    - - Sales: A-1070-1071, Global Textile Market, Opp. New Bombay Market, Sahara Darwaja, Surat-395002
     
      - ---

      ## 🌐 Live URLs
      | Purpose | URL |
      |---------|-----|
      | Main Site | https://www.shreerangtrendz.com |
      | Admin Dashboard | https://www.shreerangtrendz.com/admin/dashboard |
      | Shop | https://www.shreerangtrendz.com/shop |
      | Wholesale Portal | https://www.shreerangtrendz.com/wholesale |
      | About | https://www.shreerangtrendz.com/about |
      | Contact | https://www.shreerangtrendz.com/contact |

      ---

      ## 🛠️ Tech Stack
      | Component | Technology |
      |-----------|-----------|
      | Frontend | Vite + React (JSX) |
      | Hosting | Vercel (shrikumar-marus-projects/shreerang) |
      | Database | Supabase (zdekydcscwhuusliwqaz) |
      | Image CDN | Bunny.net (imagedelivery.net) |
      | Authentication | Supabase Auth |
      | WhatsApp Bot | WhatsApp Business API via n8n |
      | Source Control | GitHub (shreerangtrendz-ops/Shreerang) |
      | Accounting | Tally Prime (live sync) |

      ---

      ## 🔗 Key Service Accounts
      | Service | Details |
      |---------|---------|
      | **GitHub** | Repo: shreerangtrendz-ops/Shreerang (public, master branch) |
      | **Vercel** | Project: shreerang, Account: shrikumar-marus-projects |
      | **Supabase** | Project ID: zdekydcscwhuusliwqaz |
      | **Domains** | shreerangtrendz.com + www.shreerangtrendz.com (both Production on Vercel) |

      ---

      ## 🎨 Design System
      **CRITICAL: DO NOT change the Admin Dashboard theme**

      ### Colors
      | Variable | Value | Usage |
      |----------|-------|-------|
      | `--bg` | #F4FBFA | Page background (light) |
      | `--surface` | #FFFFFF | Card background |
      | `--sidebar-bg` | #0B2E2B | Dark sidebar/nav background |
      | `--teal` | #2BA898 | Primary brand color |
      | `--teal-bright` | #3DBFAE | Highlights |
      | `--gold` | #D4920A | Accent/labels |
      | `--text` | #0D2E2B | Main text |

      ### Typography
      - Body: DM Sans (sans-serif)
      - - Headings: Playfair Display (serif)
        - - Code: JetBrains Mono (monospace)
         
          - ### Tab Title
          - `Shreerang - "Where Tradition Weaves Magic"`
         
          - ### Tagline
          - `"Where Tradition Weaves its Magic"`
         
          - ---

          ## 📦 Fabric Categories
          1. Mill Print (500+ variants)
          2. 2. Digital Poly (300+ variants)
             3. 3. Digital Pure (150+ variants)
                4. 4. Solid Dyed (200+ variants)
                   5. 5. Schiffli (100+ variants)
                      6. 6. Hakoba (80+ variants)
                        
                         7. ---
                        
                         8. ## 🔧 Changes Made (2026-02-28 Session)
                         9. 1. ✅ Fixed tab title: "Shreerang - Where Tradition Weaves Magic" (was "Hostinger Horizons")
                            2. 2. ✅ Removed Hostinger Horizon branding from code
                               3. 3. ✅ Fixed dropdown transparent backgrounds (now white)
                                  4. 4. ✅ Homepage redesigned to match Dashboard professional quality
                                     5. 5. ✅ All buttons and sections working (Shop, Wholesale, About, Contact)
                                        6. 6. ✅ Created google_drive_sync table in Supabase
                                           7. 7. ✅ Verified both domains on Vercel (Production)
                                              8. 8. ✅ Fixed vercel.json invalid redirect source pattern
                                                 9. 9. ✅ Fixed generate-llms.js EISDIR build error
                                                    10. 10. ✅ Fixed ChallansPage.jsx JSX syntax error
                                                        11. 11. ✅ Created src/lib/supabase.js (missing module)
                                                            12. 12. ✅ Cleaned vite.config.js (removed all Hostinger Horizon code)
                                                               
                                                                13. ---
                                                               
                                                                14. ## 📁 Key Source Files
                                                                15. | File | Purpose |
                                                                16. |------|---------|
                                                                17. | `index.html` | HTML entry point, title, meta tags |
                                                                18. | `vite.config.js` | Vite build config (clean, no Horizon code) |
                                                                19. | `vercel.json` | Vercel deployment config |
                                                                20. | `src/index.css` | Global CSS variables (design system) |
                                                                21. | `src/App.jsx` | Root component, routing |
                                                                22. | `src/components/Navbar.jsx` | Public site navigation |
                                                                23. | `src/pages/HomePage.jsx` | Homepage |
                                                                24. | `src/lib/supabase.js` | Supabase client export |
                                                                25. | `src/lib/customSupabaseClient.js` | Main Supabase client |
                                                                26. | `src/lib/GoogleDriveImageFetcher.js` | Google Drive API integration |
                                                               
                                                                27. ---
                                                               
                                                                28. ## 🌩️ Google Drive & Bunny.net Integration
                                                                29. The code infrastructure exists for both integrations. To activate:
                                                               
                                                                30. ### Bunny.net
                                                                31. Add to Vercel Environment Variables:
                                                                32. ```
                                                                    VITE_BUNNY_NET_API_KEY=<your_storage_zone_password>
                                                                    VITE_BUNNY_NET_STORAGE_ZONE=<your_storage_zone_name>
                                                                    VITE_BUNNY_NET_CDN_URL=https://your-pull-zone.b-cdn.net
                                                                    ```

                                                                    ### Google Drive OAuth
                                                                    Add to Vercel Environment Variables:
                                                                    ```
                                                                    GOOGLE_OAUTH_CLIENT_ID=<your_google_oauth_client_id>
                                                                    GOOGLE_OAUTH_CLIENT_SECRET=<your_google_oauth_client_secret>
                                                                    GOOGLE_DRIVE_FOLDER_ID=<your_google_drive_folder_id>
                                                                    ```

                                                                    ---

                                                                    ## 📊 Supabase Tables
                                                                    Key tables for the system:
                                                                    - `products` - Fabric products catalog
                                                                    - - `fabric_masters` - Base, finish, fancy fabric data
                                                                      - - `orders` - Customer orders
                                                                        - - `challans` - Delivery challans
                                                                          - - `google_drive_sync` - Google Drive sync config (created 2026-02-28)
                                                                            - - `users` (via auth.users) - Authentication
                                                                             
                                                                              - ---

                                                                              ## 🤖 n8n & WhatsApp Automation
                                                                              - N8N webhook configured for WhatsApp Business
                                                                              - - Auto-sync with Tally Prime
                                                                                - - Smart customer recognition
                                                                                  - - Admin price update bot via WhatsApp
                                                                                   
                                                                                    - ---

                                                                                    ## ⚠️ Critical Rules
                                                                                    1. **NEVER change the Admin Dashboard theme** (dark teal professional theme)
                                                                                    2. 2. **Always push to GitHub master branch** → Vercel auto-deploys
                                                                                       3. 3. **Tab title must be**: Shreerang - "Where Tradition Weaves Magic"
                                                                                          4. 4. **Do not use Hostinger** — platform is now: Vercel + Supabase + GitHub + Bunny.net + Google Drive + KVM-1 + n8n
                                                                                             5. 5. **Design reference file**: I:\My Drive\Automation\Shreerang 2026\Knowledge Base\SHREERANG_DESIGN_SYSTEM (2).md
