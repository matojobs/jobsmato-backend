const axios = require('axios');

async function testLogin() {
  try {
    console.log('Logging in with correct password...');
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sak4717@gmail.com',
      password: '123456798',
    });
    
    const data = res.data?.data || res.data;
    const token = data?.accessToken;
    const user = data?.user || { id: data?.userId, email: data?.email };
    
    console.log(`✓ Login successful!`);
    console.log(`  User: ${user.email}`);
    console.log(`  Token: ${token?.substring(0, 30)}...`);
    
  } catch (err) {
    console.error('Error:', err.response?.data?.message || err.message);
  }
}

testLogin();
