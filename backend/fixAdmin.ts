import dotenv from 'dotenv';
dotenv.config();

import { supabaseAdmin } from './supabaseDb.js';

async function fixAdmin() {
  console.log('🔧 Fixing admin setup...\n');

  try {
    // Get the admin user ID
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const adminUser = users?.users?.find(u => u.email === 'admin@admin.com');

    if (!adminUser) {
      console.error('❌ Admin user not found in auth');
      process.exit(1);
    }

    const userId = adminUser.id;
    console.log(`Found admin user: ${userId}\n`);

    // Step 1: Try to create admin_users table with SQL
    console.log('1️⃣ Creating admin_users table with SQL...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.admin_users (
        id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
        role text NOT NULL DEFAULT 'admin',
        granted_at timestamp with time zone NOT NULL DEFAULT now(),
        granted_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL
      );
    `;

    // We'll try using a raw query approach
    const { error: createError } = await supabaseAdmin.rpc('exec', { sql: createTableSQL });

    if (createError) {
      console.log('⚠️  RPC approach failed, trying direct insert...');
    } else {
      console.log('✅ Table created\n');
    }

    // Step 2: Insert admin user
    console.log('2️⃣ Inserting admin user into admin_users table...');

    const { error: insertError } = await supabaseAdmin
      .from('admin_users')
      .insert([
        {
          id: userId,
          role: 'admin',
          granted_at: new Date().toISOString()
        }
      ]);

    if (insertError) {
      console.log('❌ Insert error:', insertError.message);
      console.log('\n📝 The table might not exist. You need to create it manually in Supabase.');
      console.log('   Go to: https://supabase.cloudteco.com/');
      console.log('   SQL Editor → New Query → Copy this:\n');

      console.log(`
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin',
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL
);

INSERT INTO admin_users (id, role, granted_at)
VALUES ('${userId}', 'admin', NOW());
      `);

      process.exit(1);
    }

    console.log('✅ Admin user inserted\n');

    // Step 3: Verify
    console.log('3️⃣ Verifying...');
    const { data: adminCheck, error: checkError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (checkError) {
      console.error('❌ Verification failed:', checkError.message);
      process.exit(1);
    }

    if (adminCheck) {
      console.log('✅ Verification successful!\n');
      console.log('=' .repeat(60));
      console.log('🎉 ADMIN SETUP COMPLETE!\n');
      console.log('📋 Credentials:');
      console.log('   Email: admin@admin.com');
      console.log('   Password: Admin123\n');
      console.log('🚀 Next:');
      console.log('   1. Reload your browser (F5 or Ctrl+Shift+R)');
      console.log('   2. Log out and log in again');
      console.log('   3. Now you should see ADMIN PANEL');
      console.log('=' .repeat(60) + '\n');
      process.exit(0);
    }

  } catch (e: any) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

fixAdmin();
