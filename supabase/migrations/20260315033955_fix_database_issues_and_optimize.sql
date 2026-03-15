/*
  # إصلاح شامل لقاعدة البيانات وتحسين الأداء

  ## التحسينات المطبقة
  
  1. **إضافة فهارس مفقودة للأداء**
     - فهرس على orders.user_id
     - فهرس على orders.status
     - فهرس على orders.created_at
     - فهرس على wallet_transactions.user_id
     - فهرس على wallet_transactions.created_at
     - فهرس على products.platform_id
     - فهرس على inventory.status
  
  2. **تنظيف الفهارس المكررة**
     - إزالة idx_verification_codes_expiry (مكرر)
  
  3. **تحسين دوال RPC**
     - التأكد من جميع الدوال محدثة
     - إضافة معالجة أخطاء محسنة
  
  4. **إضافة دالة لفحص صحة البيانات**
     - دالة للتحقق من سلامة الطلبات
     - دالة للتحقق من المخزون
  
  ## الأمان
  - جميع القيود الموجودة محفوظة
  - لا توجد تغييرات على البيانات الموجودة
  - فقط تحسينات الأداء والفهارس
*/

-- =====================================================
-- حذف الفهارس المكررة
-- =====================================================

DROP INDEX IF EXISTS idx_verification_codes_expiry;

-- =====================================================
-- إضافة فهارس مفقودة للأداء
-- =====================================================

-- فهارس جدول orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_inventory_id ON orders(inventory_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);

-- فهارس جدول wallet_transactions
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_order_id ON wallet_transactions(order_id);

-- فهارس جدول products
CREATE INDEX IF NOT EXISTS idx_products_platform_id ON products(platform_id);
CREATE INDEX IF NOT EXISTS idx_products_is_deleted ON products(is_deleted);
CREATE INDEX IF NOT EXISTS idx_products_platform_active ON products(platform_id, is_deleted);

-- فهارس جدول inventory
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_status ON inventory(product_id, status);

-- فهارس جدول platforms
CREATE INDEX IF NOT EXISTS idx_platforms_is_deleted ON platforms(is_deleted);

-- =====================================================
-- دالة للتحقق من صحة البيانات
-- =====================================================

CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS json AS $$
DECLARE
  v_orphaned_orders integer;
  v_orphaned_transactions integer;
  v_invalid_inventory integer;
  v_issues json;
BEGIN
  -- فحص الطلبات اليتيمة (بدون مستخدم أو منتج)
  SELECT COUNT(*) INTO v_orphaned_orders
  FROM orders o
  LEFT JOIN users u ON o.user_id = u.id
  LEFT JOIN products p ON o.product_id = p.id
  WHERE u.id IS NULL OR p.id IS NULL;
  
  -- فحص المعاملات اليتيمة
  SELECT COUNT(*) INTO v_orphaned_transactions
  FROM wallet_transactions wt
  LEFT JOIN users u ON wt.user_id = u.id
  WHERE u.id IS NULL;
  
  -- فحص المخزون غير الصحيح
  SELECT COUNT(*) INTO v_invalid_inventory
  FROM inventory i
  LEFT JOIN products p ON i.product_id = p.id
  WHERE p.id IS NULL;
  
  -- بناء تقرير المشاكل
  v_issues := json_build_object(
    'orphaned_orders', v_orphaned_orders,
    'orphaned_transactions', v_orphaned_transactions,
    'invalid_inventory', v_invalid_inventory,
    'has_issues', (v_orphaned_orders + v_orphaned_transactions + v_invalid_inventory) > 0
  );
  
  RETURN v_issues;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- دالة لإحصاءات النظام
-- =====================================================

CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS json AS $$
DECLARE
  v_stats json;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM users),
    'active_users', (SELECT COUNT(*) FROM users WHERE is_active = true),
    'verified_users', (SELECT COUNT(*) FROM users WHERE is_verified = true),
    'total_products', (SELECT COUNT(*) FROM products WHERE is_deleted = false),
    'available_inventory', (SELECT COUNT(*) FROM inventory WHERE status = 'available' AND is_deleted = false),
    'total_orders', (SELECT COUNT(*) FROM orders),
    'pending_orders', (SELECT COUNT(*) FROM orders WHERE status = 'pending'),
    'approved_orders', (SELECT COUNT(*) FROM orders WHERE status = 'approved'),
    'total_wallet_balance', (SELECT COALESCE(SUM(wallet_balance), 0) FROM users),
    'pending_topups', (SELECT COUNT(*) FROM wallet_topups WHERE status = 'pending')
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- تحسين دالة approve_order
-- =====================================================

CREATE OR REPLACE FUNCTION approve_order(
  p_order_id uuid,
  p_admin_id uuid
)
RETURNS json AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_user users%ROWTYPE;
  v_admin users%ROWTYPE;
BEGIN
  -- التحقق من أن المستخدم هو مسؤول
  SELECT * INTO v_admin FROM users WHERE id = p_admin_id AND role = 'admin';
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin access required');
  END IF;
  
  -- الحصول على الطلب
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Order not found');
  END IF;
  
  -- التحقق من أن الطلب في حالة pending
  IF v_order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'message', 'Order is not pending');
  END IF;
  
  -- الحصول على المستخدم
  SELECT * INTO v_user FROM users WHERE id = v_order.user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;
  
  -- تحديث حالة الطلب
  UPDATE orders SET 
    status = 'approved',
    updated_at = now()
  WHERE id = p_order_id;
  
  -- تحديث حالة المخزون
  UPDATE inventory SET 
    status = 'sold',
    updated_at = now()
  WHERE id = v_order.inventory_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Order approved successfully',
    'order_id', p_order_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- تحسين دالة reject_order
-- =====================================================

CREATE OR REPLACE FUNCTION reject_order(
  p_order_id uuid,
  p_admin_id uuid,
  p_admin_note text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_admin users%ROWTYPE;
BEGIN
  -- التحقق من أن المستخدم هو مسؤول
  SELECT * INTO v_admin FROM users WHERE id = p_admin_id AND role = 'admin';
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin access required');
  END IF;
  
  -- الحصول على الطلب
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Order not found');
  END IF;
  
  -- التحقق من أن الطلب في حالة pending
  IF v_order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'message', 'Order is not pending');
  END IF;
  
  -- تحديث حالة الطلب
  UPDATE orders SET 
    status = 'rejected',
    admin_note = p_admin_note,
    updated_at = now()
  WHERE id = p_order_id;
  
  -- إعادة المخزون إلى available
  UPDATE inventory SET 
    status = 'available',
    reserved_until = NULL,
    updated_at = now()
  WHERE id = v_order.inventory_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Order rejected successfully',
    'order_id', p_order_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- إضافة تعليقات على الجداول
-- =====================================================

COMMENT ON TABLE users IS 'جدول المستخدمين - يحتوي على معلومات الحسابات';
COMMENT ON TABLE products IS 'جدول المنتجات - المنتجات المتاحة للشراء';
COMMENT ON TABLE inventory IS 'جدول المخزون - الأكواد الرقمية المتاحة';
COMMENT ON TABLE orders IS 'جدول الطلبات - طلبات الشراء من المستخدمين';
COMMENT ON TABLE wallet_transactions IS 'جدول معاملات المحفظة - سجل جميع المعاملات';
COMMENT ON TABLE wallet_topups IS 'جدول تعبئة المحفظة - طلبات تعبئة الرصيد';
COMMENT ON TABLE payment_methods IS 'جدول طرق الدفع - الطرق المتاحة للدفع اليدوي';
COMMENT ON TABLE platforms IS 'جدول المنصات - منصات الألعاب والخدمات';
COMMENT ON TABLE verification_codes IS 'جدول رموز التحقق - رموز OTP للتحقق من الهاتف';

COMMENT ON FUNCTION check_data_integrity IS 'فحص سلامة البيانات والعلاقات في قاعدة البيانات';
COMMENT ON FUNCTION get_system_stats IS 'الحصول على إحصائيات النظام الشاملة';
COMMENT ON FUNCTION approve_order IS 'الموافقة على طلب شراء من قبل المسؤول';
COMMENT ON FUNCTION reject_order IS 'رفض طلب شراء من قبل المسؤول';
