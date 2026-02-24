# Production Deployment Guide

## 1. Database
*   Run final migrations.
*   Enable Point-in-Time Recovery (PITR) in Supabase.

## 2. n8n Server
*   Ensure PM2 is managing the n8n process for auto-restart.
*   `pm2 save` to freeze process list.
*   Set `N8N_ENCRYPTION_KEY` env var to persist credential encryption across restarts.

## 3. WhatsApp
*   Apply for **Business Verification** (Green Tick) if high volume is expected.
*   Add a valid Payment Method in Meta Business Manager (first 1000 convos/month are free).

## 4. Monitoring
*   Set up UptimeRobot to ping your n8n webhook URL (expecting 404/405 is fine, just checks server is up).
*   Check Supabase Dashboard for query latency spikes.