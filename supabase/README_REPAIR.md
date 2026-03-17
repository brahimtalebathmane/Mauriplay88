# Admin Panel Repair (إذا فشل تحميل الطلبات / المستخدمين / وسائل الدفع / المخزون)

If the Admin Panel shows errors such as:
- **فشل تحميل الطلبات** (Failed to load orders)
- **فشل تحميل المستخدمين** (Failed to load users)
- **فشل تحميل وسائل الدفع** (Failed to load payment methods)
- **فشل تحميل طلبات الشحن** (Failed to load shipping requests)
- **الخادم لم يحدّث بعد. تأكد من تطبيق migrations (admin_get_inventory)**

then the remote database is missing some RPC functions or grants.

## What to do

1. Open your **Supabase project** → **SQL Editor**.
2. Open the file **`supabase/repair_admin_rpcs_apply_in_dashboard.sql`** from this repo.
3. Copy its entire contents and paste into the SQL Editor.
4. Click **Run**.
5. Refresh the Admin Panel in your app.

This creates the required admin RPCs and grants `EXECUTE` to `anon` and `authenticated` so the frontend (using the anon key) can call them.

## After running the repair

- **Orders**, **Users**, **Payment Methods**, **Wallet Top-up Requests**, and **Inventory** should load and work (approve/reject, add/edit/delete as per admin role).
- If you use **Supabase CLI** and **Docker**, you can run `npx supabase db pull` to sync the remote schema locally, and `npx supabase db push` to apply new migrations (e.g. `20260317220000_grant_admin_rpcs_to_anon.sql`, `20260317230000_add_save_app_setting_rpc.sql`) to the remote.
