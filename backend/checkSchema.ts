import dotenv from 'dotenv';
dotenv.config();
import { supabaseAdmin } from './supabaseDb.js';

async function check() {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Table admin_users DOES NOT EXIST');
      console.log('   Error:', error.message);
      process.exit(1);
    } else {
      console.log('✅ Table admin_users EXISTS');
      process.exit(0);
    }
  } catch (e) {
    console.log('Error:', (e as any).message);
    process.exit(1);
  }
}
check();
