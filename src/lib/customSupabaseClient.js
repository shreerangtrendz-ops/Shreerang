import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zdekydcscwhuusliwqaz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWt5ZGNzY3dodXVzbGl3cWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NDk4NTUsImV4cCI6MjA3OTAyNTg1NX0.47cCribhShEYGqsLbsh7lUwFaFK-rXf2SusVhq4-p0o';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
