import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './supabaseDb.js';

async function test() {
  console.log('Testing admin endpoint...\n');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@admin.com',
    password: 'Admin123'
  });

  if (error) {
    console.log('LOGIN ERROR:', error.message);
    process.exit(1);
  }

  const token = data.session?.access_token;
  console.log('TOKEN OK:', token?.substring(0, 30) + '...');

  const res = await fetch('http://127.0.0.1:3005/api/admin/is-admin', {
    headers: { 'Authorization': 'Bearer ' + token }
  });

  console.log('STATUS:', res.status);
  const text = await res.text();
  console.log('RESPONSE:', text);

  process.exit(0);
}

test();
