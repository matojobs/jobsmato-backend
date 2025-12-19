const axios = require('axios');

const API_BASE = 'http://localhost:5003'; // Updated API base URL

// Sample data
const sampleUsers = [
  {
    email: 'john.doe@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    role: 'job_seeker'
  },
  {
    email: 'jane.smith@example.com',
    password: 'password123',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'job_seeker'
  },
  {
    email: 'mike.johnson@techcorp.com',
    password: 'password123',
    firstName: 'Mike',
    lastName: 'Johnson',
    role: 'employer'
  },
  {
    email: 'sarah.wilson@innovate.com',
    password: 'password123',
    firstName: 'Sarah',
    lastName: 'Wilson',
    role: 'employer'
  }
];

const sampleCompanies = [
  {
    name: 'TechCorp Solutions',
    description: 'Leading technology company specializing in AI and machine learning solutions.',
    website: 'https://techcorp.com',
    industry: 'Technology',
    size: 'large',
    location: 'San Francisco, CA',
    foundedYear: 2015
  },
  {
    name: 'Innovate Labs',
    description: 'Innovative startup focused on creating cutting-edge software products.',
    website: 'https://innovate.com',
    industry: 'Software',
    size: 'startup',
    location: 'Austin, TX',
    foundedYear: 2020
  },
  {
    name: 'Global Finance Inc',
    description: 'International financial services company with offices worldwide.',
    website: 'https://globalfinance.com',
    industry: 'Finance',
    size: 'enterprise',
    location: 'New York, NY',
    foundedYear: 1995
  }
];

const sampleJobs = [
  {
    title: 'Senior Full Stack Developer',
    description: 'We are looking for an experienced full-stack developer to join our growing team. You will be responsible for developing and maintaining our web applications using modern technologies.',
    requirements: '5+ years of experience with React, Node.js, and PostgreSQL. Strong understanding of RESTful APIs and microservices architecture.',
    benefits: 'Competitive salary, health insurance, flexible working hours, remote work options, professional development budget.',
    salary: '$120,000 - $150,000',
    location: 'San Francisco, CA',
    type: 'full_time',
    category: 'Software Development',
    experienceLevel: 'senior_level',
    isFeatured: true,
    isUrgent: false,
    isRemote: false
  },
  {
    title: 'UX/UI Designer',
    description: 'Join our design team to create beautiful and intuitive user experiences. You will work closely with product managers and developers to bring designs to life.',
    requirements: '3+ years of UX/UI design experience. Proficiency in Figma, Sketch, and Adobe Creative Suite. Strong portfolio demonstrating user-centered design.',
    benefits: 'Creative work environment, design tools budget, team building events, career growth opportunities.',
    salary: '$80,000 - $100,000',
    location: 'Austin, TX',
    type: 'full_time',
    category: 'Design',
    experienceLevel: 'mid_level',
    isFeatured: true,
    isUrgent: false,
    isRemote: false
  },
  {
    title: 'Data Scientist',
    description: 'Help us extract insights from large datasets and build machine learning models. Work with cross-functional teams to solve complex business problems.',
    requirements: 'PhD in Data Science, Statistics, or related field. Experience with Python, R, TensorFlow, and cloud platforms. Strong analytical and problem-solving skills.',
    benefits: 'Competitive salary, stock options, research budget, conference attendance, flexible schedule.',
    salary: '$110,000 - $140,000',
    location: 'New York, NY',
    type: 'full_time',
    category: 'Data Science',
    experienceLevel: 'senior_level',
    isFeatured: true,
    isUrgent: false,
    isRemote: false
  },
  {
    title: 'Marketing Manager',
    description: 'Lead our marketing efforts and drive user acquisition. Develop and execute marketing strategies across multiple channels.',
    requirements: '5+ years of marketing experience. Strong knowledge of digital marketing, SEO, SEM, and social media. Experience with marketing automation tools.',
    benefits: 'Performance bonuses, marketing budget, team leadership opportunities, professional development.',
    salary: '$70,000 - $90,000',
    location: 'Remote',
    type: 'full_time',
    category: 'Marketing',
    experienceLevel: 'mid_level',
    isFeatured: false,
    isUrgent: false,
    isRemote: true
  },
  {
    title: 'DevOps Engineer',
    description: 'Build and maintain our cloud infrastructure. Ensure high availability and scalability of our systems.',
    requirements: '4+ years of DevOps experience. Proficiency in AWS, Docker, Kubernetes, and CI/CD pipelines. Strong scripting skills in Python or Bash.',
    benefits: 'Generous vacation time, professional development budget, cutting-edge technology exposure, team collaboration.',
    salary: '$100,000 - $130,000',
    location: 'Austin, TX',
    type: 'full_time',
    category: 'DevOps',
    experienceLevel: 'mid_level',
    isFeatured: true,
    isUrgent: true,
    isRemote: false
  },
  {
    title: 'Product Manager',
    description: 'Define product vision and strategy. Work with engineering and design teams to deliver exceptional products.',
    requirements: '7+ years of product management experience. Strong analytical skills, user research experience, and technical background. MBA preferred.',
    benefits: 'Equity participation, performance bonuses, leadership development, cross-functional collaboration.',
    salary: '$130,000 - $160,000',
    location: 'San Francisco, CA',
    type: 'full_time',
    category: 'Product Management',
    experienceLevel: 'executive',
    isFeatured: true,
    isUrgent: false,
    isRemote: false
  }
];

async function createSampleData() {
  console.log('🌱 Starting to create sample data...');
  let token = '';
  const users = [];

  try {
    // Register users
    console.log('👥 Creating users...');
    for (const userData of sampleUsers) {
      try {
        const response = await axios.post(`${API_BASE}/api/auth/register`, userData);
        users.push(response.data);
        console.log(`✅ Created user: ${userData.email}`);
      } catch (error) {
        console.log(`⚠️  User ${userData.email} might already exist`);
      }
    }

    // Get authentication token for employer users
    const employerLogin = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'mike.johnson@techcorp.com',
      password: 'password123'
    });
    token = employerLogin.data.accessToken;

    // Create companies
    console.log('🏢 Creating companies...');
    const companies = [];
    for (let i = 0; i < sampleCompanies.length; i++) {
      try {
        const response = await axios.post(`${API_BASE}/api/companies`, {
          ...sampleCompanies[i],
          userId: users[i + 2].userId || users[i + 2].id // Employer users
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        companies.push(response.data);
        console.log(`✅ Created company: ${sampleCompanies[i].name}`);
      } catch (error) {
        console.log(`⚠️  Company ${sampleCompanies[i].name} might already exist`);
      }
    }

    // Create jobs
    console.log('💼 Creating jobs...');
    for (let i = 0; i < sampleJobs.length; i++) {
      try {
        const companyId = companies[i % companies.length].id;
        const response = await axios.post(`${API_BASE}/api/jobs`, {
          ...sampleJobs[i],
          companyId
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ Created job: ${sampleJobs[i].title}`);
      } catch (error) {
        console.log(`⚠️  Job ${sampleJobs[i].title} might already exist`);
        console.error('Error details:', error.response?.data);
      }
    }

    console.log('\n🎉 Sample data creation completed!');
    console.log('\n📊 Summary:');
    console.log(`- Users created: ${users.length}`);
    console.log(`- Companies created: ${companies.length}`);
    console.log(`- Jobs created: ${sampleJobs.length}`);

    console.log('\n🔗 Test the API:');
    console.log(`- Swagger UI: ${API_BASE}/api/docs`);
    console.log(`- Health check: ${API_BASE}/health`);
    console.log(`- Jobs endpoint: ${API_BASE}/api/jobs`);

  } catch (error) {
    console.error('❌ Error creating sample data:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

createSampleData();
