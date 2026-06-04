const axios = require('axios');

const testInterns = [
  { email: 'sak4717@gmail.com', name: 'sahil singh' },
  { email: 'sak1@gmail.com', name: 'Shubham singh' },
  { email: 'satishgupta7949@gmail.com', name: 'Akshay Gupta' },
];

const commonPasswords = [
  'Password@123',
  'Test@123',
  'Admin@123',
  'Welcome@123',
  'Intern@123',
  'test123',
  'password',
];

async function testLogin() {
  for (const intern of testInterns) {
    console.log(`\nTesting ${intern.name} (${intern.email})...`);
    
    for (const pwd of commonPasswords) {
      try {
        const res = await axios.post('http://localhost:5000/api/auth/login', {
          email: intern.email,
          password: pwd,
        }, { timeout: 3000 });
        
        console.log(`✓ LOGIN SUCCESSFUL with password: ${pwd}`);
        console.log(`  Token: ${res.data?.data?.accessToken?.substring(0, 20)}...`);
        return { email: intern.email, password: pwd };
      } catch (err) {
        // Try next password
      }
    }
  }
  
  console.log('No successful login found with common passwords');
}

testLogin();
