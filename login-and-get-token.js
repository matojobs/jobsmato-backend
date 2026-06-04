const axios = require('axios');

async function loginAndGetToken() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sak4717@gmail.com',
      password: '123456798',
    });
    
    const token = res.data?.data?.accessToken;
    if (token) {
      console.log(token);
    }
  } catch (err) {
    console.error('Error:', err.response?.data?.message || err.message);
  }
}

loginAndGetToken();
