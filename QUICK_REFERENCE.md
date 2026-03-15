# Quick Reference Guide - MauriPlay Production Update

## 🚀 What Changed?

### 1. Login System - OTP Unlock
**Before**: Account permanently locked after 5 failed PIN attempts
**Now**: OTP verification required after 5 failed attempts, then account unlocks

### 2. Wallet Purchase - Instant Code Display
**Before**: Navigate to "My Purchases" to see code
**Now**: Code displays immediately in a modal after purchase

---

## 📋 Files Modified

### Database Migrations (Supabase)
1. `supabase/migrations/add_otp_unlock_for_failed_logins.sql`
   - Updated `verify_user_login` RPC
   - Updated `verify_otp_code` RPC

2. `supabase/migrations/update_wallet_purchase_return_code_details.sql`
   - Updated `create_wallet_purchase` RPC

### Frontend Files
1. `src/pages/Login.tsx` - Added OTP unlock flow
2. `src/pages/Purchase.tsx` - Integrated success modal
3. `src/components/PurchaseSuccessModal.tsx` - NEW FILE

---

## 🔐 Login Flow

```
User enters phone + PIN
    ↓
Correct PIN? → YES → Login successful ✅
    ↓ NO
Attempts < 5? → YES → Show "X attempts remaining" ❌
    ↓ NO
    ↓
Send OTP via WhatsApp 📱
    ↓
Redirect to OTP page
    ↓
User enters OTP
    ↓
OTP correct? → YES → Reset counter → Login ✅
    ↓ NO
Show error ❌
```

---

## 💰 Wallet Purchase Flow

```
User selects product
    ↓
Clicks "Wallet Payment"
    ↓
Confirms purchase
    ↓
RPC returns: { code, product_name, platform_name, ... }
    ↓
Modal appears with:
  - ✅ Success message
  - 🔑 Digital code (copyable)
  - 📹 Tutorial video link
  - 🌐 Platform website link
    ↓
User copies code / watches tutorial
    ↓
Closes modal → Navigate to "My Purchases"
```

---

## 🧪 Quick Test Scripts

### Test Login Lock & OTP
```javascript
// In browser console after 5 failed attempts:
// 1. Try login with wrong PIN 5 times
// 2. Should see OTP sent message
// 3. Check WhatsApp for OTP
// 4. Enter OTP on verify page
// 5. Should login successfully
```

### Test Wallet Purchase Modal
```javascript
// 1. Ensure user has wallet balance
// 2. Select any product
// 3. Choose "Wallet" payment
// 4. Click confirm
// 5. Modal should appear with code
// 6. Try copying code
// 7. Click tutorial/website buttons
// 8. Close modal
```

---

## 🔍 Database Queries for Verification

### Check Failed Attempts
```sql
SELECT phone_number, failed_login_attempts, is_active
FROM users
WHERE failed_login_attempts > 0
ORDER BY failed_login_attempts DESC;
```

### Reset Failed Attempts (if needed)
```sql
UPDATE users
SET failed_login_attempts = 0
WHERE phone_number = '22249827331'; -- Admin account
```

### Check Recent Wallet Purchases
```sql
SELECT
  o.id,
  o.created_at,
  u.phone_number,
  p.name as product_name,
  i.code
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN products p ON o.product_id = p.id
JOIN inventory i ON o.inventory_id = i.id
WHERE o.payment_type = 'wallet'
  AND o.status = 'approved'
ORDER BY o.created_at DESC
LIMIT 10;
```

---

## 🐛 Troubleshooting

### Issue: OTP Not Sending
**Check**:
1. WhatsApp Edge Function is deployed
2. Edge Function secrets are configured
3. Phone number is valid Mauritanian number
4. Rate limit not exceeded (60 seconds between sends)

**Solution**:
```bash
# Check Edge Function logs in Supabase dashboard
# Redeploy if needed
```

### Issue: Modal Not Appearing
**Check**:
1. Browser console for errors
2. Network tab for RPC response
3. Verify RPC returns `code` field

**Debug**:
```javascript
// In Purchase.tsx, add console.log after RPC call:
console.log('Purchase response:', data);
```

### Issue: Account Still Locked
**Check**:
1. Verify OTP was entered correctly
2. Check database: `failed_login_attempts` should be 0
3. Verify `is_active` flag is true

**Solution**:
```sql
-- Manually reset if needed
UPDATE users
SET failed_login_attempts = 0
WHERE phone_number = 'USER_PHONE';
```

---

## 📱 API Response Examples

### verify_user_login (Failed - Requires OTP)
```json
{
  "success": false,
  "require_otp": true,
  "phone_number": "22249827331",
  "message": "Too many failed attempts. Please verify with OTP."
}
```

### verify_user_login (Failed - Has Attempts)
```json
{
  "success": false,
  "remaining_attempts": 3,
  "message": "Invalid PIN. 3 attempts remaining."
}
```

### create_wallet_purchase (Success)
```json
{
  "success": true,
  "order_id": "uuid...",
  "inventory_id": "uuid...",
  "code": "ABCD-1234-EFGH-5678",
  "product_name": "PlayStation Plus 1 Month",
  "platform_name": "PlayStation",
  "platform_logo_url": "https://...",
  "platform_website_url": "https://store.playstation.com",
  "platform_tutorial_video_url": "https://youtube.com/...",
  "message": "Purchase completed successfully"
}
```

---

## 🚨 Emergency Rollback

### If Major Issue Occurs:

```bash
# 1. Revert frontend
git revert HEAD~1
npm run build
netlify deploy --prod

# 2. Revert database (run in Supabase SQL Editor)
# Copy-paste original RPC functions from:
# supabase/migrations/20260306174353_create_rpc_functions.sql
```

### Quick Health Check
```bash
# Frontend
curl https://your-app.netlify.app
# Should return 200

# Backend (Supabase)
# Check Database > Logs in Supabase dashboard
```

---

## 📞 Key Contacts

- **Database Issues**: Check Supabase Dashboard
- **Frontend Issues**: Check Netlify Deploy Logs
- **WhatsApp OTP Issues**: Check Supabase Edge Functions Logs

---

## ✅ Pre-Deployment Checklist

- [x] TypeScript compiled without errors
- [x] Production build successful
- [x] All migrations applied
- [x] Edge Functions deployed
- [x] Environment variables set
- [x] RLS policies verified
- [x] Test accounts created
- [x] Rollback plan documented

---

## 🎯 Success Metrics

Monitor these after deployment:

1. **Failed Login Recovery Rate**
   - Target: >95% of locked users unlock via OTP

2. **Wallet Purchase Completion**
   - Target: 100% show success modal

3. **Code Copy Rate**
   - Track: Users clicking "Copy Code" button

4. **Support Tickets**
   - Target: <5% increase (ideally decrease)

---

## 📚 Related Documentation

- Full details: `PRODUCTION_UPDATE_SUMMARY.md`
- Setup guide: `SETUP.md`
- Database schema: `supabase/migrations/`

---

**Last Updated**: March 9, 2026
**Version**: 1.0.0
**Status**: Production Ready ✅
