import dotenv from 'dotenv';
dotenv.config();

import { supabaseAdmin, supabaseDbService } from './supabaseDb.js';

async function createAdmin() {
  const email = 'admin@admin.com';
  const password = 'Admin123';
  const username = 'Admin';

  console.log('[INFO] Creating admin user...\n');

  try {
    // Step 1: Check if user already exists
    console.log('[1] Checking if user exists...');
    const existingUser = await supabaseDbService.getUserByEmail(email);

    if (existingUser) {
      console.log('[WARN] User already exists with ID:', existingUser.id);
      console.log('   Skipping creation...\n');

      // Check if already admin
      const { data: adminCheck } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .eq('id', existingUser.id)
        .single();

      if (adminCheck) {
        console.log('[OK] User is already an admin!\n');
        console.log('[INFO] Credentials:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        console.log(`   UUID: ${existingUser.id}\n`);
        process.exit(0);
      } else {
        console.log('[WARN] User exists but is not admin. Making them admin...');
        await supabaseAdmin
          .from('admin_users')
          .insert([{ id: existingUser.id, role: 'admin' }]);
        console.log('[OK] User is now admin!\n');
        process.exit(0);
      }
    }

    // Step 2: Create user in Supabase Auth
    console.log('[2] Creating user in Supabase Auth...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      console.error('[ERROR] Auth creation error:', authError.message);
      process.exit(1);
    }

    const userId = authData.user?.id;
    console.log('[OK] User created in Auth');
    console.log(`   UUID: ${userId}\n`);

    // Step 3: Create user profile
    console.log('[3] Creating user profile...');
    const profile = await supabaseDbService.createUser(
      userId || '',
      username,
      email,
      'https://api.dicebear.com/7.x/pixel-art/svg?seed=Admin'
    );
    console.log('[OK] Profile created');
    console.log(`   Username: ${profile.username}`);
    console.log(`   Coins: ${profile.coins}`);
    console.log(`   Gems: ${profile.gems}\n`);

    // Step 4: Make user admin
    console.log('[4] Making user admin...');
    const { error: adminError } = await supabaseAdmin
      .from('admin_users')
      .insert([{ id: userId, role: 'admin' }]);

    if (adminError) {
      console.error('[ERROR] Admin creation error:', adminError.message);
      process.exit(1);
    }

    console.log('[OK] User is now admin\n');

    // Step 5: Verify
    console.log('[5] Verifying credentials...');
    const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.admin.getUserById(userId || '');

    if (verifyError) {
      console.error('[ERROR] Verification error:', verifyError.message);
      process.exit(1);
    }

    console.log('[OK] Verification successful!\n');

    console.log('=' .repeat(50));
    console.log('[SUCCESS] ADMIN USER CREATED SUCCESSFULLY!\n');
    console.log('[INFO] Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   UUID: ${userId}\n`);
    console.log('[INFO] Next steps:');
    console.log('   1. Reload your browser (F5)');
    console.log('   2. Try logging in with the credentials above');
    console.log('   3. Go to Settings → Admin Panel');
    console.log('=' .repeat(50) + '\n');

    process.exit(0);

  } catch (e: any) {
    console.error('[ERROR] Error:', e.message);
    console.error('\nPossible causes:');
    console.error('   1. Supabase credentials not set in .env');
    console.error('   2. Network connectivity issue');
    console.error('   3. Database schema not fully executed');
    process.exit(1);
  }
}

createAdmin();
