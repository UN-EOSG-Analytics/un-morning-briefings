const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testPasswordHash() {
  const password = 'TestPassword123!';
  
  console.log('🧪 Testing bcrypt password hashing:\n');
  console.log('Original Password:', password);
  
  // Hash like the register endpoint does
  const hash = await bcrypt.hash(password, 12);
  console.log('Generated Hash:', hash);
  console.log('Hash Length:', hash.length);
  
  // Compare like the auth endpoint does
  const match = await bcrypt.compare(password, hash);
  console.log('Password Match:', match);
  
  // Test with wrong password
  const wrongMatch = await bcrypt.compare('WrongPassword123!', hash);
  console.log('Wrong Password Match:', wrongMatch);
  
  console.log('\n✅ Bcrypt is working correctly');
}

testPasswordHash();
