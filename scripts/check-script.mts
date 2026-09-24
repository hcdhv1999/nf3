/* يتحقق من سلامة توقيتات src/script.ts — شغّله بـ: npm run check */
import {scenes, DURATION_SECONDS, MIN_TEXT_SECONDS} from '../src/script.ts';

const errors: string[] = [];
const eps = 1e-6;

scenes.forEach((s, i) => {
  if (i === 0 && s.from !== 0) errors.push(`${s.id}: يجب أن يبدأ المشهد الأول من 0`);
  if (i > 0 && Math.abs(scenes[i - 1].to - s.from) > eps)
    errors.push(`${s.id}: يجب أن يبدأ عند نهاية المشهد السابق (${scenes[i - 1].to})`);
  const texts = [
    ...s.lines.map((l) => ({text: l.text, from: l.from, to: l.to})),
    ...(s.categories ?? []).map((c) => ({text: c.label, from: c.from, to: c.to})),
  ];
  for (const t of texts) {
    if (t.to - t.from < MIN_TEXT_SECONDS - eps)
      errors.push(`${s.id}: النص "${t.text}" يظهر ${(t.to - t.from).toFixed(2)} ث فقط (الحد الأدنى ${MIN_TEXT_SECONDS} ث)`);
    if (t.from < s.from - eps || t.to > s.to + eps)
      errors.push(`${s.id}: النص "${t.text}" خارج حدود المشهد (${s.from}–${s.to})`);
  }
  for (const st of s.steps ?? []) {
    if (s.to - st.at < MIN_TEXT_SECONDS) errors.push(`${s.id}: الخطوة "${st.title}" تظهر متأخرة جدًا`);
  }
});
if (Math.abs(scenes[scenes.length - 1].to - DURATION_SECONDS) > eps)
  errors.push(`المشهد الأخير يجب أن ينتهي عند ${DURATION_SECONDS} ث`);

if (errors.length) {
  console.error('❌ مشاكل في script.ts:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log(`✅ script.ts سليم: ${scenes.length} مشاهد، ${DURATION_SECONDS} ثانية.`);
