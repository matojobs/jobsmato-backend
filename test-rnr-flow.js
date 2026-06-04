const axios = require('axios');

async function testRNRFlow() {
  try {
    // Step 1: Login
    console.log('1. Logging in as Shubham (sak4717@gmail.com)...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sak4717@gmail.com',
      password: 'Test@123456',
    });
    
    const token = loginRes.data?.data?.accessToken;
    console.log(`   ✓ Login successful. Token: ${token?.substring(0, 20)}...`);
    
    // Step 2: Get enrollments
    console.log('\n2. Getting enrollments...');
    const enrollRes = await axios.get('http://localhost:5000/api/batch-tasks/my-tasks', {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const tasks = enrollRes.data?.data || enrollRes.data;
    console.log(`   ✓ Found ${tasks?.length || 0} tasks`);
    
    if (tasks && tasks.length > 0) {
      const task = tasks[0];
      console.log(`   Task: ${task.title}, Assigned: ${task.totalAssigned} candidates`);
      
      // Step 3: Get candidates
      console.log('\n3. Getting candidates for this task...');
      const candRes = await axios.get(
        `http://localhost:5000/api/batch-tasks/my-candidates?taskId=${task.id}&page=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const candidates = candRes.data?.data?.assignments || candRes.data?.assignments;
      console.log(`   ✓ Found ${candidates?.length || 0} candidates`);
      
      if (candidates && candidates.length > 0) {
        const candidate = candidates[0];
        console.log(`   Candidate: ${candidate.candidate?.name}`);
        console.log('\n✅ RNR BACK BUTTON TEST READY');
        console.log('   Frontend: Open task → click candidate → select RNR → click back button');
        console.log('   Expected: Back button should return to call_attempt step');
      }
    }
    
  } catch (err) {
    console.error('Error:', err.response?.data?.message || err.message);
  }
}

testRNRFlow();
