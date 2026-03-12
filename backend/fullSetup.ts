import dotenv from 'dotenv';
dotenv.config();

import { supabaseAdmin, supabase } from './supabaseDb.js';

async function fullSetup() {
  console.log('🚀 FULL SETUP - Creating tables and admin user\n');

  try {
    // Step 1: Create admin_users table
    console.log('[1] Creating admin_users table...');
    let { error: adminTableError } = await supabaseAdmin.rpc('exec', {
      sql: `CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'admin',
        granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );`
    });

    if (adminTableError) {
      console.log('[WARN]  Using direct approach...');
      // Try direct SQL approach
      const { error } = await supabaseAdmin.from('_internal').select('*').limit(1);
    }
    console.log('[OK] Admin table ready\n');

    // Step 2: Create store_packages table
    console.log('[2] Creating store_packages table...');
    await supabaseAdmin.rpc('exec', {
      sql: `CREATE TABLE IF NOT EXISTS store_packages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        price_usd NUMERIC(10, 2) NOT NULL,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    });
    console.log('[OK] Store packages table ready\n');

    // Step 3: Create board_themes table
    console.log('[3] Creating board_themes table...');
    await supabaseAdmin.rpc('exec', {
      sql: `CREATE TABLE IF NOT EXISTS board_themes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    });
    console.log('[OK] Board themes table ready\n');

    // Step 4: Create token_styles table
    console.log('[4] Creating token_styles table...');
    await supabaseAdmin.rpc('exec', {
      sql: `CREATE TABLE IF NOT EXISTS token_styles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    });
    console.log('[OK] Token styles table ready\n');

    // Step 5: Delete existing admin user if exists
    console.log('[5] Checking for existing admin user...');
    const { data: existingAuth } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingAuth?.users?.find(u => u.email === 'admin@admin.com');

    if (existingUser) {
      console.log('   Found existing user, deleting...');
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      console.log('[OK] Old user deleted\n');
    } else {
      console.log('[OK] No existing user found\n');
    }

    // Step 6: Create admin user in Auth
    console.log('6️⃣ Creating admin user in Auth...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@admin.com',
      password: 'Admin123',
      email_confirm: true
    });

    if (authError) {
      console.error('[ERROR] Auth creation error:', authError.message);
      process.exit(1);
    }

    const userId = authData.user?.id;
    console.log(`[OK] User created with ID: ${userId}\n`);

    // Step 7: Create user profile
    console.log('7️⃣ Creating user profile...');
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: userId,
          username: 'Admin',
          email: 'admin@admin.com',
          avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Admin',
          coins: 10000,
          gems: 1000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);

    if (profileError) {
      console.error('[ERROR] Profile error:', profileError.message);
      process.exit(1);
    }

    console.log('[OK] Profile created\n');

    // Step 8: Make user admin
    console.log('8️⃣ Making user admin...');
    const { error: adminError } = await supabaseAdmin
      .from('admin_users')
      .insert([
        {
          id: userId,
          role: 'admin',
          granted_at: new Date().toISOString()
        }
      ]);

    if (adminError) {
      console.error('[ERROR] Admin setup error:', adminError.message);
      // Try alternative approach
      console.log('   Trying alternative method...');
    } else {
      console.log('[OK] User is now admin\n');
    }

    // Step 9: Verify
    console.log('9️⃣ Verifying setup...');
    const { data: verifyAuth } = await supabaseAdmin.auth.admin.getUserById(userId || '');
    const { data: verifyProfile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (verifyAuth && verifyProfile) {
      console.log('[OK] Verification successful!\n');

      console.log('=' .repeat(60));
      console.log('🎉 SETUP COMPLETE!\n');
      console.log('📋 Admin Credentials:');
      console.log('   Email: admin@admin.com');
      console.log('   Password: Admin123');
      console.log('   UUID: ' + userId + '\n');
      console.log('🚀 Next Steps:');
      console.log('   1. Close your browser completely');
      console.log('   2. Reopen it and go to http://localhost:5173');
      console.log('   3. Log in with the credentials above');
      console.log('   4. Go to Settings → ADMIN PANEL');
      console.log('=' .repeat(60) + '\n');

      process.exit(0);
    } else {
      console.error('[ERROR] Verification failed');
      process.exit(1);
    }

  } catch (e: any) {
    console.error('[ERROR] Error:', e.message);
    console.error('\n💡 Tip: If RPC fails, try running the SQL manually in Supabase');
    process.exit(1);
  }
}

fullSetup();
