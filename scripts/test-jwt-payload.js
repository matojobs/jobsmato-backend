/**
 * Decode JWT to check payload
 */
const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjUsImVtYWlsIjoicmVjcnVpdGVyQHRlc3QuY29tIiwicm9sZSI6InJlY3J1aXRlciIsImlhdCI6MTc3MTQ5NzcyOSwiZXhwIjoxNzcxNDk4NjI5fQ.DpVhvt8DV0jvlB8R8G0ndiKY5u5yPBuqlky6To36p8Q';

try {
  const decoded = jwt.decode(token);
  console.log('JWT Payload:', JSON.stringify(decoded, null, 2));
  console.log('\nRole value:', decoded.role);
  console.log('Role type:', typeof decoded.role);
} catch (e) {
  console.error('Error:', e.message);
}
