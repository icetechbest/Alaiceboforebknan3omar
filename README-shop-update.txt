تحديث المتجر: خفاش + إدارة المتجر من الموقع
============================================
فك الضغط فوق فولدر البوت (هيستبدل الملفات دي ويضيف core/shopCatalog.js) وبعدين اعمل ريستارت.

ملف جديد : core/shopCatalog.js
معدّلة   : commands/RPG/shop.js, shopAnimals.js, inf.js, buy.js
           dashboard-server/index.js, dashboard-server/API_SPEC.md
           dashboard-ui/app.js

مفيش تعديل في data/shopItems.js ولا في database.json.
الخفاش بيتضاف تلقائيًا أول ما البوت يقرا المتجر، وسعره/قوته بيتحسبوا من حيواناتك الحالية.
