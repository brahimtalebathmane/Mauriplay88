# Phone Number Update Policy

## Overview

The MauriPlay application implements a strict phone number update policy to maintain account security and prevent unauthorized changes.

## Policy Details

### For Regular Users
- **Phone numbers CANNOT be changed** by regular users
- Phone numbers are displayed in the Profile page for reference only
- No edit functionality is available to users
- This prevents account hijacking and unauthorized access

### For Admin Users
- **Phone numbers CAN ONLY be updated by admin users**
- Admins can update phone numbers through the Admin Dashboard > Users section
- Each update requires admin authentication
- Changes are validated and logged

## Why This Policy?

1. **Security**: Phone numbers are used for authentication via OTP
2. **Account Protection**: Prevents unauthorized account takeovers
3. **User Verification**: Maintains the integrity of verified accounts
4. **Fraud Prevention**: Reduces the risk of fraudulent activities

## How Admin Updates Work

### Admin Interface
Located at: **Admin Dashboard > المستخدمون (Users)**

### Update Process
1. Admin navigates to the Users section
2. Finds the user whose phone number needs updating
3. Clicks the edit icon (✏️) next to the phone number
4. Enters the new phone number
5. Clicks save (✓) to confirm or cancel (✗) to abort

### Backend Validation
The `update_user_phone_number` RPC function performs:

1. **Authorization Check**: Verifies the requester is an admin
2. **Format Validation**: Ensures the phone number is valid (minimum 8 digits)
3. **Uniqueness Check**: Confirms the new number isn't already in use
4. **User Existence**: Verifies the target user exists
5. **Update Execution**: Updates the phone number if all checks pass

### Error Messages (Arabic)

| Error | Message |
|-------|---------|
| Unauthorized | غير مصرح لك بتحديث أرقام الهواتف |
| Invalid Format | رقم الهاتف غير صالح |
| Already In Use | رقم الهاتف مستخدم بالفعل |
| User Not Found | المستخدم غير موجود |
| Success | تم تحديث رقم الهاتف بنجاح |

## Technical Implementation

### Database Function
```sql
update_user_phone_number(
  p_user_id uuid,
  p_new_phone_number text,
  p_admin_id uuid
)
```

### Frontend Implementation
- **File**: `/src/pages/admin/Users.tsx`
- **State Management**: Local state for editing mode
- **UI Elements**:
  - Edit button (Edit2 icon)
  - Save button (Save icon)
  - Cancel button (X icon)
  - Input field for new phone number

### Security Features
1. **SECURITY DEFINER**: Function runs with elevated privileges
2. **Role Verification**: Only admin role can execute
3. **Input Validation**: Prevents SQL injection and invalid data
4. **Atomic Operations**: All checks happen before any updates

## User Experience

### Regular Users
Users see their phone number displayed but cannot modify it. If they need to change their phone number, they must:
1. Contact support via WhatsApp: +222 49 82 73 31
2. Provide verification information
3. Request admin assistance

### Admin Users
Admins have a streamlined interface to:
1. View all user phone numbers
2. Edit any user's phone number
3. Validate changes in real-time
4. Receive immediate feedback

## Best Practices for Admins

### Before Updating
1. ✅ Verify user identity through multiple channels
2. ✅ Confirm the new phone number belongs to the user
3. ✅ Document the reason for the change
4. ✅ Notify the user of the update

### After Updating
1. ✅ Test that the user can log in with the new number
2. ✅ Verify OTP delivery to the new number
3. ✅ Keep a record of the change
4. ✅ Monitor for any issues

### Never
1. ❌ Update phone numbers without verification
2. ❌ Share admin credentials
3. ❌ Bulk update phone numbers without careful review
4. ❌ Ignore validation errors

## Compliance

This policy ensures:
- **GDPR Compliance**: User data integrity and security
- **Google Play Policy**: Proper account security measures
- **Best Practices**: Industry-standard authentication protection
- **User Trust**: Transparent and secure account management

## Future Enhancements

Potential future improvements:
1. **Audit Log**: Detailed logging of all phone number changes
2. **User Notification**: Automatic alerts when phone number is changed
3. **Two-Factor Verification**: Additional admin verification for sensitive changes
4. **Change History**: View history of phone number changes per user
5. **Bulk Import**: Secure bulk update with CSV validation

## Support

For questions about phone number updates:
- **Admin Support**: Contact system administrator
- **User Support**: WhatsApp +222 49 82 73 31
- **Technical Issues**: Check Supabase logs for error details

---

**Last Updated**: March 2026
**Version**: 1.0.0
