const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ebdkupeqmpqrdfketgab.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZGt1cGVxbXBxcmRma2V0Z2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNzIyNzAsImV4cCI6MjA5NTg0ODI3MH0.Du_pTFR71yw4HaMr0ZCbdjqtB7tV8g9TSltH8dB_Clc'
);

async function testLogin() {
  console.log("=== TEST GURU ===");
  // Test RPC Guru
  const { data: guruEmail, error: rpcErr1 } = await supabase.rpc('get_login_email_by_identifier', { p_identifier: 'EMP001' });
  console.log("RPC Guru Result:", { guruEmail, rpcErr1 });

  if (guruEmail) {
    const { data: authDataGuru, error: authErrGuru } = await supabase.auth.signInWithPassword({
      email: guruEmail,
      password: 'sekolah123'
    });
    console.log("Login Guru (sekolah123):", { user: authDataGuru?.user?.id, error: authErrGuru?.message });

    if (authDataGuru?.user) {
      const { data: linkData, error: linkErr } = await supabase.rpc('link_my_account');
      console.log("RPC link_my_account (Guru):", { data: linkData, error: linkErr?.message });
    }

    if (authErrGuru && authErrGuru.message.includes('Invalid login')) {
      const { data: authData1b, error: authErr1b } = await supabase.auth.signInWithPassword({
        email: guruEmail,
        password: 'password123'
      });
      console.log("Login Guru (password123):", { user: authData1b?.user?.id, error: authErr1b?.message });
    }
  }

  console.log("\n=== TEST PARENT ===");
  // Test RPC Parent
  const { data: parentEmail, error: rpcErr2 } = await supabase.rpc('get_parent_login_email_by_student', { p_nisn: '0102030407', p_nis: '2425003' });
  console.log("RPC Parent Result:", { parentEmail, rpcErr2 });

  if (parentEmail) {
    const { data: authData2, error: authErr2 } = await supabase.auth.signInWithPassword({
      email: parentEmail,
      password: 'parent123'
    });
    console.log("Login Parent (parent123):", { user: authData2?.user?.id, error: authErr2?.message });

    const { data: authData2b, error: authErr2b } = await supabase.auth.signInWithPassword({
      email: parentEmail,
      password: 'password123'
    });
    console.log("Login Parent (password123):", { user: authData2b?.user?.id, error: authErr2b?.message });
  }

  console.log("\n=== TEST FRESH GURU ===");
  const { data: guruFreshEmail, error: rpcErrFreshGuru } = await supabase.rpc('get_login_email_by_identifier', { p_identifier: 'EMP999' });
  console.log("RPC Fresh Guru:", { guruFreshEmail, rpcErrFreshGuru });
  if (guruFreshEmail) {
    const { data: authDataFreshGuru, error: authErrFreshGuru } = await supabase.auth.signUp({
      email: guruFreshEmail,
      password: 'sekolah123'
    });
    console.log("SignUp Fresh Guru:", { user: authDataFreshGuru?.user?.id, error: authErrFreshGuru?.message });
  }

  console.log("\n=== TEST FRESH PARENT ===");
  const { data: parentFreshEmail, error: rpcErrFreshParent } = await supabase.rpc('get_parent_login_email_by_student', { p_nisn: '0102030407', p_nis: '2425003' });
  console.log("RPC Fresh Parent:", { parentFreshEmail, rpcErrFreshParent });
  if (parentFreshEmail) {
    const { data: authDataFreshParent, error: authErrFreshParent } = await supabase.auth.signUp({
      email: parentFreshEmail,
      password: 'parent123'
    });
    console.log("SignUp Fresh Parent:", { user: authDataFreshParent?.user?.id, session: !!authDataFreshParent?.session, error: authErrFreshParent?.message });
  }

  console.log("\n=== TEST FAKE ===");
  const fakeEmail = 'newfake' + Date.now() + '@doesnotexist.com';
  const { data: authDataFake, error: authErrFake } = await supabase.auth.signUp({
    email: fakeEmail,
    password: 'password123'
  });
  console.log("SignUp Fake:", { user: authDataFake?.user?.id, session: !!authDataFake?.session, error: authErrFake?.message });

  const { data: authDataFakeLogin, error: authErrFakeLogin } = await supabase.auth.signInWithPassword({
    email: fakeEmail,
    password: 'password123'
  });
  console.log("Login Fake (After Signup):", { user: authDataFakeLogin?.user?.id, error: authErrFakeLogin?.message });
}

testLogin();
