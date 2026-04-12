// Check what columns exist, which are null, and what a full customer row looks like
const baseUrl = 'https://zdekydcscwhuusliwqaz.supabase.co/rest/v1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ0OTg1NSwiZXhwIjoyMDc5MDI1ODU1fQ.fcHpUL4HXJZyW64vtKhZHOPKtYXBIfGeUbBlkkz1oGg';
const headers = { 'apikey': key, 'Authorization': 'Bearer ' + key };

// 1) Fetch one full row (all columns via *)
console.log('\n--- Full single customer row (all columns) ---');
const r1 = await fetch(`${baseUrl}/customers?select=*&limit=1`, { headers });
const [sample] = await r1.json();
console.log(JSON.stringify(sample, null, 2));
console.log('\n--- Columns present in the table ---');
console.log(Object.keys(sample));

// 2) Count how many rows have non-null address, phone, gst_number
console.log('\n--- Null stats for key cols (sampling 500 rows) ---');
const r2 = await fetch(`${baseUrl}/customers?select=address,phone,gst_number,city,state,area,billing_address,delivery_address&limit=500`, { headers });
const rows = await r2.json();
const stats = {
  total: rows.length,
  address_filled: rows.filter(r => r.address).length,
  phone_filled: rows.filter(r => r.phone).length,
  gst_filled: rows.filter(r => r.gst_number).length,
  city_filled: rows.filter(r => r.city).length,
  state_filled: rows.filter(r => r.state).length,
  area_filled: rows.filter(r => r.area).length,
  billing_filled: rows.filter(r => r.billing_address).length,
  delivery_filled: rows.filter(r => r.delivery_address).length,
};
console.log(JSON.stringify(stats, null, 2));

// 3) Show rows that DO have an address or phone
console.log('\n--- Sample customers WITH address or phone ---');
const withData = rows.filter(r => r.address || r.phone).slice(0,5);
console.log(JSON.stringify(withData, null, 2));
