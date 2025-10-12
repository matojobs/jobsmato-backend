# Frontend Admin Integration Guide

## 🎯 **Admin Backend Changes for Frontend Integration**

This document outlines the new admin functionality implemented in the backend and how the frontend can integrate with it.

## 🚀 **New Admin API Endpoints**

### **Base URL:** `http://localhost:5001`

### **Authentication Endpoints**
```typescript
// Admin Login
POST /api/auth/login
{
  "email": "admin@jobsmato.com",
  "password": "password"
}
// Returns: { accessToken, refreshToken, userId, email, fullName, role }

// Get Admin Permissions
GET /api/admin/auth/permissions
Headers: { Authorization: "Bearer <token>" }
// Returns: { permissions: string[], role: "admin", isAdmin: true }
```

### **Dashboard & Analytics**
```typescript
// Get Overall Statistics
GET /api/admin/dashboard/stats
Headers: { Authorization: "Bearer <token>" }

// Get User Analytics
GET /api/admin/dashboard/analytics/users
Headers: { Authorization: "Bearer <token>" }

// Get Job Analytics
GET /api/admin/dashboard/analytics/jobs
Headers: { Authorization: "Bearer <token>" }

// Get Application Analytics
GET /api/admin/dashboard/analytics/applications
Headers: { Authorization: "Bearer <token>" }
```

### **User Management**
```typescript
// List Users (with filtering)
GET /api/admin/users?page=1&limit=10&role=job_seeker&status=active
Headers: { Authorization: "Bearer <token>" }

// Get User Details
GET /api/admin/users/:id
Headers: { Authorization: "Bearer <token>" }

// Update User
PUT /api/admin/users/:id
Headers: { Authorization: "Bearer <token>" }
Body: { firstName, lastName, email, role, status, isActive, isVerified }

// Delete User
DELETE /api/admin/users/:id
Headers: { Authorization: "Bearer <token>" }

// Verify User
POST /api/admin/users/:id/verify
Headers: { Authorization: "Bearer <token>" }

// Suspend User
POST /api/admin/users/:id/suspend
Headers: { Authorization: "Bearer <token>" }
Body: { reason, duration }
```

### **Company Management**
```typescript
// List Companies
GET /api/admin/companies?page=1&limit=10&status=pending
Headers: { Authorization: "Bearer <token>" }

// Get Company Details
GET /api/admin/companies/:id
Headers: { Authorization: "Bearer <token>" }

// Update Company Status
PUT /api/admin/companies/:id/status
Headers: { Authorization: "Bearer <token>" }
Body: { status: "approved" | "rejected" | "suspended", adminNotes }

// Verify Company
POST /api/admin/companies/:id/verify
Headers: { Authorization: "Bearer <token>" }
```

### **Job Management**
```typescript
// List Jobs
GET /api/admin/jobs?page=1&limit=10&status=pending&industry=technology
Headers: { Authorization: "Bearer <token>" }

// Get Job Details
GET /api/admin/jobs/:id
Headers: { Authorization: "Bearer <token>" }

// Update Job Status
PUT /api/admin/jobs/:id/status
Headers: { Authorization: "Bearer <token>" }
Body: { status: "approved" | "rejected" | "suspended", adminNotes }

// Bulk Job Actions
POST /api/admin/jobs/bulk-action
Headers: { Authorization: "Bearer <token>" }
Body: { action: "approve" | "reject" | "suspend", jobIds: number[] }
```

### **Bulk Upload System**
```typescript
// Validate Bulk Data
POST /api/admin/jobs/bulk-upload/validate
Headers: { Authorization: "Bearer <token>" }
Body: { data: any[], type: "jobs" | "companies" | "users" }

// Upload Bulk Data
POST /api/admin/jobs/bulk-upload/upload
Headers: { Authorization: "Bearer <token>" }
Body: { data: any[], type: "jobs" | "companies" | "users" }

// Get Upload Status
GET /api/admin/jobs/bulk-upload/uploads/:id
Headers: { Authorization: "Bearer <token>" }

// List All Uploads
GET /api/admin/jobs/bulk-upload/uploads
Headers: { Authorization: "Bearer <token>" }
```

### **System Settings**
```typescript
// Get System Settings
GET /api/admin/settings
Headers: { Authorization: "Bearer <token>" }

// Update System Settings
PUT /api/admin/settings
Headers: { Authorization: "Bearer <token>" }
Body: { settings: { [key: string]: any } }
```

### **Activity Logs**
```typescript
// Get Activity Logs
GET /api/admin/activity-logs?page=1&limit=20&actionType=user_created&startDate=2023-01-01
Headers: { Authorization: "Bearer <token>" }

// Export Activity Logs
GET /api/admin/activity-logs/export?format=csv&startDate=2023-01-01&endDate=2023-12-31
Headers: { Authorization: "Bearer <token>" }
```

## 🔐 **Authentication & Authorization**

### **Admin User Credentials**
```typescript
const adminCredentials = {
  email: "admin@jobsmato.com",
  password: "password"
};
```

### **JWT Token Usage**
```typescript
// Store token after login
const token = response.data.accessToken;
localStorage.setItem('adminToken', token);

// Use token in all admin requests
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

### **Admin Permissions**
```typescript
const adminPermissions = [
  "view_dashboard",
  "view_analytics", 
  "view_users",
  "view_companies",
  "view_jobs",
  "edit_users",
  "delete_users",
  "verify_users",
  "suspend_users",
  "edit_companies",
  "verify_companies",
  "suspend_companies",
  "edit_jobs",
  "delete_jobs",
  "approve_jobs",
  "bulk_operations",
  "manage_settings",
  "view_logs",
  "export_data"
];
```

## 🎨 **Frontend Integration Examples**

### **Admin Login Component**
```typescript
const AdminLogin = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  
  const handleLogin = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      if (data.accessToken) {
        localStorage.setItem('adminToken', data.accessToken);
        // Redirect to admin dashboard
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
};
```

### **Admin Dashboard Component**
```typescript
const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const token = localStorage.getItem('adminToken');
  
  useEffect(() => {
    const fetchStats = async () => {
      const response = await fetch('/api/admin/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStats(data);
    };
    
    fetchStats();
  }, [token]);
  
  return (
    <div>
      <h1>Admin Dashboard</h1>
      {stats && (
        <div>
          <p>Total Users: {stats.totalUsers}</p>
          <p>Total Jobs: {stats.totalJobs}</p>
          <p>Total Companies: {stats.totalCompanies}</p>
        </div>
      )}
    </div>
  );
};
```

### **User Management Component**
```typescript
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('adminToken');
  
  const fetchUsers = async (page = 1, filters = {}) => {
    setLoading(true);
    const params = new URLSearchParams({ page, ...filters });
    const response = await fetch(`/api/admin/users?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setUsers(data.users);
    setLoading(false);
  };
  
  const verifyUser = async (userId) => {
    await fetch(`/api/admin/users/${userId}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchUsers(); // Refresh list
  };
  
  const suspendUser = async (userId, reason) => {
    await fetch(`/api/admin/users/${userId}/suspend`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });
    fetchUsers(); // Refresh list
  };
};
```

## 📊 **Data Models**

### **User Model (Enhanced)**
```typescript
interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'job_seeker' | 'employer' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt?: Date;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### **Company Model (Enhanced)**
```typescript
interface Company {
  id: number;
  name: string;
  description: string;
  website: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  adminStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  adminVerified: boolean;
  adminNotes?: string;
  adminReviewedAt?: Date;
  adminReviewedBy?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### **Job Model (Enhanced)**
```typescript
interface Job {
  id: number;
  title: string;
  description: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  status: 'active' | 'inactive' | 'closed';
  adminStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  adminNotes?: string;
  adminReviewedAt?: Date;
  adminReviewedBy?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🎯 **Frontend Implementation Checklist**

### **Required Components**
- [ ] Admin Login Page
- [ ] Admin Dashboard with Statistics
- [ ] User Management Interface
- [ ] Company Management Interface
- [ ] Job Management Interface
- [ ] Bulk Upload Interface
- [ ] System Settings Page
- [ ] Activity Logs Viewer

### **Required Features**
- [ ] JWT Token Management
- [ ] Role-based Access Control
- [ ] Permission-based UI Rendering
- [ ] Real-time Data Updates
- [ ] Bulk Operations Interface
- [ ] Export Functionality
- [ ] Audit Trail Display

### **Security Considerations**
- [ ] Token Storage (localStorage/sessionStorage)
- [ ] Token Expiration Handling
- [ ] Automatic Logout on Token Expiry
- [ ] Permission-based Route Protection
- [ ] Permission-based Component Rendering

## 🚀 **Getting Started**

1. **Set up authentication** with JWT token management
2. **Create admin routes** protected by role-based guards
3. **Implement permission checks** for UI components
4. **Build admin dashboard** with statistics and analytics
5. **Add user/company/job management** interfaces
6. **Implement bulk operations** for data management
7. **Add activity logging** and audit trail features

## 📚 **Additional Resources**

- **API Documentation:** Available at `/api/docs` when server is running
- **Backend Implementation:** See `ADMIN-BACKEND-IMPLEMENTATION.md`
- **Database Schema:** See `ADMIN-MIGRATION-GUIDE.md`
- **Deployment Guide:** See `DEPLOYMENT-COMPLETE.md`

---

**Frontend Integration Guide**  
**Admin Backend Version:** 1.0.0  
**Last Updated:** October 12, 2025  
**Status:** Ready for Frontend Integration ✅
