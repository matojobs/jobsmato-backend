# 🌐 Frontend Integration Guide

This guide provides everything the frontend team needs to integrate with the Jobsmato backend API.

## 🚀 Quick Start

### API Base URLs

**Production (Recommended):**
```typescript
const API_BASE_URL = 'https://api.jobsmato.com/api';
```

**Development:**
```typescript
const API_BASE_URL = 'http://localhost:5000/api';
```

**Fallback (HTTP):**
```typescript
const API_BASE_URL = 'http://15.134.85.184:5004/api';
```

## 🔧 Environment Configuration

### React/Next.js Environment Variables

Create these files in your frontend project:

**`.env.production`:**
```env
REACT_APP_API_URL=https://api.jobsmato.com/api
REACT_APP_ENVIRONMENT=production
```

**`.env.development`:**
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENVIRONMENT=development
```

**`.env.local`:**
```env
REACT_APP_API_URL=https://api.jobsmato.com/api
REACT_APP_ENVIRONMENT=production
```

### API Configuration

**`src/config/api.ts`:**
```typescript
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'https://api.jobsmato.com/api',
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      FORGOT_PASSWORD: '/auth/forgot-password',
      RESET_PASSWORD: '/auth/reset-password',
      REFRESH: '/auth/refresh',
      PROFILE: '/auth/profile',
    },
    JOBS: {
      LIST: '/jobs',
      CREATE: '/jobs',
      GET: (id: number) => `/jobs/${id}`,
      UPDATE: (id: number) => `/jobs/${id}`,
      DELETE: (id: number) => `/jobs/${id}`,
      FEATURED: '/jobs/featured',
      CATEGORIES: '/jobs/categories',
    },
    APPLICATIONS: {
      LIST: '/applications',
      CREATE: '/applications',
      GET: (id: number) => `/applications/${id}`,
      UPDATE_STATUS: (id: number) => `/applications/${id}/status`,
      DELETE: (id: number) => `/applications/${id}`,
    },
    USERS: {
      PROFILE: '/users/profile',
      UPDATE_PROFILE: '/users/profile',
      JOB_SEEKER_PROFILE: '/users/job-seeker-profile',
      UPDATE_JOB_SEEKER_PROFILE: '/users/job-seeker-profile',
    },
    COMPANIES: {
      LIST: '/companies',
      CREATE: '/companies',
      GET: (id: number) => `/companies/${id}`,
      UPDATE: (id: number) => `/companies/${id}`,
      DELETE: (id: number) => `/companies/${id}`,
    },
  },
};

export default API_CONFIG;
```

## 🔐 Authentication

### Login Request
```typescript
const login = async (email: string, password: string) => {
  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGIN}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for CORS
    body: JSON.stringify({ email, password }),
  });
  
  if (!response.ok) {
    throw new Error('Login failed');
  }
  
  const data = await response.json();
  return data;
};
```

### Register Request
```typescript
const register = async (userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'JOB_SEEKER' | 'EMPLOYER';
}) => {
  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REGISTER}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(userData),
  });
  
  if (!response.ok) {
    throw new Error('Registration failed');
  }
  
  const data = await response.json();
  return data;
};
```

### Forgot Password
```typescript
const forgotPassword = async (email: string) => {
  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to send reset email');
  }
  
  return response.ok;
};
```

### Reset Password
```typescript
const resetPassword = async (token: string, password: string) => {
  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ token, password }),
  });
  
  if (!response.ok) {
    throw new Error('Password reset failed');
  }
  
  return response.ok;
};
```

### Authenticated Requests
```typescript
const getProfile = async (token: string) => {
  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.PROFILE}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }
  
  const data = await response.json();
  return data;
};
```

## 📋 Job Management

### Fetch Jobs
```typescript
const fetchJobs = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  location?: string;
  type?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
  }
  
  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOBS.LIST}?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch jobs');
  }
  
  const data = await response.json();
  return data;
};
```

### Create Job (Employers Only)
```typescript
const createJob = async (jobData: {
  title: string;
  description: string;
  requirements: string;
  benefits?: string;
  salary?: string;
  location: string;
  type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
  category: string;
  experienceLevel: 'ENTRY' | 'MID' | 'SENIOR' | 'EXECUTIVE';
  isRemote: boolean;
  applicationDeadline?: string;
}, token: string) => {
  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOBS.CREATE}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(jobData),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create job');
  }
  
  const data = await response.json();
  return data;
};
```

## 📄 Job Applications

### Apply for Job
```typescript
const applyForJob = async (applicationData: {
  jobId: number;
  coverLetter?: string;
  resume?: string;
}, token: string) => {
  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.APPLICATIONS.CREATE}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(applicationData),
  });
  
  if (!response.ok) {
    throw new Error('Failed to submit application');
  }
  
  const data = await response.json();
  return data;
};
```

### Get User Applications
```typescript
const getUserApplications = async (token: string) => {
  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.APPLICATIONS.LIST}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch applications');
  }
  
  const data = await response.json();
  return data;
};
```

## 🏢 Company Management

### Create Company Profile
```typescript
const createCompany = async (companyData: {
  name: string;
  description: string;
  website?: string;
  industry: string;
  size: 'STARTUP' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  location: string;
  foundedYear?: number;
}, token: string) => {
  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.COMPANIES.CREATE}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(companyData),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create company');
  }
  
  const data = await response.json();
  return data;
};
```

## 🔧 Error Handling

### API Error Handler
```typescript
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }
  return response;
};
```

### Global Error Handler
```typescript
const apiCall = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Always include credentials for CORS
    });
    
    await handleApiError(response);
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
```

## 🚨 Important Notes

### CORS Configuration
- **Credentials**: Always include `credentials: 'include'` in fetch requests
- **Headers**: Use proper Content-Type headers
- **Origin**: All origins are now allowed (`origin: true`)
- **Universal Access**: API can be accessed from any domain

### SSL/HTTPS
- **Production**: Use HTTPS endpoint (`https://api.jobsmato.com/api`) - Valid SSL Certificate
- **Development**: Can use HTTP (`http://localhost:5000/api`)
- **Mixed Content**: Avoid mixing HTTP and HTTPS

### Authentication
- **JWT Tokens**: Store securely (httpOnly cookies recommended)
- **Token Refresh**: Implement automatic token refresh
- **Logout**: Clear tokens on logout

### JWT Expiration Times
- **Candidates (JOB_SEEKER)**: 
  - Access Token: **7 days**
  - Refresh Token: **30 days**
- **Employers & Admins**: 
  - Access Token: **15 minutes**
  - Refresh Token: **7 days**
- **Role-based**: Different expiration times based on user role

### File Uploads
- **Resume Upload**: Files are stored in Google Drive
- **File Types**: PDF, DOC, DOCX supported
- **File Size**: Max 5MB per file

## 🧪 Testing

### Test API Connection
```typescript
const testConnection = async () => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/health`);
    if (response.ok) {
      console.log('✅ API connection successful');
    } else {
      console.error('❌ API connection failed');
    }
  } catch (error) {
    console.error('❌ API connection error:', error);
  }
};
```

### Test CORS
```typescript
const testCORS = async () => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/jobs`, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    
    if (response.ok) {
      console.log('✅ CORS preflight successful');
    } else {
      console.error('❌ CORS preflight failed');
    }
  } catch (error) {
    console.error('❌ CORS test error:', error);
  }
};
```

## 📞 Support

For integration issues:
1. Check the [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)
2. Review the [CHANGELOG.md](./CHANGELOG.md)
3. Test API endpoints directly
4. Check browser console for CORS errors
5. Contact the backend team

---

**Last Updated:** September 25, 2025  
**API Version:** 1.2.0  
**Status:** Production Ready ✅
