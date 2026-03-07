#!/bin/bash
# Run this on KVM VPS 72.61.249.86
# Fixes nginx routing so tally-test.shreerangtrendz.com routes through FRP correctly

# Check current frps vhost port
echo '=== FRPS CONFIG ==='
cat /opt/frp/frps.toml

# Check nginx sites
echo '=== NGINX VHOST CONFIG ==='
cat /etc/nginx/sites-available/frp-vhosts.conf

# Fix: tally-test should proxy to FRP vhostHTTPPort (not 127.0.0.1:9000 directly)
# FRP handles the tunnel routing internally via vhostHTTPPort
echo '=== FIXING NGINX ==='
cat > /etc/nginx/sites-available/frp-vhosts.conf << 'NGINXEOF'
server {
    listen 80;
    server_name tally.shreerangtrendz.com;
    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host tally.shreerangtrendz.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 120s;
    }
}
server {
    listen 80;
    server_name tally-test.shreerangtrendz.com;
    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host tally-test.shreerangtrendz.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 120s;
    }
}
NGINXEOF

nginx -t && systemctl reload nginx
echo '=== TEST CURL ==='
curl -s -X POST http://tally-test.shreerangtrendz.com:9000 -H 'Content-Type: text/xml' -d '<?xml version="1.0"?><ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>List of Companies</REPORTNAME></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>' --max-time 10
echo 'DONE'
