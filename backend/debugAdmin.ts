import dotenv from 'dotenv';
dotenv.config();

import { supabaseAdmin, supabase } from './supabaseDb.js';

async function debug() {
  console.log('🔍 Debug Admin Setup\n');

  try {
    // 1. Get admin user from auth
    console.log('1️⃣ Getting admin user from auth...');
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const adminAuth = authData?.users?.find(u => u.email === 'admin@admin.com');

    if (!adminAuth) {
      console.log('❌ No admin user found in auth');
      process.exit(1);
    }

    const userId = adminAuth.id;
    console.log(`✅ Found: ${adminAuth.email} (ID: ${userId})\n`);

    // 2. Check if admin_users table exists
    console.log('2️⃣ Checking admin_users table...');
    const { data: tableTest, error: tableError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .limit(1);

    if (tableError?.code === '42P01') {
      console.log('❌ Table admin_users does NOT exist');
      process.exit(1);
    } else if (tableError) {
      console.log('⚠️  Table error:', tableError.message);
    } else {
      console.log('✅ Table exists\n');
    }

    // 3. Check if user is in admin_users
    console.log('3️⃣ Checking if user is in admin_users...');
    const { data: adminRow, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('id', userId);

    if (adminError) {
      console.log('❌ Query error:', adminError.message);
    } else if (!adminRow || adminRow.length === 0) {
      console.log('❌ User NOT in admin_users table');
      console.log('\n   Inserting user now...');

      const { error: insertError } = await supabaseAdmin
        .from('admin_users')
        .insert([{ id: userId, role: 'admin' }]);

      if (insertError) {
        console.log('   ❌ Insert error:', insertError.message);
      } else {
        console.log('   ✅ User inserted\n');
      }
    } else {
      console.log('✅ User IS in admin_users table');
      console.log('   Data:', adminRow[0], '\n');
    }

    // 4. Test the endpoint manually
    console.log('4️⃣ Testing isUserAdmin function...');
    const { data: testAdmin } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', userId)
      .single();

    console.log('   Result:', testAdmin ? '✅ IS ADMIN' : '❌ NOT ADMIN');
    console.log('\n5️⃣ Testing full auth flow...');

    // Login and get token
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin@admin.com',
      password: 'Admin123'
    });

    if (loginError) {
      console.log('❌ Login error:', loginError.message);
      process.exit(1);
    }

    const token = loginData.session?.access_token;
    console.log('✅ Got token\n');

    // Test endpoint with token
    console.log('6️⃣ Simulating endpoint call...');
    const { data: userData } = await supabase.auth.getUser(token);
    const isAdminResult = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', userData.user?.id)
      .single();

    console.log('   Is Admin:', !!isAdminResult.data ? '✅ YES' : '❌ NO');

    console.log('\n' + '='.repeat(60));
    if (isAdminResult.data) {
      console.log('🎉 EVERYTHING LOOKS GOOD!');
      console.log('\n   Try reloading the app and logging in again.');
      console.log('   The admin panel should appear in Settings.');
    } else {
      console.log('❌ Something is wrong with the admin setup.');
    }
    console.log('='.repeat(60) + '\n');

    process.exit(0);

  } catch (e: any) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

debug();
