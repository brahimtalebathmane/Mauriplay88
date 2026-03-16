# Developer Quick Start Guide

## Application Overview

MauriPlay is a digital marketplace for gaming codes and services built with:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **State**: Zustand with localStorage persistence
- **Deployment**: Netlify (Frontend) + Supabase (Backend)

---

## Getting Started

### 1. Environment Setup

Create `.env` file with Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:5173`

### 4. Build for Production
```bash
npm run build
```

---

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx       # Standard button with loading states
│   ├── Input.tsx        # Standard input field
│   ├── Toast.tsx        # Notification system
│   └── ...
├── pages/              # Route pages
│   ├── Login.tsx       # User login
│   ├── Register.tsx    # User registration
│   ├── Home.tsx        # Main dashboard
│   ├── Purchase.tsx    # Purchase flow
│   └── admin/          # Admin pages
├── hooks/              # Custom React hooks
│   ├── useDataFetch.ts # Standardized data fetching
│   └── useWalletNotice.ts
├── utils/              # Utility functions
│   ├── api.ts          # API layer (USE THIS!)
│   ├── logger.ts       # Logging system
│   ├── validation.ts   # Form validation
│   └── phoneNumber.ts  # Phone utilities
├── store/              # Zustand state management
│   └── useStore.ts     # Global state + persistence
├── lib/                # External configurations
│   └── supabase.ts     # Supabase client
└── types/              # TypeScript types
    └── index.ts        # All type definitions
```

---

## Key Patterns

### ✅ Data Fetching (READ Operations)

**Always use `useDataFetch` hook:**

```typescript
import { useDataFetch } from '../hooks/useDataFetch';
import { PlatformsAPI } from '../utils/api';
import { showToast } from '../components/Toast';

const { data, loading, error, refetch } = useDataFetch({
  fetchFn: () => PlatformsAPI.getAll(),
  onSuccess: (data) => console.log('Loaded:', data),
  onError: (error) => showToast(error.message, 'error'),
});

if (loading) return <LoadingScreen />;
if (error) return <div>Error: {error.message}</div>;
if (!data) return null;

return <div>{data.map(...)}</div>;
```

### ✅ Mutations (CREATE/UPDATE/DELETE Operations)

**Always use `useMutation` hook:**

```typescript
import { useMutation } from '../hooks/useDataFetch';
import { PlatformsAPI } from '../utils/api';
import { showToast } from '../components/Toast';

const { mutate, loading } = useMutation({
  mutationFn: (platform) => PlatformsAPI.create(platform),
  onSuccess: () => {
    showToast('Platform created successfully', 'success');
    refetch(); // Refresh data
  },
  onError: (error) => showToast(error.message, 'error'),
});

const handleSubmit = async () => {
  await mutate({ name, logo_url });
};
```

### ✅ Form Validation

**Always validate forms before submission:**

```typescript
import { validateForm, ValidationRules } from '../utils/validation';
import { showToast } from '../components/Toast';

const schema = {
  name: [
    ValidationRules.required('Platform name is required'),
    ValidationRules.minLength(3, 'Minimum 3 characters'),
  ],
  price: [
    ValidationRules.required('Price is required'),
    ValidationRules.positiveNumber('Price must be positive'),
  ],
  logo_url: [
    ValidationRules.required('Logo URL is required'),
    ValidationRules.url('Invalid URL format'),
  ],
};

const handleSubmit = () => {
  const result = validateForm(formData, schema);

  if (!result.valid) {
    const firstError = Object.values(result.errors)[0][0];
    showToast(firstError, 'error');
    return;
  }

  // Proceed with submission
  mutate(formData);
};
```

### ✅ Logging

**Always log important operations:**

```typescript
import { logger } from '../utils/logger';

// Information
logger.info('ComponentName', 'User clicked submit', { formData });

// Success
logger.success('ComponentName', 'Data saved successfully', { id: data.id });

// Warning
logger.warn('ComponentName', 'Validation failed', errors);

// Error
logger.error('ComponentName', 'API call failed', error);

// Debug (development only)
logger.debug('ComponentName', 'State updated', newState);
```

---

## Common Tasks

### Adding a New Page

1. Create page component in `src/pages/YourPage.tsx`
2. Add route in `src/App.tsx`:
```typescript
<Route path="/your-page" element={
  <ProtectedRoute>
    <YourPage />
  </ProtectedRoute>
} />
```

### Adding a New API Endpoint

1. Add to `src/utils/api.ts`:
```typescript
export const YourAPI = {
  async getAll() {
    logger.debug('API', 'Fetching all items');

    const { data, error } = await supabase
      .from('your_table')
      .select('*');

    if (error) handleSupabaseError(error, 'Fetch items');

    return data || [];
  },

  async create(item) {
    logger.debug('API', 'Creating item', item);

    const { data, error } = await supabase
      .from('your_table')
      .insert(item)
      .select()
      .single();

    if (error) handleSupabaseError(error, 'Create item');

    logger.success('API', 'Item created', { id: data.id });
    return data;
  },
};
```

### Adding Form Validation Rule

1. Add to `src/utils/validation.ts`:
```typescript
export const ValidationRules = {
  // ... existing rules

  yourRule: (message?: string): ValidationRule => ({
    validate: (value: any) => {
      // Your validation logic
      return true; // or false
    },
    message: message || 'Default error message',
  }),
};
```

### Adding a New Database Table

1. Create migration in `supabase/migrations/`:
```sql
/*
  # Add your_table

  1. New Tables
    - `your_table`
      - `id` (uuid, primary key)
      - `name` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add admin policy
    - Add user policy
*/

CREATE TABLE IF NOT EXISTS your_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Admin: Full access
CREATE POLICY "admin_all_your_table" ON your_table
  FOR ALL USING (is_admin());

-- Users: Read only
CREATE POLICY "user_read_your_table" ON your_table
  FOR SELECT USING (true);

-- Trigger for auto-update
CREATE TRIGGER trg_update_your_table
  BEFORE UPDATE ON your_table
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Index for performance
CREATE INDEX idx_your_table_name ON your_table(name);
```

2. Add TypeScript type in `src/types/index.ts`:
```typescript
export interface YourType {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}
```

---

## Database Guidelines

### ✅ Always Use RLS Policies

Every table MUST have RLS enabled:
```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Admin policy (full access)
CREATE POLICY "admin_all_your_table" ON your_table
  FOR ALL USING (is_admin());

-- User policy (context-specific)
CREATE POLICY "user_read_your_table" ON your_table
  FOR SELECT USING (/* your condition */);
```

### ✅ Foreign Keys with CASCADE

Always specify ON DELETE behavior:
```sql
-- CASCADE: Delete child records
ALTER TABLE products
  ADD CONSTRAINT products_platform_id_fkey
  FOREIGN KEY (platform_id) REFERENCES platforms(id)
  ON DELETE CASCADE;

-- SET NULL: Preserve child records
ALTER TABLE orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE SET NULL;
```

### ✅ Add Indexes for Performance

Index frequently queried columns:
```sql
-- Single column
CREATE INDEX idx_users_phone ON users(phone_number);

-- Multiple columns
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Conditional index
CREATE INDEX idx_inventory_available
  ON inventory(product_id, created_at)
  WHERE status = 'available' AND is_deleted = false;
```

### ✅ Use Proper Data Types

```sql
-- Monetary values (precise decimals)
price NUMERIC(10,2)

-- Timestamps (with timezone)
created_at TIMESTAMPTZ DEFAULT now()

-- UUIDs (primary keys)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Text (variable length)
name TEXT NOT NULL

-- Booleans
is_active BOOLEAN DEFAULT true
```

---

## Authentication Flow

### Login Flow
1. User enters phone + PIN → `src/pages/Login.tsx`
2. Call `verify_user_login` RPC
3. If success → `setUser()` → redirect to Dashboard
4. If not verified → send OTP → redirect to `/verify-otp`
5. If account locked → redirect to `/account-recovery`

### Registration Flow
1. User enters phone + PIN → `src/pages/Register.tsx`
2. Call `register_user` RPC
3. Send OTP via Edge Function
4. Redirect to `/verify-otp`
5. User verifies OTP → logged in → redirect to Dashboard

### Session Persistence
- Zustand stores user in localStorage (`mauriplay-storage`)
- On page refresh → rehydrates from localStorage
- User remains logged in until explicit logout

---

## Common Issues & Solutions

### Issue: "RLS policy violation"
**Solution:** Check that the user has proper permissions. Admins bypass RLS via `is_admin()` function.

### Issue: "Foreign key constraint violation"
**Solution:** Ensure referenced record exists. Check CASCADE rules.

### Issue: "Invalid phone number format"
**Solution:** Phone must be in format `+222[234]XXXXXXX` (Mauritanian format).

### Issue: "Build fails with type errors"
**Solution:** Run `npm run typecheck` to see errors. Ensure all types are properly defined.

### Issue: "Data not refreshing after mutation"
**Solution:** Call `refetch()` after successful mutation to reload data.

---

## Testing Checklist

Before deploying, verify:

- [ ] All pages load without errors
- [ ] Login/Register/OTP flow works
- [ ] Purchases can be completed (wallet & manual)
- [ ] Admin can create platforms/products/inventory
- [ ] Receipts can be uploaded
- [ ] Orders show in My Purchases
- [ ] Wallet balance updates correctly
- [ ] Session persists after page refresh
- [ ] Logout clears session
- [ ] Mobile responsive
- [ ] Build completes without errors

---

## Deployment

### Frontend (Netlify)
```bash
npm run build
# Upload dist/ folder to Netlify
```

### Backend (Supabase)
```bash
# Migrations are auto-applied via Supabase dashboard
# Or use Supabase CLI: supabase db push
```

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Zustand**: https://zustand-demo.pmnd.rs

---

## Quick Commands

```bash
# Development
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Build
npm run build

# Preview production build
npm run preview
```

---

**Happy Coding! 🚀**
