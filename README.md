# تحويشتي — Saving Challenge Website

موقع عربي RTL يعمل على GitHub + Replit، مع تسجيل Google/Email وحفظ الخانات لكل مستخدم عبر Supabase.

## 1) Supabase
1. أنشئ مشروعًا جديدًا في Supabase.
2. افتح SQL Editor وشغّل محتوى `supabase.sql` كاملًا.
3. من Project Settings > API انسخ Project URL و Publishable key (أو anon key إن ظهر عندك).
4. افتح `app.js` وضع القيم مكان:
   - `YOUR_SUPABASE_URL`
   - `YOUR_SUPABASE_PUBLISHABLE_KEY`

## 2) Google Login
من Authentication > Providers > Google فعّل Google.
ستحتاج Google OAuth Client ID و Client Secret. في Google Cloud أنشئ OAuth client من نوع Web application.

ضع Authorized JavaScript origin = رابط موقعك النهائي.
ضع Authorized redirect URI = رابط callback الذي يعرضه لك Supabase في صفحة Google provider.

في Supabase Authentication > URL Configuration:
- Site URL = رابط موقعك النهائي.
- Redirect URLs = رابط موقعك النهائي، ويمكن إضافة localhost أثناء التجربة.

الكود يستخدم `redirectTo: window.location.origin`، لذلك يجب أن يكون رابط الموقع موجودًا ضمن Redirect URLs المسموح بها.

## 3) GitHub
ارفع الملفات الخمسة إلى Repository:
- index.html
- styles.css
- app.js
- supabase.sql
- README.md

## 4) Replit
أنشئ Repl جديد واختر HTML/CSS/JS، ثم ارفع الملفات أو اربط Repository من GitHub.
شغّل الموقع من Replit ثم اعمل Deploy.

بعد ظهور رابط Replit النهائي، أضفه في Supabase URL Configuration وفي Google Authorized JavaScript origins.

## ملاحظات
- لا تضع Supabase `service_role` أو أي Secret key داخل `app.js`.
- الموقع يقسم المبلغ إلى 20/50/100/200/250 ويخلط الخانات عشوائيًا.
- كل علامة صح تُحفظ في قاعدة البيانات لحساب المستخدم.
- الخطة الحالية للمستخدم تُستبدل عند إنشاء خطة جديدة.
