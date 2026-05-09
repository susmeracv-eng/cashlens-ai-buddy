import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zrypzsqbmlplqkmwvurh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeXB6c3FibWxwbHFrbXd2dXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMwNTI2NCwiZXhwIjoyMDkzODgxMjY0fQ.PfV4TECwItnRrBh2NVBp302zET1eaR-1gnm0c0tlEJw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('Testing connection to Supabase...\n');
    
    // Test basic connection by querying the profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Connection Error:', error.message);
      return false;
    }
    
    console.log('✓ Connection successful!');
    console.log('✓ Profiles table is accessible');
    
    // Test transactions table
    const { error: txError } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);
    
    if (txError) {
      console.log('❌ Transactions table error:', txError.message);
      return false;
    }
    console.log('✓ Transactions table is accessible');
    
    // Test chat_messages table
    const { error: chatError } = await supabase
      .from('chat_messages')
      .select('*')
      .limit(1);
    
    if (chatError) {
      console.log('❌ Chat messages table error:', chatError.message);
      return false;
    }
    console.log('✓ Chat messages table is accessible');
    
    console.log('\n✓ All tables connected successfully!');
    return true;
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
