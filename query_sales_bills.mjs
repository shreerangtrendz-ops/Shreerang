const url = 'https://zdekydcscwhuusliwqaz.supabase.co/rest/v1/sales_bills?customer_name=eq.16%20Fire%20Creation%20Pvt%20Ltd&select=tally_voucher_no,customer_name,customer_gstin,customer_state,destination_city,place_of_supply';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';

fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(data => console.log(JSON.stringify(data.slice(0, 5), null, 2))).catch(console.error);
