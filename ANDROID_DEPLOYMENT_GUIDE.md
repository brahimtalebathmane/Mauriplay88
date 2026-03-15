# MauriPlay - Android Deployment Guide

This guide will help you build and deploy the MauriPlay application to Google Play Store.

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18 or higher)
2. **Android Studio** (latest version)
3. **Java Development Kit (JDK)** 17 or higher
4. **Android SDK** with API level 33 (Android 13) or higher
5. **Gradle** (comes with Android Studio)

## Project Configuration

### App Identity

- **App Name**: MauriPlay - سوق الألعاب الرقمية
- **Package Name**: `com.mauriplay.app`
- **Version**: 1.0.0
- **Version Code**: 1

### Key Features

- ✅ PWA-ready with offline support
- ✅ RTL (Right-to-Left) layout for Arabic
- ✅ Responsive design for all screen sizes
- ✅ Safe area handling for modern devices
- ✅ Splash screen with brand colors
- ✅ Privacy Policy page accessible at `/privacy-policy`
- ✅ Secure HTTPS communication
- ✅ Optimized performance

## Build Process

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Build the Web Application

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Step 3: Add Android Platform

If this is your first build, add the Android platform:

```bash
npm run cap:add:android
```

This creates an `android/` directory with the native Android project.

### Step 4: Sync Capacitor

Sync the web build with the native Android project:

```bash
npm run cap:sync
```

This copies the web assets and updates native configurations.

### Step 5: Open Android Studio

```bash
npm run android:open
```

This opens the Android project in Android Studio.

## Building APK/AAB for Production

### Option 1: Build APK (for testing)

1. Open Android Studio
2. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. Wait for the build to complete
4. The APK will be at: `android/app/build/outputs/apk/release/app-release-unsigned.apk`

### Option 2: Build AAB (for Play Store)

1. Open Android Studio
2. Go to **Build > Generate Signed Bundle / APK**
3. Select **Android App Bundle**
4. Create or select your keystore:
   - **Key store path**: Create a new keystore or use existing
   - **Key store password**: Set a strong password
   - **Key alias**: `mauriplay-key`
   - **Key password**: Set a strong password
5. Select **release** build variant
6. Click **Finish**
7. The AAB will be at: `android/app/release/app-release.aab`

**⚠️ IMPORTANT**: Store your keystore file and passwords securely. You'll need them for all future updates.

## Signing Configuration

### Creating a Keystore

```bash
keytool -genkey -v -keystore mauriplay-release.keystore -alias mauriplay-key -keyalg RSA -keysize 2048 -validity 10000
```

Answer the prompts with your information.

### Configure Gradle for Signing

Create `android/key.properties`:

```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=mauriplay-key
storeFile=/path/to/mauriplay-release.keystore
```

Then update `android/app/build.gradle` to use these properties for release builds.

## Google Play Store Requirements

### 1. App Icons

The project includes all required icon sizes:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

For Play Store listing, you'll also need:
- **App Icon**: 512x512 PNG (already included as `icon-512.png`)
- **Feature Graphic**: 1024x500 PNG (create using your brand assets)

### 2. Screenshots

Capture screenshots for:
- **Phone**: 4-8 screenshots (min 320px on shortest side, max 3840px on longest side)
- **7-inch Tablet**: Optional but recommended
- **10-inch Tablet**: Optional but recommended

Recommended screenshot pages:
1. Home page showing platforms
2. Product listing page
3. Purchase flow
4. Wallet page
5. My Purchases page
6. Profile page

### 3. Privacy Policy

✅ Privacy Policy is available at: `https://yourdomain.com/privacy-policy`

Make sure to update the Play Store listing with this URL.

### 4. App Content Rating

Fill out the content rating questionnaire on Play Console. MauriPlay should receive an appropriate rating (likely E for Everyone or T for Teen depending on game content).

### 5. Target Audience

- **Primary**: Users 13 years and older
- **Geography**: Primarily Mauritania and Arabic-speaking regions

### 6. App Categories

- **Primary**: Entertainment
- **Secondary**: Shopping

## Store Listing Content

### Short Description (80 characters max)

```
منصة موريتانية لبيع البطاقات الرقمية وأكواد الألعاب والترفيه
```

### Full Description (4000 characters max)

```
🎮 MauriPlay - سوق الألعاب الرقمية

منصة موريتانية متخصصة في بيع البطاقات الرقمية وأكواد الألعاب والمنصات الترفيهية بأمان وسهولة.

✨ المميزات الرئيسية:

🛒 شراء سريع وآمن
• مجموعة واسعة من المنتجات الرقمية
• طرق دفع متعددة ومرنة
• استلام فوري للأكواد بعد التأكيد

💰 نظام المحفظة الذكي
• شحن المحفظة بسهولة
• مراجعة سريعة للطلبات
• شراء فوري بدون انتظار

📱 واجهة عصرية وسهلة
• تصميم عصري باللغة العربية
• تجربة استخدام سلسة
• دعم جميع أحجام الشاشات

🔒 أمان وموثوقية
• حماية كاملة لبياناتك
• معاملات آمنة ومشفرة
• دعم فني متواصل

📋 إدارة مشترياتك
• عرض سجل المشتريات
• الوصول السريع للأكواد
• روابط الاستخدام والشروحات

🎯 المنصات المدعومة:
• بطاقات الألعاب (PlayStation, Xbox, Nintendo)
• اشتراكات الترفيه (Netflix, Spotify, وغيرها)
• بطاقات الشحن الرقمية
• وأكثر!

📞 الدعم الفني:
فريق الدعم متاح للإجابة على استفساراتك ومساعدتك في أي وقت.

🇲🇷 خدمة موريتانية بامتياز
صُممت خصيصاً للسوق الموريتاني بطرق دفع محلية ودعم باللغة العربية.

حمّل التطبيق الآن واستمتع بتجربة تسوق رقمية فريدة! 🚀
```

### What's New (500 characters max)

```
🎉 الإصدار الأول من MauriPlay!

✨ المميزات:
• شراء المنتجات الرقمية بسهولة
• نظام محفظة ذكي
• طرق دفع متعددة
• واجهة عصرية بالعربية
• استلام فوري للأكواد
• دعم فني متواصل

نحن متحمسون لخدمتكم! 🚀
```

## Testing Before Submission

### 1. Internal Testing

- Test all user flows: registration, login, purchase, wallet top-up
- Verify payment methods display correctly
- Test on different screen sizes
- Check RTL layout
- Verify Privacy Policy link works
- Test back navigation

### 2. Closed Testing

- Invite a small group of testers (10-20 people)
- Collect feedback
- Fix any reported issues
- Test on various devices and Android versions

### 3. Open Testing (Optional)

- Expand testing to a larger audience
- Monitor crash reports
- Address performance issues

## Submission Checklist

Before submitting to Google Play:

- [ ] Build signed release AAB
- [ ] Test on multiple devices
- [ ] Privacy Policy URL added to listing
- [ ] All required screenshots uploaded
- [ ] App icon and feature graphic uploaded
- [ ] Content rating completed
- [ ] Target audience defined
- [ ] Store listing translated (Arabic)
- [ ] Contact information updated
- [ ] Review app policies compliance
- [ ] Set pricing and distribution
- [ ] Configure in-app updates

## Post-Launch

### Monitoring

- Monitor crash reports in Play Console
- Track user reviews and ratings
- Check performance metrics
- Monitor API usage in Supabase

### Updates

To release an update:

1. Increment version in `package.json`
2. Update version code in `android/app/build.gradle`
3. Build and test
4. Create release notes
5. Upload new AAB to Play Console
6. Submit for review

## Troubleshooting

### Build Fails

```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew build
```

### Capacitor Sync Issues

```bash
# Remove and re-add platform
npx cap remove android
npx cap add android
npm run build
npx cap sync android
```

### Icons Not Updating

```bash
# Force sync
npx cap sync android --force
```

## Support

For technical support:
- WhatsApp: +222 30 45 93 88
- Check Supabase logs for backend issues
- Review Capacitor documentation: https://capacitorjs.com/docs

## Additional Resources

- [Google Play Console](https://play.google.com/console)
- [Android Developer Guide](https://developer.android.com/guide)
- [Capacitor Android Docs](https://capacitorjs.com/docs/android)
- [Supabase Documentation](https://supabase.com/docs)

---

**Good luck with your launch! 🚀**
