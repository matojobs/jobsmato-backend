# Experience Field Update Documentation

## 🎯 **Overview**

The `experienceLevel` field in the Job entity has been updated to `experience` with numeric values instead of string enums. This change provides more flexibility and better data representation for experience levels.

## 📋 **Changes Made**

### **1. Entity Changes**

#### **Before (Old Implementation)**
```typescript
export enum ExperienceLevel {
  ENTRY_LEVEL = 'entry_level',
  MID_LEVEL = 'mid_level',
  SENIOR_LEVEL = 'senior_level',
  EXECUTIVE = 'executive',
}

@Column({
  type: 'enum',
  enum: ExperienceLevel,
  nullable: true,
})
experienceLevel: ExperienceLevel;
```

#### **After (New Implementation)**
```typescript
// Experience levels as numeric values (years of experience)
// 0 = Entry level (0-1 years)
// 1 = Junior level (1-3 years) 
// 2 = Mid level (3-5 years)
// 3 = Senior level (5-8 years)
// 4 = Executive level (8+ years)
export enum Experience {
  ENTRY = 0,
  JUNIOR = 1,
  MID = 2,
  SENIOR = 3,
  EXECUTIVE = 4,
}

@Column({
  type: 'int',
  nullable: true,
})
@Index()
experience: number;
```

### **2. DTO Changes**

#### **Before**
```typescript
@ApiProperty({ example: ExperienceLevel.SENIOR_LEVEL, enum: ExperienceLevel, required: false })
@IsOptional()
@IsEnum(ExperienceLevel)
experienceLevel?: ExperienceLevel;
```

#### **After**
```typescript
@ApiProperty({ example: 3, description: 'Experience level: 0=Entry, 1=Junior, 2=Mid, 3=Senior, 4=Executive', required: false })
@IsOptional()
@IsInt()
@Min(0)
@Max(4)
experience?: number;
```

### **3. Database Migration**

A migration has been created to:
- Add the new `experience` column (integer type)
- Migrate existing data from `experienceLevel` to `experience`
- Drop the old `experienceLevel` column
- Add proper indexing for performance

#### **Data Mapping**
| Old Value | New Value | Description |
|-----------|-----------|-------------|
| `entry_level` | `0` | Entry level (0-1 years) |
| `mid_level` | `2` | Mid level (3-5 years) |
| `senior_level` | `3` | Senior level (5-8 years) |
| `executive` | `4` | Executive level (8+ years) |

## 🔧 **API Changes**

### **Request/Response Format**

#### **Create Job Request**
```json
{
  "title": "Senior Software Engineer",
  "description": "We are looking for an experienced software engineer...",
  "requirements": "5+ years of experience in software development",
  "benefits": "Competitive salary, health insurance",
  "location": "Mumbai, India",
  "type": "full_time",
  "category": "Technology",
  "industry": "Technology",
  "experience": 3,
  "salary": "₹8,00,000 - ₹12,00,000",
  "isRemote": true,
  "applicationDeadline": "2024-12-31T23:59:59.000Z"
}
```

#### **Job Response**
```json
{
  "id": 1,
  "title": "Senior Software Engineer",
  "description": "We are looking for an experienced software engineer...",
  "requirements": "5+ years of experience in software development",
  "benefits": "Competitive salary, health insurance",
  "location": "Mumbai, India",
  "type": "full_time",
  "category": "Technology",
  "industry": "Technology",
  "experience": 3,
  "salary": "₹8,00,000 - ₹12,00,000",
  "isRemote": true,
  "status": "active",
  "views": 0,
  "applicationsCount": 0,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "applicationDeadline": "2024-12-31T23:59:59.000Z",
  "company": {
    "id": 1,
    "name": "Tech Company",
    "logo": null,
    "location": null
  }
}
```

### **Search/Filter Parameters**

#### **Before**
```
GET /api/jobs?experienceLevel=senior_level
```

#### **After**
```
GET /api/jobs?experience=3
```

## 📊 **Experience Level Mapping**

| Numeric Value | Label | Years of Experience | Description |
|---------------|-------|-------------------|-------------|
| `0` | Entry Level | 0-1 years | Fresh graduates, interns, entry-level positions |
| `1` | Junior Level | 1-3 years | Junior developers, associates, early career |
| `2` | Mid Level | 3-5 years | Mid-level professionals, specialists |
| `3` | Senior Level | 5-8 years | Senior professionals, team leads |
| `4` | Executive Level | 8+ years | Senior management, executives, directors |

## 🔍 **Validation Rules**

- **Type**: Integer
- **Range**: 0-4 (inclusive)
- **Required**: Optional (nullable)
- **Default**: None (must be explicitly set)

## 🚀 **Migration Process**

### **1. Database Migration**
```bash
# The migration will automatically:
# 1. Add new 'experience' column
# 2. Migrate existing data
# 3. Drop old 'experienceLevel' column
# 4. Add proper indexing
```

### **2. Deployment Steps**
1. Deploy the updated code
2. Run the database migration
3. Verify data migration
4. Test API endpoints

## 🧪 **Testing**

### **Test Cases**

#### **1. Create Job with Experience**
```bash
curl -X POST https://api.jobsmato.com/api/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Software Developer",
    "description": "Looking for a developer",
    "requirements": "Experience required",
    "location": "Mumbai",
    "type": "full_time",
    "category": "Technology",
    "experience": 2,
    "salary": "₹5,00,000 - ₹8,00,000"
  }'
```

#### **2. Search Jobs by Experience**
```bash
curl -X GET "https://api.jobsmato.com/api/jobs?experience=3"
```

#### **3. Validation Tests**
```bash
# Valid values (should work)
curl -X POST ... -d '{"experience": 0}'  # Entry level
curl -X POST ... -d '{"experience": 2}'  # Mid level
curl -X POST ... -d '{"experience": 4}'  # Executive level

# Invalid values (should fail)
curl -X POST ... -d '{"experience": -1}' # Below minimum
curl -X POST ... -d '{"experience": 5}'  # Above maximum
curl -X POST ... -d '{"experience": "3"}' # String instead of number
```

## 📈 **Benefits of This Change**

### **1. Flexibility**
- Numeric values allow for more granular experience levels
- Easy to add new levels without changing enum
- Better sorting and filtering capabilities

### **2. Performance**
- Integer comparisons are faster than string comparisons
- Better database indexing performance
- Reduced storage space

### **3. API Consistency**
- Numeric values are more consistent with other numeric fields
- Easier to work with in frontend applications
- Better validation and type safety

### **4. Future Extensibility**
- Easy to add new experience levels
- Can support decimal values if needed (e.g., 2.5 for 2-3 years)
- Better integration with analytics and reporting

## 🔄 **Backward Compatibility**

### **Migration Strategy**
- Old data is automatically migrated to new format
- No data loss during migration
- Rollback migration available if needed

### **API Versioning**
- This is a breaking change for existing API consumers
- Frontend applications need to be updated
- Consider API versioning for future changes

## 📝 **Frontend Integration**

### **JavaScript/TypeScript**
```typescript
// Experience level mapping
const EXPERIENCE_LEVELS = {
  0: 'Entry Level (0-1 years)',
  1: 'Junior Level (1-3 years)',
  2: 'Mid Level (3-5 years)',
  3: 'Senior Level (5-8 years)',
  4: 'Executive Level (8+ years)'
};

// Create job with experience
const createJob = async (jobData) => {
  const response = await fetch('/api/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      ...jobData,
      experience: 3 // Senior level
    })
  });
  return response.json();
};

// Filter jobs by experience
const searchJobs = async (experienceLevel) => {
  const response = await fetch(`/api/jobs?experience=${experienceLevel}`);
  return response.json();
};
```

### **React Component Example**
```jsx
const ExperienceSelector = ({ value, onChange }) => {
  const experienceOptions = [
    { value: 0, label: 'Entry Level (0-1 years)' },
    { value: 1, label: 'Junior Level (1-3 years)' },
    { value: 2, label: 'Mid Level (3-5 years)' },
    { value: 3, label: 'Senior Level (5-8 years)' },
    { value: 4, label: 'Executive Level (8+ years)' }
  ];

  return (
    <select value={value} onChange={(e) => onChange(parseInt(e.target.value))}>
      <option value="">Select Experience Level</option>
      {experienceOptions.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
```

## 🚨 **Breaking Changes**

### **For API Consumers**
1. **Field Name**: `experienceLevel` → `experience`
2. **Data Type**: String enum → Integer
3. **Values**: `'entry_level'` → `0`, `'mid_level'` → `2`, etc.

### **Required Updates**
1. Update frontend forms to use numeric values
2. Update search/filter logic
3. Update data display components
4. Update API integration code

## 📋 **Checklist**

### **Before Deployment**
- [ ] Code changes reviewed and tested
- [ ] Database migration tested
- [ ] API endpoints tested
- [ ] Validation rules verified
- [ ] Documentation updated

### **After Deployment**
- [ ] Database migration executed successfully
- [ ] Data migration verified
- [ ] API endpoints responding correctly
- [ ] Frontend applications updated
- [ ] Monitoring and logging in place

## 🔗 **Related Files**

- `src/entities/job.entity.ts` - Entity definition
- `src/modules/jobs/dto/job.dto.ts` - DTO definitions
- `src/modules/jobs/jobs.service.ts` - Service logic
- `src/modules/jobs/jobs.controller.ts` - Controller endpoints
- `src/migrations/1700000000001-ChangeExperienceLevelToExperience.ts` - Database migration

## 📞 **Support**

For questions or issues related to this change:
1. Check the API documentation
2. Review the migration logs
3. Test with the provided examples
4. Contact the development team

---

**Last Updated**: September 30, 2025  
**Version**: 1.3.0  
**Status**: Ready for Deployment
