# MauriPlay Setup Guide

## Quick Start

### 1. Environment Variables

Your `.env` file should contain:
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

The UltraMsg token is automatically configured in Supabase Edge Functions.

### 2. Database

The database schema has been deployed with:
- 8 tables with proper relationships
- Row Level Security enabled
- All RPC functions created
- Triggers for auto-updating timestamps

### 3. Edge Functions

The WhatsApp OTP Edge Function (`send-otp`) has been deployed and is ready to use.

### 4. PWA Icons

You need to add these icon files to the `/public` directory:
- `icon-192.png` - 192x192px PNG
- `icon-512.png` - 512x512px PNG
- `icon-512-maskable.png` - 512x512px PNG with safe zone for maskable icons

**Recommended**: Use your MauriPlay logo from https://postimg.cc/VJ87tfYs as the base for these icons.

### 5. Storage Bucket (Required)

Create a Supabase storage bucket for receipts:

```sql
-- Run in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false);

-- Create policy for authenticated uploads
CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Create policy for admin viewing
CREATE POLICY "Admins can view receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
```

### 6. Create First Admin User

After registering your first account:

```sql
-- Run in Supabase SQL Editor
UPDATE users
SET role = 'admin', is_verified = true, wallet_active = true
WHERE phone_number = '+222XXXXXXXX';
```

### 7. Add Initial Payment Methods

```sql
-- Example payment methods
INSERT INTO payment_methods (name, account_number) VALUES
  ('Sedad', '12345678'),
  ('Bankily', '87654321'),
  ('Masrvi', '11223344');
```

### 8. Testing the Application

1. Start development server: `npm run dev`
2. Register a new account with any phone number
3. Check Supabase logs for the OTP code (if WhatsApp not configured)
4. Verify OTP and login
5. Create admin user (see step 6)
6. Access admin panel at `/admin`
7. Add platforms, products, and inventory

## WhatsApp OTP Configuration

The Edge Function is configured to use:
- **Instance ID**: instance164290
- **Base URL**: https://api.ultramsg.com/instance164290/messages/chat

The token is automatically configured via Supabase Edge Function environment variables.

## Production Deployment

### Netlify

1. Push to GitHub/GitLab
2. Connect repository to Netlify
3. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables
5. Deploy

### After Deployment

1. Test registration flow
2. Verify OTP delivery
3. Test wallet purchases
4. Test manual payment flow
5. Verify realtime notifications
6. Test PWA installation

## Troubleshooting

### OTP Not Sending
- Check UltraMsg token configuration
- Verify phone number format (must include country code)
- Check Supabase Edge Function logs

### Database Errors
- Verify all migrations ran successfully
- Check RLS policies are enabled
- Ensure user has proper role assignments

### Build Errors
- Run `npm install` to ensure all dependencies installed
- Check for TypeScript errors: `npm run typecheck`
- Clear cache: `rm -rf node_modules dist && npm install`

### PWA Not Installing
- Verify manifest.json is accessible
- Check service worker registration
- Ensure HTTPS (required for PWA)
- Add required icon files

## Important Notes

1. **Phone Numbers**: Always stored with country code (222 for Mauritania)
2. **Wallet Activation**: Admin must manually activate user wallets
3. **Inventory Management**: Uses FIFO (first in, first out) system
4. **Order Expiry**: Manual payment orders expire after 15 minutes if receipt not uploaded
5. **PIN Security**: Never logged or exposed, always hashed
6. **Admin Access**: Requires explicit role assignment in database

## Support Checklist

Before going live, verify:
- [ ] Database schema deployed
- [ ] RPC functions working
- [ ] Edge function deployed
- [ ] Storage bucket created
- [ ] PWA icons added
- [ ] Environment variables set
- [ ] Admin user created
- [ ] Payment methods added
- [ ] Test purchases completed
- [ ] Realtime notifications working
- [ ] Mobile responsive
- [ ] PWA installable

## Additional Resources

- Supabase Documentation: https://supabase.com/docs
- UltraMsg API: https://docs.ultramsg.com
- Netlify Deployment: https://docs.netlify.com
