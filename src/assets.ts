import {getStaticFiles, staticFile} from 'remotion';

/*
 * سجل الأصول (manifest) — كل الصور في public/assets/
 * المفتاح يُستخدم في script.ts، و file هو اسم الملف داخل public/،
 * و label هو الاسم الذي يظهر على المربع البديل إن لم توجد الصورة.
 */
export const ASSETS = {
  hallEmpty: {file: 'assets/hall-empty.png', label: 'قاعة فارغة'},
  stadiumNight: {file: 'assets/stadium-night.png', label: 'ملعب ليلي'},
  warehouse: {file: 'assets/warehouse.png', label: 'مستودع'},
  charityBuilding: {file: 'assets/charity-building.png', label: 'مبنى جمعية'},
  trainingHall: {file: 'assets/training-hall.png', label: 'قاعة تدريب'},
  meetingRoom: {file: 'assets/meeting-room.png', label: 'قاعة اجتماعات'},
  sportsField: {file: 'assets/sports-field.png', label: 'ملعب'},
  eventVenue: {file: 'assets/event-venue.png', label: 'مقر احتفالات'},
  office: {file: 'assets/office.png', label: 'مكتب'},
  storage: {file: 'assets/storage.png', label: 'مستودع'},
} as const satisfies Record<string, {file: string; label: string}>;

export type AssetKey = keyof typeof ASSETS;

export const LOGO_FILE = 'logo.png';
export const VO_FILE = 'vo.mp3';
export const MUSIC_FILE = 'music.mp3';

/** هل الملف موجود فعلًا داخل public/ ؟ (يعمل في الاستوديو وأثناء التصيير) */
export const hasPublicFile = (name: string): boolean => {
  const files = getStaticFiles();
  return files.some((f) => f.name === name || f.name === name.replace(/\//g, '\\'));
};

/** يرجع رابط الصورة إن وُجدت، وإلا null ليُرسم مربع بديل */
export const resolveAsset = (key: string): {src: string | null; label: string} => {
  const entry = (ASSETS as Record<string, {file: string; label: string}>)[key];
  if (!entry) return {src: null, label: key};
  return {src: hasPublicFile(entry.file) ? staticFile(entry.file) : null, label: entry.label};
};
