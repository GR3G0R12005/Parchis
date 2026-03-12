import dotenv from 'dotenv';
dotenv.config();

import { supabaseAdmin, supabase, supabaseDbService } from './supabaseDb.js';

async function testAuth() {
  console.log('🔍 Testing authentication setup...\n');

  try {
    // Test 1: Check Supabase connection
    console.log('[1] Testing Supabase connection...');
    const { data: testData } = await supabase.auth.getSession();
    console.log('[OK] Supabase connection OK\n');

    // Test 2: Check users table
    console.log('[2] Testing users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (usersError) {
      console.log('[ERROR] Users table error:', usersError.message);
      console.log('   → The schema may not have been executed yet');
    } else {
      console.log('[OK] Users table exists');
      console.log(`   → Found ${users?.length || 0} users\n`);
    }

    // Test 3: Check admin_users table
    console.log('[3] Testing admin_users table...');
    const { data: admins, error: adminsError } = await supabase
      .from('admin_users')
      .select('*')
      .limit(1);

    if (adminsError) {
      console.log('[ERROR] Admin users table error:', adminsError.message);
    } else {
      console.log('[OK] Admin users table exists\n');
    }

    // Test 4: Try creating test user
    console.log('[4] Testing user creation...');
    const testEmail = `test-${Date.now()}@example.com`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true
    });

    if (authError) {
      console.log('[ERROR] Auth creation error:', authError.message);
    } else {
      console.log('[OK] Test user created in Auth');
      console.log(`   → UID: ${authData.user?.id}\n`);

      // Test 5: Create profile
      console.log('[5] Testing profile creation...');
      try {
        const profile = await supabaseDbService.createUser(
          authData.user?.id || '',
          'TestUser',
          testEmail,
          'https://api.dicebear.com/7.x/pixel-art/svg?seed=test'
        );
        console.log('[OK] Profile created successfully');
        console.log(`   → User: ${profile.username}\n`);
      } catch (e: any) {
        console.log('[ERROR] Profile creation error:', e.message);
      }
    }

    // Test 6: Check if login works
    console.log('6️⃣ Testing login with test credentials...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: 'TestPassword123!'
    });

    if (loginError) {
      console.log('[ERROR] Login error:', loginError.message);
    } else {
      console.log('[OK] Login successful');
      console.log(`   → Token: ${loginData.session?.access_token?.substring(0, 20)}...\n`);
    }

    console.log('[OK] All tests completed!\n');
    console.log('📋 Summary:');
    console.log('   - Supabase connection: OK');
    console.log('   - Database schema: Check the results above');
    console.log('   - Auth flow: Check the results above');

  } catch (e: any) {
    console.error('[ERROR] Fatal error:', e.message);
    console.error('\nPossible causes:');
    console.error('   1. Supabase credentials not set in .env');
    console.error('   2. Database schema not executed');
    console.error('   3. Network connectivity issue');
  }

  process.exit(0);
}

testAuth();
