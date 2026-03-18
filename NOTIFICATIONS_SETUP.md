# OneSignal Notifications Setup

This project uses OneSignal for push notifications (admin and user).

## Frontend (already configured)

- OneSignal Web SDK is loaded in `index.html` with your App ID and Safari Web ID.
- After login, the app sets the user's **external id** and **role** tag so notifications can target admins or specific users.
- Notification click opens the relevant page (e.g. `/admin/orders`, `/wallet`, `/my-purchases`).

## Backend (Supabase Edge Function)

The `send-notification` Edge Function sends push notifications via the OneSignal REST API.

### Required secrets

In **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**, add:

| Secret                     | Description                                      |
|----------------------------|--------------------------------------------------|
| `ONESIGNAL_APP_ID`         | Your OneSignal App ID (e.g. `f5c09db0-25f6-4205-8c69-216e408d7370`) |
| `ONESIGNAL_REST_API_KEY`   | OneSignal REST API Key (Keys & IDs in OneSignal dashboard) |

Use the **REST API Key** from OneSignal (Dashboard → Settings → Keys & IDs). The API uses the header `Authorization: Key YOUR_REST_API_KEY`.

### Deploy the function

```bash
supabase functions deploy send-notification
```

## Events that trigger notifications

| Event                    | Who gets notified | Action / link              |
|--------------------------|-------------------|----------------------------|
| New order (wallet or direct) | Admin             | Push → `/admin/orders`     |
| New wallet top-up request    | Admin             | Push → `/admin/wallet-topups` |
| Wallet purchase success      | User              | Push → `/wallet-purchase-success` or `/my-purchases` |
| Wallet top-up approved       | User              | Push → `/wallet`           |
| Manual order approved        | User              | Push → `/my-purchases`      |
| Wallet activated by admin    | User              | Push → `/wallet`           |

## Testing

1. **Admin**: Log in as admin, allow notifications in the browser, then from another device/browser create an order or wallet top-up; admin should get a push and clicking it should open the correct admin page.
2. **User**: Log in as user, allow notifications; complete a wallet purchase or have admin approve a top-up/order or activate wallet; user should get the corresponding push and link.

Ensure there are no console errors and that the notify button (OneSignal bell) appears when enabled in init.
