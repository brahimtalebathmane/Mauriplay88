import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export const TermsAndConditions = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowRight className="w-5 h-5" />
          <span>العودة</span>
        </button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-cyan-500/10 rounded-full mb-6">
            <FileText className="w-10 h-10 text-cyan-500" />
          </div>
          <h1 className="text-4xl font-black mb-3">الشروط والأحكام</h1>
          <p className="text-gray-400">Terms &amp; Conditions</p>
          <p className="text-sm text-gray-500 mt-4">آخر تحديث: مارس 2026</p>
        </div>

        <div className="space-y-8">
          <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-cyan-500/10 p-3 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-cyan-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">مقدمة</h2>
                <p className="text-gray-300 leading-relaxed">
                  هذه الصفحة تحتوي على الشروط والأحكام الأساسية لاستخدام منصة MauriPlay. هذا النص
                  تم وضعه كـ نموذج مبدئي (Placeholder) وسيتم تحديثه لاحقًا بالمحتوى القانوني
                  النهائي.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold mb-4">قبول الشروط</h2>
            <div className="space-y-3 text-gray-300">
              <p className="leading-relaxed">
                باستخدامك لمنصة MauriPlay أو إنشاء حساب أو الوصول إلى أي من خدماتنا، فإنك تقر بأنك
                قرأت هذه الشروط وفهمتها وتوافق على الالتزام بها. في حال عدم موافقتك على أي جزء من
                هذه الشروط، يجب عليك التوقف عن استخدام المنصة.
              </p>
              <p className="leading-relaxed text-sm text-gray-400">
                ملاحظة: سيتم استبدال هذا النص بصياغة قانونية نهائية توضح بالتفصيل التزامات
                المستخدم والمنصة.
              </p>
            </div>
          </section>

          <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold mb-4">استخدام المنصة</h2>
            <div className="space-y-3 text-gray-300">
              <p className="leading-relaxed">
                يلتزم المستخدم باستخدام المنصة للأغراض المشروعة فقط، والامتناع عن أي سلوك قد يسيء
                إلى المنصة أو إلى المستخدمين الآخرين أو يخالف القوانين المعمول بها.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>عدم استخدام المنصة في أي عمليات احتيال أو غسيل أموال.</li>
                <li>عدم محاولة اختراق أو تعطيل الخدمات أو الأنظمة.</li>
                <li>عدم إساءة استخدام العروض أو البرامج الترويجية.</li>
              </ul>
              <p className="leading-relaxed text-sm text-gray-400">
                هذه البنود توضيحية فقط وقد يتم تعديلها أو توسيعها لاحقًا بحسب السياسة النهائية.
              </p>
            </div>
          </section>

          <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-emerald-500/10 p-3 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4">المدفوعات والطلبات</h2>
                <div className="space-y-3 text-gray-300">
                  <p className="leading-relaxed">
                    جميع العمليات المالية داخل المنصة تخضع لسياسات الدفع والاسترداد الخاصة
                    بالمنصة، والتي سيتم توضيحها بالتفصيل في النسخة النهائية من الشروط والأحكام.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>قد يتم تحديد سياسات خاصة للإلغاء والاسترداد.</li>
                    <li>تتحمل مسؤولية التأكد من صحة بيانات الدفع الخاصة بك.</li>
                    <li>قد يتم الاحتفاظ بسجلات المعاملات وفق القوانين المعمول بها.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-amber-500/10 p-3 rounded-xl">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4">تعديل الشروط</h2>
                <p className="text-gray-300 leading-relaxed">
                  تحتفظ MauriPlay بالحق في تحديث أو تعديل هذه الشروط في أي وقت. سيتم توضيح آلية
                  الإشعار بالتغييرات في النسخة النهائية، وقد يتطلب الاستمرار في استخدام المنصة
                  قبول الشروط المحدثة.
                </p>
                <p className="text-sm text-gray-400 mt-3">
                  هذه الفقرة توضيحية حاليًا، وسيتم اعتماد صياغة قانونية رسمية عند إكمال المستند.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="text-center mt-12 pt-8 border-t border-white/10">
          <p className="text-gray-500 text-sm">
            © 2026 MauriPlay. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </div>
  );
};

