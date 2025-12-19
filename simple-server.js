// Simple backend server without external dependencies
const http = require('http');
const url = require('url');

const PORT = 5004;

// In-memory user storage (in production, use a database)
const users = [
  {
    id: 1,
    email: 'test@example.com',
    password: 'password123', // In production, hash passwords
    firstName: 'John',
    lastName: 'Doe',
    role: 'job_seeker',
    onboardingComplete: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    email: 'admin@example.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    onboardingComplete: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// Simple JWT-like token generation (in production, use proper JWT)
let tokenCounter = 1;
const tokens = new Map();

// Sample job data
const sampleJobs = [
  {
    id: 1,
    title: "Senior Frontend Developer",
    company: "TechCorp Inc.",
    location: "San Francisco, CA",
    type: "Full-time",
    category: "Engineering",
    salary: "₹12,00,000 - ₹15,00,000",
    description: "We are looking for a senior frontend developer with React experience.",
    requirements: ["5+ years React experience", "TypeScript", "CSS/SCSS"],
    postedAt: "2024-01-15",
    featured: true,
    hot: false
  },
  {
    id: 2,
    title: "Full Stack Developer",
    company: "StartupXYZ",
    location: "Remote",
    type: "Full-time",
    category: "Engineering",
    salary: "₹9,00,000 - ₹12,00,000",
    description: "Join our growing startup as a full stack developer.",
    requirements: ["3+ years experience", "Node.js", "React", "MongoDB"],
    postedAt: "2024-01-14",
    featured: true,
    hot: true
  },
  {
    id: 3,
    title: "UI/UX Designer",
    company: "DesignStudio",
    location: "New York, NY",
    type: "Contract",
    category: "Design",
    salary: "₹8,00,000 - ₹10,00,000",
    description: "Creative UI/UX designer needed for mobile app projects.",
    requirements: ["Figma", "Adobe Creative Suite", "3+ years experience"],
    postedAt: "2024-01-13",
    featured: false,
    hot: true
  },
  {
    id: 4,
    title: "DevOps Engineer",
    company: "CloudTech",
    location: "Austin, TX",
    type: "Full-time",
    category: "Engineering",
    salary: "₹11,00,000 - ₹14,00,000",
    description: "Manage our cloud infrastructure and deployment pipelines.",
    requirements: ["AWS", "Docker", "Kubernetes", "5+ years experience"],
    postedAt: "2024-01-12",
    featured: false,
    hot: false
  },
  {
    id: 5,
    title: "Product Manager",
    company: "ProductCo",
    location: "Seattle, WA",
    type: "Full-time",
    category: "Product",
    salary: "₹13,00,000 - ₹16,00,000",
    description: "Lead product strategy and roadmap for our SaaS platform.",
    requirements: ["MBA preferred", "5+ years PM experience", "SaaS background"],
    postedAt: "2024-01-11",
    featured: true,
    hot: false
  },
  {
    id: 6,
    title: "Data Scientist",
    company: "DataCorp",
    location: "Boston, MA",
    type: "Full-time",
    category: "Data",
    salary: "₹10,00,000 - ₹13,00,000",
    description: "Analyze large datasets and build ML models.",
    requirements: ["Python", "Machine Learning", "PhD preferred"],
    postedAt: "2024-01-10",
    featured: false,
    hot: true
  }
];

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

const server = http.createServer((req, res) => {
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const query = parsedUrl.query;

  console.log(`${req.method} ${path}`, query);

  try {
    if (path === '/api/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'OK', message: 'Jobsmato Backend API is running' }));
    }
    else if (path === '/api/auth/login' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const { email, password } = JSON.parse(body);
          const user = users.find(u => u.email === email && u.password === password);
          
          if (!user) {
            res.writeHead(401);
            res.end(JSON.stringify({ message: 'Invalid credentials' }));
            return;
          }
          
          // Generate token
          const token = `token_${tokenCounter++}_${Date.now()}`;
          tokens.set(token, { userId: user.id, email: user.email });
          
          // Return user data with token
          const { password: _, ...userWithoutPassword } = user;
          res.writeHead(200);
          res.end(JSON.stringify({
            accessToken: token,
            user: userWithoutPassword
          }));
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({ message: 'Invalid request body' }));
        }
      });
    }
    else if (path === '/api/auth/register' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const { email, password, firstName, lastName, role } = JSON.parse(body);
          
          // Check if user already exists
          if (users.find(u => u.email === email)) {
            res.writeHead(400);
            res.end(JSON.stringify({ message: 'User already exists' }));
            return;
          }
          
          // Create new user
          const newUser = {
            id: users.length + 1,
            email,
            password,
            firstName,
            lastName,
            role: role || 'job_seeker',
            onboardingComplete: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          users.push(newUser);
          
          // Generate token
          const token = `token_${tokenCounter++}_${Date.now()}`;
          tokens.set(token, { userId: newUser.id, email: newUser.email });
          
          // Return user data with token
          const { password: _, ...userWithoutPassword } = newUser;
          res.writeHead(201);
          res.end(JSON.stringify({
            accessToken: token,
            user: userWithoutPassword
          }));
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({ message: 'Invalid request body' }));
        }
      });
    }
    else if (path === '/api/auth/profile' && req.method === 'GET') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401);
        res.end(JSON.stringify({ message: 'No token provided' }));
        return;
      }
      
      const token = authHeader.substring(7);
      const tokenData = tokens.get(token);
      
      if (!tokenData) {
        res.writeHead(401);
        res.end(JSON.stringify({ message: 'Invalid token' }));
        return;
      }
      
      const user = users.find(u => u.id === tokenData.userId);
      if (!user) {
        res.writeHead(404);
        res.end(JSON.stringify({ message: 'User not found' }));
        return;
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.writeHead(200);
      res.end(JSON.stringify(userWithoutPassword));
    }
    else if (path === '/api/users/profile' && req.method === 'PATCH') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401);
        res.end(JSON.stringify({ message: 'No token provided' }));
        return;
      }
      
      const token = authHeader.substring(7);
      const tokenData = tokens.get(token);
      
      if (!tokenData) {
        res.writeHead(401);
        res.end(JSON.stringify({ message: 'Invalid token' }));
        return;
      }
      
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const updateData = JSON.parse(body);
          const userIndex = users.findIndex(u => u.id === tokenData.userId);
          
          if (userIndex === -1) {
            res.writeHead(404);
            res.end(JSON.stringify({ message: 'User not found' }));
            return;
          }
          
          // Update user data
          users[userIndex] = {
            ...users[userIndex],
            ...updateData,
            updatedAt: new Date().toISOString()
          };
          
          const { password: _, ...userWithoutPassword } = users[userIndex];
          res.writeHead(200);
          res.end(JSON.stringify(userWithoutPassword));
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({ message: 'Invalid request body' }));
        }
      });
    }
    else if (path === '/api/jobs') {
      const { page = 1, limit = 12, search, location, category, type } = query;
      
      // Validate parameters
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      
      if (isNaN(pageNum) || pageNum < 1) {
        res.writeHead(400);
        res.end(JSON.stringify({ 
          message: 'page must not be less than 1,page must be a number conforming to the specified constraints' 
        }));
        return;
      }
      
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        res.writeHead(400);
        res.end(JSON.stringify({ 
          message: 'limit must not be greater than 100,limit must not be less than 1,limit must be a number conforming to the specified constraints' 
        }));
        return;
      }
      
      let filteredJobs = [...sampleJobs];
      
      // Apply filters
      if (search) {
        filteredJobs = filteredJobs.filter(job => 
          job.title.toLowerCase().includes(search.toLowerCase()) ||
          job.company.toLowerCase().includes(search.toLowerCase()) ||
          job.description.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      if (location) {
        filteredJobs = filteredJobs.filter(job => 
          job.location.toLowerCase().includes(location.toLowerCase())
        );
      }
      
      if (category && category !== 'all') {
        filteredJobs = filteredJobs.filter(job => 
          job.category.toLowerCase() === category.toLowerCase()
        );
      }
      
      if (type && type !== 'all') {
        filteredJobs = filteredJobs.filter(job => 
          job.type.toLowerCase() === type.toLowerCase()
        );
      }
      
      // Pagination
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedJobs = filteredJobs.slice(startIndex, endIndex);
      
      const total = filteredJobs.length;
      const totalPages = Math.ceil(total / limitNum);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        jobs: paginatedJobs,
        total,
        totalPages,
        page: pageNum,
        limit: limitNum
      }));
    }
    else if (path === '/api/jobs/featured') {
      const featuredJobs = sampleJobs.filter(job => job.featured);
      res.writeHead(200);
      res.end(JSON.stringify({ jobs: featuredJobs }));
    }
    else if (path === '/api/jobs/hot') {
      const hotJobs = sampleJobs.filter(job => job.hot);
      res.writeHead(200);
      res.end(JSON.stringify({ jobs: hotJobs }));
    }
    else if (path.startsWith('/api/jobs/') && path !== '/api/jobs/featured' && path !== '/api/jobs/hot') {
      const jobId = parseInt(path.split('/')[3]);
      const job = sampleJobs.find(job => job.id === jobId);
      
      if (!job) {
        res.writeHead(404);
        res.end(JSON.stringify({ message: 'Job not found' }));
        return;
      }
      
      res.writeHead(200);
      res.end(JSON.stringify(job));
    }
    else if (path === '/api/upload/limits/info' && req.method === 'GET') {
      // Get upload limits and allowed file types
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        data: {
          maxFileSize: 5242880, // 5MB
          maxFileSizeMB: 5,
          allowedMimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'image/gif',
            'text/plain'
          ]
        }
      }));
    }
    else if (path.startsWith('/api/upload/') && req.method === 'POST') {
      // Mock file upload endpoint (for development/testing)
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401);
        res.end(JSON.stringify({ message: 'No token provided' }));
        return;
      }
      
      const token = authHeader.substring(7);
      const tokenData = tokens.get(token);
      
      if (!tokenData) {
        res.writeHead(401);
        res.end(JSON.stringify({ message: 'Invalid token' }));
        return;
      }

      // Mock upload response
      const mockFileId = `mock_file_${Date.now()}`;
      const mockFileName = req.headers['x-file-name'] || 'uploaded_file.pdf';
      
      res.writeHead(201);
      res.end(JSON.stringify({
        success: true,
        data: {
          fileId: mockFileId,
          fileName: mockFileName,
          fileUrl: `https://drive.google.com/file/d/${mockFileId}/view`,
          mimeType: 'application/pdf',
          size: 1024000 // 1MB mock size
        }
      }));
    }
    else if (path.startsWith('/api/upload/') && req.method === 'DELETE') {
      // Mock file deletion endpoint
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401);
        res.end(JSON.stringify({ message: 'No token provided' }));
        return;
      }
      
      const token = authHeader.substring(7);
      const tokenData = tokens.get(token);
      
      if (!tokenData) {
        res.writeHead(401);
        res.end(JSON.stringify({ message: 'Invalid token' }));
        return;
      }

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: 'File deleted successfully'
      }));
    }
    else {
      res.writeHead(404);
      res.end(JSON.stringify({ message: 'Not found' }));
    }
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ message: 'Internal server error' }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Jobsmato Backend API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💼 Jobs API: http://localhost:${PORT}/api/jobs`);
});
