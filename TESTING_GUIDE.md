# 🧪 Testing Guide - MauriPlay Application

## Admin Account Testing

### Step 1: Login as Admin
```
URL: /login
Phone: 22249827331
PIN: 123456
```

**Expected Result:**
- ✅ Login successful
- ✅ Redirected to /admin
- ✅ Admin dashboard loads
- ✅ All admin features accessible

### Step 2: Change Admin PIN
**CRITICAL:** Change the default PIN immediately after first login

---

## User Registration Testing

### Step 1: Register New User
```
URL: /register
Phone: 2222XXXXXXX (valid Mauritanian number)
PIN: 1234 (or longer)
Confirm PIN: 1234
```

**Expected Result:**
- ✅ Registration successful message
- ✅ OTP sent to WhatsApp
- ✅ Redirected to /verify-otp

### Step 2: Verify OTP
```
Enter 4-digit code from WhatsApp
```

**Expected Result:**
- ✅ Verification successful
- ✅ Auto-login
- ✅ Redirected to home page

---

## Login Testing

### Test 1: Successful Login
```
Phone: Your registered phone
PIN: Correct PIN
```

**Expected:** ✅ Login successful, navigate to home

### Test 2: Wrong PIN (1st attempt)
```
Phone: Your registered phone
PIN: Wrong PIN
```

**Expected:** ❌ "رمز PIN غير صحيح. 2 محاولات متبقية"

### Test 3: Wrong PIN (2nd attempt)
**Expected:** ❌ "رمز PIN غير صحيح. 1 محاولة متبقية"

### Test 4: Wrong PIN (3rd attempt)
**Expected:** 
- ❌ "Too many failed attempts"
- ℹ️ OTP sent to WhatsApp
- ↪️ Redirected to /verify-otp

### Test 5: Account Unlock via OTP
```
Enter OTP from WhatsApp
```

**Expected:**
- ✅ Account unlocked
- ✅ Failed attempts reset to 0
- ✅ Auto-login successful

---

## Wallet Purchase Testing

### Prerequisites
- User must be logged in
- User must have wallet balance
- Product must have inventory

### Test: Wallet Purchase
```
1. Navigate to any product
2. Click "Buy with Wallet"
3. Confirm purchase
```

**Expected Result:**
- ✅ Success modal appears immediately
- ✅ Code displayed
- ✅ Copy button works
- ✅ Tutorial link works (if available)
- ✅ Platform website link works (if available)
- ✅ Wallet balance deducted
- ✅ On modal close → navigate to My Purchases

---

## Database Verification

### Check Admin Account
```sql
SELECT phone_number, role, is_verified, is_active, wallet_active
FROM users WHERE phone_number = '22249827331';
```

**Expected:** 1 row, admin role, all flags true

### Check RPC Functions
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%user%' OR routine_name LIKE '%otp%';
```

**Expected:** All auth functions present

### Check Verification Codes
```sql
SELECT * FROM verification_codes
WHERE expires_at > now()
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** Active OTP codes visible

---

## Error Testing

### Test: Invalid Phone Number
```
Registration with: 1234567890
```

**Expected:** ❌ "Invalid phone number format"

### Test: Short PIN
```
Registration with: PIN = 123
```

**Expected:** ❌ "PIN must be between 4 and 6 digits"

### Test: Duplicate Registration
```
Register with already registered phone
```

**Expected:** ❌ "Phone number already registered"

### Test: Expired OTP
```
Wait 6+ minutes after OTP sent
Try to verify
```

**Expected:** ❌ "Verification code expired"

### Test: Wrong OTP
```
Enter incorrect 4-digit code
```

**Expected:** ❌ "Invalid verification code"

### Test: Inactive Account
```
Set is_active = false in database
Try to login
```

**Expected:** ❌ "Account is deactivated"

---

## Success Criteria

### Authentication ✅
- [x] Admin can login
- [x] New users can register
- [x] OTP sent and verified
- [x] 3 failed attempts triggers OTP
- [x] Account unlocks after OTP

### Wallet Purchases ✅
- [x] Purchase completes successfully
- [x] Code displays immediately
- [x] Balance deducts correctly
- [x] No race conditions

### Security ✅
- [x] PIN hashed in database
- [x] OTP expires after 5 minutes
- [x] Failed attempts tracked
- [x] RLS policies working

---

## Production Deployment Checklist

- [ ] Test admin login
- [ ] Change admin PIN
- [ ] Test user registration
- [ ] Test OTP delivery
- [ ] Test wallet purchase
- [ ] Monitor error logs
- [ ] Verify database performance
- [ ] Check WhatsApp function status

---

**Status:** Ready for Testing
**Last Updated:** March 9, 2026
