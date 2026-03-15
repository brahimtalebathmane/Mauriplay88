import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Lock, Eye, Database, UserCheck, Mail } from 'lucide-react';

export const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowRight className="w-5 h-5" />
          <span>العودة</span>
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-cyan-500/10 rounded-full mb-6">
            <Shield className="w-10 h-10 text-cyan-500" />
          </div>
          <h1 className="text-4xl font-black mb-3">سياسة الخصوصية</h1>
          <p className="text-gray-400">Privacy Policy</p>
          <p className="text-sm text-gray-500 mt-4">آخر تحديث: مارس 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Introduction */}
          <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-cyan-500/10 p-3 rounded-xl">
                <UserCheck className="w-6 h-6 text-cyan-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">مقدمة</h2>
                <p className="text-gray-300 leading-relaxed">
                  نحن في MauriPlay نلتزم بحماية خصوصيتك وبياناتك الشخصية. توضح هذه السياسة كيفية جمع واستخدام وحماية معلوماتك عند استخدام خدماتنا.
                </p>
              </div>
            </div>
          </section>

          {/* Data Collection */}
          <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-blue-500/10 p-3 rounded-xl">
                <Database className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4">المعلومات التي نجمعها</h2>
                <div className="space-y-3 text-gray-300">
                  <div className="bg-black/30 rounded-xl p-4">
                    <h3 className="font-bold text-white mb-2">معلومات الحساب</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>رقم الهاتف (للتسجيل والمصادقة)</li>
                      <li>الاسم (اختياري)</li>
                      <li>رمز PIN الخاص بك (مشفر)</li>
                    </ul>
                  </div>

                  <div className="bg-black/30 rounded-xl p-4">
                    <h3 className="font-bold text-white mb-2">معلومات المعاملات</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>سجل المشتريات والطلبات</li>
                      <li>معلومات الدفع (رقم الحساب المستخدم للدفع)</li>
                      <li>إيصالات الدفع المرفوعة</li>
                      <li>رصيد المحفظة</li>
                    </ul>
                  </div>

                  <div className="bg-black/30 rounded-xl p-4">
                    <h3 className="font-bold text-white mb-2">البيانات التقنية</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>عنوان IP</li>
                      <li>نوع المتصفح والجهاز</li>
                      <li>تاريخ ووقت الزيارات</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Data Usage */}
          <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-green-500/10 p-3 rounded-xl">
                <Eye className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4">كيف نستخدم معلوماتك</h2>
                <div className="space-y-2 text-gray-300">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2 flex-shrink-0" />
                    <p>معالجة طلبات الشراء وتسليم المنتجات الرقمية</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2 flex-shrink-0" />
                    <p>إدارة حسابك ومحفظتك الرقمية</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2 flex-shrink-0" />
                    <p>التواصل معك بخصوص طلباتك ومعاملاتك</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2 flex-shrink-0" />
                    <p>تحسين خدماتنا وتجربة المستخدم</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2 flex-shrink-0" />
                    <p>منع الاحتيال وضمان أمان المنصة</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2 flex-shrink-0" />
                    <p>الامتثال للمتطلبات القانونية</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Data Security */}
          <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-red-500/10 p-3 rounded-xl">
                <Lock className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4">حماية البيانات</h2>
                <div className="space-y-3 text-gray-300">
                  <p className="leading-relaxed">
                    نحن نستخدم تدابير أمنية متقدمة لحماية معلوماتك الشخصية، بما في ذلك:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-black/30 rounded-xl p-4">
                      <h4 className="font-bold text-white mb-2">التشفير</h4>
                      <p className="text-sm">جميع البيانات الحساسة مشفرة أثناء التخزين والنقل</p>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4">
                      <h4 className="font-bold text-white mb-2">الوصول المحدود</h4>
                      <p className="text-sm">فقط الموظفون المصرح لهم يمكنهم الوصول إلى البيانات</p>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4">
                      <h4 className="font-bold text-white mb-2">المراقبة المستمرة</h4>
                      <p className="text-sm">نراقب أنظمتنا للكشف عن أي نشاط غير عادي</p>
                    </div>
                    <div className="bg-black/30 rounded-xl p-4">
                      <h4 className="font-bold text-white mb-2">النسخ الاحتياطي</h4>
                      <p className="text-sm">نقوم بنسخ احتياطي منتظم لضمان عدم فقدان البيانات</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Data Sharing */}
          <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold mb-4">مشاركة البيانات</h2>
            <div className="space-y-3 text-gray-300">
              <p className="leading-relaxed">
                نحن لا نبيع أو نؤجر معلوماتك الشخصية لأطراف ثالثة. قد نشارك معلوماتك فقط في الحالات التالية:
              </p>
              <div className="space-y-2">
                <div className="bg-black/30 rounded-xl p-4">
                  <p className="font-bold text-white mb-1">مقدمو الخدمات</p>
                  <p className="text-sm">شركاء موثوقون يساعدوننا في تقديم خدماتنا (مثل معالجة الدفع)</p>
                </div>
                <div className="bg-black/30 rounded-xl p-4">
                  <p className="font-bold text-white mb-1">المتطلبات القانونية</p>
                  <p className="text-sm">عند الحاجة للامتثال للقوانين أو الأوامر القضائية</p>
                </div>
                <div className="bg-black/30 rounded-xl p-4">
                  <p className="font-bold text-white mb-1">حماية الحقوق</p>
                  <p className="text-sm">لحماية حقوقنا وسلامة مستخدمينا</p>
                </div>
              </div>
            </div>
          </section>

          {/* User Rights */}
          <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold mb-4">حقوقك</h2>
            <div className="space-y-2 text-gray-300">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2 flex-shrink-0" />
                <p><strong>الوصول:</strong> يمكنك طلب نسخة من بياناتك الشخصية</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2 flex-shrink-0" />
                <p><strong>التصحيح:</strong> يمكنك تحديث أو تصحيح معلوماتك</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2 flex-shrink-0" />
                <p><strong>الحذف:</strong> يمكنك طلب حذف حسابك وبياناتك</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2 flex-shrink-0" />
                <p><strong>الاعتراض:</strong> يمكنك الاعتراض على معالجة بياناتك في حالات معينة</p>
              </div>
            </div>
          </section>

          {/* Cookies */}
          <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold mb-4">ملفات تعريف الارتباط (Cookies)</h2>
            <div className="text-gray-300 space-y-3">
              <p className="leading-relaxed">
                نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتذكر تفضيلاتك. يمكنك التحكم في ملفات تعريف الارتباط من خلال إعدادات المتصفح الخاص بك.
              </p>
            </div>
          </section>

          {/* Children's Privacy */}
          <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold mb-4">خصوصية الأطفال</h2>
            <div className="text-gray-300">
              <p className="leading-relaxed">
                خدماتنا مخصصة للمستخدمين الذين تبلغ أعمارهم 13 عامًا فما فوق. نحن لا نجمع عن قصد معلومات من الأطفال دون سن 13 عامًا.
              </p>
            </div>
          </section>

          {/* Changes to Policy */}
          <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold mb-4">التغييرات على هذه السياسة</h2>
            <div className="text-gray-300">
              <p className="leading-relaxed">
                قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سنقوم بإخطارك بأي تغييرات جوهرية عن طريق نشر السياسة الجديدة على هذه الصفحة مع تحديث تاريخ "آخر تحديث".
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl p-6 border border-cyan-500/20">
            <div className="flex items-start gap-4">
              <div className="bg-cyan-500/20 p-3 rounded-xl">
                <Mail className="w-6 h-6 text-cyan-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4">اتصل بنا</h2>
                <div className="text-gray-300 space-y-3">
                  <p className="leading-relaxed">
                    إذا كان لديك أي أسئلة حول سياسة الخصوصية هذه أو ممارساتنا، يرجى التواصل معنا:
                  </p>
                  <div className="bg-black/30 rounded-xl p-4">
                    <p className="font-bold text-white mb-2">واتساب</p>
                    <a
                      href="https://wa.me/22230459388"
                      className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-2"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ⁦+222 49 82 73 31⁩
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-white/10">
          <p className="text-gray-500 text-sm">
            © 2026 MauriPlay. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </div>
  );
};
