# nafaa-promo-video

فيديو تعريفي بمنصة **نفع**، وهي منصة لتشغيل أصول الجمعيات الأهلية في نجران واستثمارها. بُني الفيديو بـ Remotion + React + TypeScript.

| النسخة | Composition | الأبعاد | المدة |
|---|---|---|---|
| أفقية | `NafaaPromo` | 1920×1080 | 78 ثانية (2340 إطارًا، 30fps) |
| عمودية | `NafaaPromoVertical` | 1080×1920 | 78 ثانية (2340 إطارًا، 30fps) |

## التشغيل

```bash
npm install
npx remotion studio
```

يلزم Node.js بالإصدار 22.6 أو أحدث (لأمر `npm run check`).

## التصيير

```bash
# النسخة الأفقية 1920×1080
npx remotion render NafaaPromo out/nafaa-promo.mp4

# النسخة العمودية 1080×1920
npx remotion render NafaaPromoVertical out/nafaa-promo-vertical.mp4
```

وهما متاحان أيضًا بالأمرين `npm run render` و `npm run render:vertical`.

ينزّل Remotion متصفح Chrome Headless Shell تلقائيًا عند أول تصيير. إذا كانت الشبكة تمنع ذلك، مرّر متصفحًا موجودًا على جهازك:

```bash
REMOTION_BROWSER=/path/to/chrome-headless-shell npx remotion render NafaaPromo out/nafaa-promo.mp4
```

## تعديل النص والتوقيت (لغير المبرمجين)

كل النصوص والتوقيتات موجودة في ملف واحد هو **`src/script.ts`**، وهو معلّق بالعربية.

- الأوقات بالثواني من بداية الفيديو.
- دعوة الفعل والرابط في المتغيرين `CTA_TEXT` و `CTA_LINK` في أعلى الملف.
- بعد أي تعديل شغّل الأمر التالي. يتحقق من أن أي نص لا يظهر أقل من 1.8 ثانية، ومن أن المشاهد متصلة ومدتها الكلية 78 ثانية:

```bash
npm run check
```

## الملفات التي تضيفها بنفسك (كلها اختيارية)

| الملف | الاستخدام | إذا لم يوجد |
|---|---|---|
| `public/logo.png` | لوقو نفع، ثابت أعلى يمين الشاشة وفي منتصف المشهدين 3 و8 | يظهر شعار نصي بديل "نفع" |
| `public/vo.mp3` | التعليق الصوتي، يبدأ من الثانية 0 | يعمل الفيديو دونه |
| `public/music.mp3` | الموسيقى: تنخفض إلى 15٪ أثناء التعليق وترجع إلى 40٪ في الفواصل | يعمل الفيديو بصمت |
| `public/assets/*.png` | الصور (القائمة أدناه) | يظهر مربع بديل بلون الهوية يحمل اسم الأصل |

أسماء الصور معرّفة في ملف واحد هو `src/assets.ts`:

```
public/assets/hall-empty.png        قاعة فارغة          (المشهد 1)
public/assets/stadium-night.png     ملعب ليلي           (المشهد 1)
public/assets/warehouse.png         مستودع              (المشهد 1)
public/assets/charity-building.png  مبنى جمعية          (المشهدان 2 و3)
public/assets/training-hall.png     قاعة تدريب          (المشهد 6)
public/assets/meeting-room.png      قاعة اجتماعات       (المشهد 6)
public/assets/sports-field.png      ملعب                (المشهد 6)
public/assets/event-venue.png       مقر احتفالات        (المشهد 6)
public/assets/office.png            مكتب                (المشهد 6)
public/assets/storage.png           مستودع              (المشهد 6)
```

تتحول كل الصور تلقائيًا إلى دوتون، فيصير الظل `#0E4F49` والإضاءة `#F5F2E8`، ولذلك تصلح أي صورة ملونة.

## بنية المشروع

```
src/
  script.ts            ← النص والتوقيتات (الملف الوحيد الذي تحتاج تعديله)
  assets.ts            ← سجل الأصول (manifest) وفحص وجود الملفات
  theme.ts             ← الألوان وأحجام النص
  fonts.ts             ← تحميل خط Cairo محليًا من public/fonts
  NafaaPromo.tsx       ← تجميع المشاهد والطبقات العلوية والصوت
  components/
    TypePlate.tsx      لوح نص يُكشف بقناع clip-path من اليمين لليسار
    DuotoneImage.tsx   دوتون عبر SVG feColorMatrix مع بارالاكس
    HandCircle.tsx     دائرة يدوية تُرسم عبر stroke-dashoffset
    NajranMap.tsx      خريطة تخطيطية مع إبراز نجران ونقاط متتابعة
    FlowStep.tsx       أيقونة وعنوان لكل خطوة
    SplitBar.tsx       شريط 70/30 مع عدّاد تصاعدي
    Grain.tsx          ملمس ورقي بشفافية 6٪
    Vignette.tsx       تظليل الحواف
    Wipe.tsx           الانتقال الموحّد (مسح من اليمين لليسار، 0.4 ثانية)
    Logo.tsx, Placeholder.tsx, AudioLayer.tsx
  scenes/S1.tsx … S8.tsx
public/fonts/          ← Cairo بالأوزان 400/700/900 (woff2، ترخيص OFL)
```

## ملاحظات فنية

- **اتصال الحروف العربية:** كل نص يُعرض عقدة نصية واحدة، ولا يُقسَّم إلى حروف أو `span`. الكشف يتم بقناع `clip-path` فقط، ولا يُستخدم `letter-spacing`.
- **الحركة:** كل الحركات مبنية على `spring`. الاستثناءان الوحيدان هما البارالاكس الخطي في الصور، ومستوى صوت الموسيقى.
- **الخريطة:** تخطيطية مبسّطة لإعطاء الشكل العام، وليست مرجعًا جغرافيًا دقيقًا.

## نسخة HTML مستقلة (موشن جرافيك)

الملف `standalone/nafaa-intro.html` فيديو تعريفي مستقل (1920×1080، ‏49 ثانية) مبني بـ GSAP، ولا يحتاج إلى أي تثبيت. التعليق الصوتي المنقّى مضمَّن داخله ومتزامن مع المشاهد؛ افتحه في المتصفح واضغط تشغيل. يمكن استبدال الصوت من زر «رفع الصوت».

- الصوت المنقّى منفصلًا: `standalone/nafaa-vo-clean.mp3`، والتفريغ بالأزمنة: `standalone/transcript.md`.

- التوقيتات كلها في الكائن `CUES` أعلى السكربت.
- الاختصارات: `Space` للتشغيل والإيقاف، والأسهم للتقديم والترجيع ثانيتين، و`1`–`9` و`0` للقفز إلى مشهد، و`H` لإخفاء أدوات التحكم، و`F` لملء الشاشة.
- معاملات الرابط: `?t=30` يبدأ من الثانية 30، و`?autoplay=1` يشغّل مباشرة.
- يحتاج اتصالًا بالإنترنت لتحميل GSAP من cdnjs والخط من Google Fonts.
