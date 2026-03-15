# MauriPlay - High-End Digital Marketplace

A production-ready Progressive Web App (PWA) for selling digital gaming products to Mauritanian users.

## Features

### Core Functionality
- **User Authentication**: Phone + PIN registration with WhatsApp OTP verification
- **Digital Marketplace**: Browse platforms and purchase digital products
- **Dual Payment System**: Wallet and manual payment options
- **Order Management**: Real-time order tracking and notifications
- **Admin Dashboard**: Complete management system for orders, inventory, and users

### Technical Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (RTL, monochrome black/white theme)
- **State Management**: Zustand with persistence
- **Database**: Supabase (PostgreSQL with RLS)
- **Real-time**: Supabase Realtime channels
- **Authentication**: Custom phone + PIN with WhatsApp OTP
- **Edge Functions**: Supabase Edge Functions for OTP
- **Deployment**: Netlify-ready with SPA redirects

### Security Features
- Row Level Security (RLS) on all database tables
- PIN hashing with bcrypt (pgcrypto)
- Row-level locking for wallet transactions
- Rate limiting on OTP requests (1 per 60 seconds)
- Admin-only access controls
- Account locking after 5 failed login attempts

### Database Schema
1. **Platforms**: Gaming platforms with logos and tutorials
2. **Products**: Digital products with pricing
3. **Inventory**: FIFO-managed digital codes
4. **Users**: Phone-based authentication with wallet
5. **Orders**: Purchase tracking with payment details
6. **Wallet_Transactions**: Complete audit trail
7. **Payment_Methods**: Manual payment options
8. **Verification_Codes**: OTP management with expiry

## Setup Instructions

### Prerequisites
- Node.js 18+
- Supabase account
- UltraMsg account for WhatsApp OTP

### Environment Variables
Create a `.env` file with:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
ULTRAMSG_TOKEN=your_ultramsg_token
```

### Installation
```bash
npm install
npm run dev
```

### Build for Production
```bash
npm run build
```

### Deploy to Netlify
1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard

## Database Setup

The database is already configured with:
- All tables created with proper relationships
- RLS policies enabled on all tables
- Automated triggers for timestamps
- RPC functions for secure operations
- FIFO inventory management
- Wallet transaction system with locking

## Admin Access

To create an admin user, update a user's role in the database:
```sql
UPDATE users SET role = 'admin' WHERE phone_number = '+222XXXXXXXX';
```

## PWA Features

- Installable on mobile devices
- Offline splash page
- Service worker for caching
- Manifest with proper icons
- Works standalone

## API Endpoints

### Edge Functions
- `send-otp`: Sends WhatsApp OTP via UltraMsg

### RPC Functions
- `register_user`: Create new user account
- `verify_user_login`: Authenticate user
- `create_verification_code`: Generate OTP
- `verify_otp_code`: Verify OTP
- `create_wallet_purchase`: Complete wallet purchase
- `create_manual_purchase`: Create manual payment order
- `approve_manual_order`: Admin approves order
- `reject_manual_order`: Admin rejects order
- `add_wallet_balance`: Admin adds wallet balance

## User Flows

### Registration
1. User enters phone + creates PIN
2. System sends WhatsApp OTP
3. User verifies OTP
4. Account activated

### Purchase (Wallet)
1. User browses platforms and products
2. Selects product and chooses wallet payment
3. System deducts balance and assigns code (FIFO)
4. User receives digital code instantly

### Purchase (Manual)
1. User selects manual payment
2. Enters payment details and uploads receipt
3. Inventory reserved for 15 minutes
4. Admin reviews and approves/rejects
5. User notified via realtime channel

## Admin Features

- **Orders Management**: Approve/reject manual payments
- **Inventory Management**: Bulk upload codes
- **Platforms Management**: Add/remove platforms
- **Products Management**: Add/remove products with pricing
- **Payment Methods**: Configure payment options
- **Users Management**:
  - View all users
  - Add wallet balance
  - Activate/deactivate wallets
  - Ban/unban accounts

## Security Best Practices

1. All sensitive operations use RPC functions
2. Wallet transactions use row-level locking
3. PIN never stored in plain text
4. RLS prevents unauthorized access
5. Admin operations require explicit role check
6. Receipts stored in private buckets
7. OTP rate limiting enforced

## RTL (Right-to-Left) Support

- Full Arabic language support
- RTL layout throughout the application
- Proper text alignment and direction
- Arabic number formatting

## Performance Optimizations

- Lazy loading for images
- Skeleton screens for loading states
- Double-tap prevention on buttons
- Debounced search and filters
- Optimized bundle size
- Service worker caching

## Support

For issues or questions, contact the development team.

## License

Proprietary - All rights reserved
