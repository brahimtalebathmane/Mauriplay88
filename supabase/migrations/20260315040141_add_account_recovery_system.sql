/*
  # نظام استرجاع الحساب (Account Recovery System)

  ## التغييرات المطبقة
  
  1. **تحديث دالة verify_user_login**
     - قفل الحساب تلقائياً عند 5 محاولات فاشلة
     - إعادة رسالة خاصة للحسابات المقفولة
  
  2. **دالة send_recovery_otp**
     - إرسال كود استرجاع 4 أرقام
     - التحقق من الحساب المقفول
     - حد أقصى 1 طلب كل 60 ثانية
  
  3. **دالة verify_recovery_otp**
     - التحقق من كود الاسترجاع
     - فتح الحساب تلقائياً
     - إعادة تعيين عداد المحاولات الفاشلة
  
  4. **دالة reset_pin_after_recovery**
     - إعادة تعيين PIN بعد الاسترجاع الناجح
     - تشفير PIN باستخدام pgcrypto
  
  ## الأمان
  - OTP ينتهي بعد 5 دقائق
  - حد أقصى 1 طلب OTP كل 60 ثانية
  - تحقق من حالة الحساب
  - تشفير PIN باستخدام bcrypt
*/

-- =====================================================
-- تحديث دالة verify_user_login لقفل الحساب
-- =====================================================

CREATE OR REPLACE FUNCTION verify_user_login(
  p_phone_number text,
  p_pin text
)
RETURNS json AS $$
DECLARE
  v_user users%ROWTYPE;
  v_pin_matches boolean;
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO v_user 
  FROM users 
  WHERE phone_number = p_phone_number;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'رقم الهاتف غير مسجل'
    );
  END IF;
  
  -- التحقق من أن الحساب نشط
  IF NOT v_user.is_active THEN
    RETURN json_build_object(
      'success', false,
      'message', 'تم إيقاف حسابك مؤقتاً. يرجى استرجاع حسابك.',
      'account_locked', true,
      'phone_number', p_phone_number
    );
  END IF;
  
  -- التحقق من أن المستخدم موثق
  IF NOT v_user.is_verified THEN
    RETURN json_build_object(
      'success', false,
      'message', 'يجب التحقق من رقم الهاتف أولاً',
      'user_id', v_user.id,
      'phone_number', v_user.phone_number
    );
  END IF;
  
  -- التحقق من الرمز السري
  v_pin_matches := (v_user.pin_hash = crypt(p_pin, v_user.pin_hash));
  
  IF v_pin_matches THEN
    -- نجح تسجيل الدخول - إعادة تعيين العداد
    UPDATE users 
    SET failed_login_attempts = 0,
        updated_at = now()
    WHERE id = v_user.id;
    
    RETURN json_build_object(
      'success', true,
      'user', json_build_object(
        'id', v_user.id,
        'phone_number', v_user.phone_number,
        'wallet_balance', v_user.wallet_balance,
        'wallet_active', v_user.wallet_active,
        'role', v_user.role
      )
    );
  ELSE
    -- فشل تسجيل الدخول - زيادة العداد
    UPDATE users 
    SET failed_login_attempts = failed_login_attempts + 1,
        is_active = CASE 
          WHEN failed_login_attempts + 1 >= 5 THEN false
          ELSE is_active
        END,
        updated_at = now()
    WHERE id = v_user.id
    RETURNING failed_login_attempts, is_active INTO v_user.failed_login_attempts, v_user.is_active;
    
    -- التحقق إذا تم قفل الحساب
    IF NOT v_user.is_active THEN
      RETURN json_build_object(
        'success', false,
        'message', 'تم إيقاف حسابك مؤقتاً بسبب محاولات تسجيل دخول خاطئة.',
        'account_locked', true,
        'phone_number', p_phone_number
      );
    END IF;
    
    RETURN json_build_object(
      'success', false,
      'message', format('الرمز السري غير صحيح. المحاولات المتبقية: %s', 5 - v_user.failed_login_attempts),
      'attempts_remaining', 5 - v_user.failed_login_attempts
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- دالة إرسال كود استرجاع الحساب
-- =====================================================

CREATE OR REPLACE FUNCTION send_recovery_otp(
  p_phone_number text
)
RETURNS json AS $$
DECLARE
  v_user users%ROWTYPE;
  v_code text;
  v_recent_code_count integer;
BEGIN
  -- التحقق من صحة رقم الهاتف الموريتاني
  IF p_phone_number !~ '^222[234][0-9]{7}$' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'رقم الهاتف غير صحيح. يجب أن يبدأ بـ 222 ويحتوي على 11 رقم'
    );
  END IF;
  
  -- البحث عن المستخدم
  SELECT * INTO v_user 
  FROM users 
  WHERE phone_number = p_phone_number;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'رقم الهاتف غير مسجل'
    );
  END IF;
  
  -- التحقق من أن الحساب مقفول فعلاً
  IF v_user.is_active THEN
    RETURN json_build_object(
      'success', false,
      'message', 'حسابك نشط. يمكنك تسجيل الدخول مباشرة.'
    );
  END IF;
  
  -- التحقق من عدم وجود طلب حديث (خلال آخر 60 ثانية)
  SELECT COUNT(*) INTO v_recent_code_count
  FROM verification_codes
  WHERE phone_number = p_phone_number
    AND created_at > now() - interval '60 seconds';
  
  IF v_recent_code_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'يرجى الانتظار 60 ثانية قبل طلب كود جديد'
    );
  END IF;
  
  -- توليد كود من 4 أرقام
  v_code := LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
  
  -- حفظ الكود في قاعدة البيانات
  INSERT INTO verification_codes (phone_number, code, expires_at)
  VALUES (p_phone_number, v_code, now() + interval '5 minutes');
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم إرسال كود الاسترجاع إلى واتساب',
    'code', v_code,
    'phone_number', p_phone_number,
    'expires_in_seconds', 300
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- دالة التحقق من كود استرجاع الحساب
-- =====================================================

CREATE OR REPLACE FUNCTION verify_recovery_otp(
  p_phone_number text,
  p_code text
)
RETURNS json AS $$
DECLARE
  v_user users%ROWTYPE;
  v_verification verification_codes%ROWTYPE;
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO v_user 
  FROM users 
  WHERE phone_number = p_phone_number;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'رقم الهاتف غير مسجل'
    );
  END IF;
  
  -- البحث عن آخر كود تحقق ساري
  SELECT * INTO v_verification
  FROM verification_codes
  WHERE phone_number = p_phone_number
    AND code = p_code
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'الكود غير صحيح أو منتهي الصلاحية'
    );
  END IF;
  
  -- فتح الحساب وإعادة تعيين عداد المحاولات الفاشلة
  UPDATE users 
  SET is_active = true,
      failed_login_attempts = 0,
      updated_at = now()
  WHERE id = v_user.id;
  
  -- حذف جميع أكواد التحقق الخاصة بهذا الرقم
  DELETE FROM verification_codes
  WHERE phone_number = p_phone_number;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم التحقق بنجاح. يمكنك الآن إعادة تعيين الرمز السري',
    'user_id', v_user.id,
    'phone_number', v_user.phone_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- دالة إعادة تعيين PIN بعد الاسترجاع
-- =====================================================

CREATE OR REPLACE FUNCTION reset_pin_after_recovery(
  p_phone_number text,
  p_new_pin text
)
RETURNS json AS $$
DECLARE
  v_user users%ROWTYPE;
  v_pin_hash text;
BEGIN
  -- التحقق من صحة الرمز السري (6 أرقام)
  IF p_new_pin !~ '^\d{6}$' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'الرمز السري يجب أن يكون 6 أرقام فقط'
    );
  END IF;
  
  -- البحث عن المستخدم
  SELECT * INTO v_user 
  FROM users 
  WHERE phone_number = p_phone_number;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'رقم الهاتف غير مسجل'
    );
  END IF;
  
  -- التحقق من أن الحساب نشط (تم فتحه)
  IF NOT v_user.is_active THEN
    RETURN json_build_object(
      'success', false,
      'message', 'يجب التحقق من كود الاسترجاع أولاً'
    );
  END IF;
  
  -- تشفير الرمز السري الجديد
  v_pin_hash := crypt(p_new_pin, gen_salt('bf'));
  
  -- تحديث الرمز السري
  UPDATE users 
  SET pin_hash = v_pin_hash,
      failed_login_attempts = 0,
      updated_at = now()
  WHERE id = v_user.id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم تغيير الرمز السري بنجاح'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- إضافة تعليقات على الدوال الجديدة
-- =====================================================

COMMENT ON FUNCTION send_recovery_otp IS 'إرسال كود استرجاع الحساب للمستخدمين المقفولين';
COMMENT ON FUNCTION verify_recovery_otp IS 'التحقق من كود الاسترجاع وفتح الحساب';
COMMENT ON FUNCTION reset_pin_after_recovery IS 'إعادة تعيين PIN بعد استرجاع الحساب بنجاح';
