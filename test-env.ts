import 'dotenv/config';

console.log('🔍 Environment Variable Check');
console.log('═══════════════════════════════════════════════════\n');

console.log('PRIVATE_KEY:', process.env.PRIVATE_KEY ? '✅ Set (hidden)' : '❌ Not set');
console.log('UNICHAIN_RPC_URL:', process.env.UNICHAIN_RPC_URL || '❌ Not set');

if (!process.env.UNICHAIN_RPC_URL) {
  console.log('\n❌ UNICHAIN_RPC_URL is not set!');
  console.log('\n💡 Your .env file should look like this:');
  console.log('─────────────────────────────────────────────────');
  console.log('PRIVATE_KEY=your_private_key_here');
  console.log('UNICHAIN_RPC_URL=https://unichain-sepolia.g.alchemy.com/v2/gVhqfCv5N1c_OFl_swwDj');
  console.log('─────────────────────────────────────────────────');
  console.log('\n⚠️  Make sure:');
  console.log('1. No spaces around the = sign');
  console.log('2. No quotes around the values');
  console.log('3. The .env file is in the root of your project');
} else {
  console.log('\n✅ Environment looks good!');
  console.log('\nRPC URL:', process.env.UNICHAIN_RPC_URL);
}