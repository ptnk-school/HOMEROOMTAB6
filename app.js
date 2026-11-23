/* ==========================================================
   Homeroom ทับหก (2569-2571) - Main Application Logic
   Supports Student ID Login, Teacher/Treasurer Admin Mode,
   Class Fund Tracker, Moral Project Link, Lucky Number Draw,
   Duty Image Upload, and Google Sheets Sync.
   ========================================================== */

const STORAGE_KEY = 'HOMEROOM_TUB6_DATA_V5';
const SESSION_KEY = 'HOMEROOM_TUB6_SESSION_V5';
const GAS_URL_KEY = 'HOMEROOM_TUB6_GAS_URL';
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbyDpur_0B0cPKHEcAvcbi6uMAJNGSdfR-ZnvmNMOXxkUzGohn8Jw46pooBdpMABJjvUCA/exec';

function getActiveGasUrl() {
  return localStorage.getItem(GAS_URL_KEY) || DEFAULT_GAS_URL;
}

// รายการรูปสัตว์ประจำตัว 45 แบบ (ไม่ซ้ำกันสำหรับนักเรียนแต่ละเลขที่)
const ANIMAL_AVATARS = [
  '🐼', '🐰', '🐱', '🦊', '🐹', '🐻', '🐨', '🐯', '🦁', '🐶',
  '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦉', '🦄',
  '🐝', '🦋', '🐢', '🐙', '🐬', '🐳', '🦭', '🦦', '🦥', '🐿️',
  '🦔', '🐇', '🦢', '🦩', '🦚', '🦜', '🐉', '🦌', '🦒', '🦘',
  '🦙', '🦛', '🐘', '🦫', '🦡'
];

function getUniqueAnimalForNo(no) {
  const idx = (Math.max(1, Number(no) || 1) - 1) % ANIMAL_AVATARS.length;
  return ANIMAL_AVATARS[idx];
}

function ensureUniqueStudentAnimals(students) {
  if (!Array.isArray(students)) return;
  const used = new Set();
  students.forEach((stu, idx) => {
    if (!stu.emoji || used.has(stu.emoji)) {
      // Find first unused animal based on student number
      let candidate = getUniqueAnimalForNo(stu.no || (idx + 1));
      if (used.has(candidate)) {
        candidate = ANIMAL_AVATARS.find(a => !used.has(a)) || candidate;
      }
      stu.emoji = candidate;
    }
    used.add(stu.emoji);
  });
}

// Generate Cute Default SVG Placeholders for Duty & Timetable Images
function createCuteScheduleSvg(title, subtitle, items) {
  const rows = items.map((item, i) => {
    const y = 135 + i * 56;
    const bg = i % 2 === 0 ? '#FFF1F2' : '#FFFFFF';
    return `
      <rect x="40" y="${y}" width="720" height="46" rx="12" fill="${bg}" stroke="#FECDD3" stroke-width="1.5"/>
      <rect x="48" y="${y + 7}" width="115" height="32" rx="8" fill="#E11D48"/>
      <text x="105" y="${y + 28}" font-family="Kanit, sans-serif" font-size="15" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${item.day}</text>
      <text x="185" y="${y + 29}" font-family="Kanit, sans-serif" font-size="15" fill="#334155">${item.detail}</text>
    `;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
    <rect width="800" height="450" rx="24" fill="#FFFBFB" stroke="#FDA4AF" stroke-width="4"/>
    <rect x="20" y="20" width="760" height="90" rx="18" fill="#FFE4E6"/>
    <text x="400" y="62" font-family="Mali, Kanit, sans-serif" font-size="26" font-weight="bold" fill="#BE123C" text-anchor="middle">🌸 ${title} 🌸</text>
    <text x="400" y="92" font-family="Kanit, sans-serif" font-size="15" fill="#E11D48" text-anchor="middle">${subtitle}</text>
    ${rows}
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const DEFAULT_DUTY_SVG = createCuteScheduleSvg(
  'ตารางเวรประจำวัน ห้องทับหก (2569-2571)',
  'ทำความสะอาดห้องเรียน ลบกระดาน จัดโต๊ะ และทิ้งขยะก่อนกลับบ้าน',
  [
    { day: 'วันจันทร์', detail: 'เลขที่ 1, 2, 3 (หัวหน้าเวร: กิตติพงศ์) • กวาดพื้น ถูพื้น ลบกระดาน' },
    { day: 'วันอังคาร', detail: 'เลขที่ 4, 5, 6 (หัวหน้าเวร: ธนกร) • กวาดพื้น จัดโต๊ะเรียน ทิ้งขยะ' },
    { day: 'วันพุธ', detail: 'เลขที่ 7, 8, 9 (หัวหน้าเวร: ปุณยวีร์) • กวาดพื้น ถูพื้น เช็ดหน้าต่าง' },
    { day: 'วันพฤหัสบดี', detail: 'เลขที่ 10, 11, 12 (หัวหน้าเวร: ภัทรพล) • กวาดพื้น ลบกระดาน ทิ้งขยะ' },
    { day: 'วันศุกร์', detail: 'เลขที่ 13, 14, 15 (หัวหน้าเวร: สิรินาถ) • ทำความสะอาดใหญ่ & ปิดสวิตช์ไฟ' }
  ]
);

const DEFAULT_TIMETABLE_SVG = createCuteScheduleSvg(
  'ตารางเรียนประจำห้องทับหก',
  'ครูที่ปรึกษาสามารถกดปุ่ม "อัปโหลดรูปตารางเรียน" เพื่อเปลี่ยนเป็นรูปจริงได้ทันที',
  [
    { day: 'วันจันทร์', detail: '08:30 โฮมรูม | คณิตศาสตร์ | ภาษาไทย | ภาษาจีน | วิทยาศาสตร์' },
    { day: 'วันอังคาร', detail: '08:30 โฮมรูม | ภาษาอังกฤษ | สังคมศึกษา | คอมพิวเตอร์ | สุขศึกษา' },
    { day: 'วันพุธ', detail: '08:30 โฮมรูม | วิทยาศาสตร์ | คณิตศาสตร์ | ศิลปะ | กิจกรรมชุมนุม' },
    { day: 'วันพฤหัสบดี', detail: '08:30 โฮมรูม | ภาษาไทย | ภาษาอังกฤษ | ประวัติศาสตร์ | ลูกเสือ/บำเพ็ญ' },
    { day: 'วันศุกร์', detail: '08:30 โฮมรูม | ภาษาจีน | การงานอาชีพ | แนะแนว | โครงงานคุณธรรม' }
  ]
);

// Initial Sample Dataset for Homeroom ทับหก (2569-2571)
const INITIAL_DATA = {
  adminPass: '2569',
  treasurerStudentId: '20854', // แก้ม (นางสาวกตธิตา ด้วงประเสริฐ) เป็นเหรัญญิกประจำห้อง
  classInfo: {
    teacherName: '(老师) ครูตูน & ครูอาร์ต',
    classMotto: '“สามัคคี มีวินัย รักกันมากๆ”',
    moralProjectTitle: 'โครงงานคุณธรรม ห้อง ม.4/6 (2569-2571)',
    moralProjectDesc: 'เว็บไซต์รวบรวมผลการดำเนินงาน กิจกรรมความดี และติดตามความคืบหน้าโครงงานคุณธรรมของนักเรียนห้องทับหก',
    moralProjectUrl: 'https://ptnk-school.github.io/dd-moral/'
  },
  students: [
    { no: 1, id: '18732', name: 'นายปิยะรชวัตร ด้วงเจริญ', nickname: 'แฟ้ม', role: 'รองหัวหน้าห้อง', dutyDay: 'วันศุกร์', emoji: '🐱', homeLocation: 'https://maps.app.goo.gl/DtY6DVFMETFfzN91A', homeNote: '', homeVisited: true },
    { no: 2, id: '18733', name: 'นายพิชาภพ สง่าเนตร', nickname: 'ซัน', role: 'สมาชิกห้อง', dutyDay: 'วันศุกร์', emoji: '🦊', homeLocation: 'https://maps.app.goo.gl/L6rfSkgDKUjtvZVQ6', homeNote: '', homeVisited: false },
    { no: 3, id: '18872', name: 'นายณัฐวุฒิ อุปดิษฐ์', nickname: 'ปอ', role: 'สมาชิกห้อง', dutyDay: 'วันพฤหัสบดี', emoji: '🐼', homeLocation: 'https://maps.app.goo.gl/mwVVmmFxWoUAku1X8', homeNote: '', homeVisited: true },
    { no: 4, id: '19816', name: 'นายทักษ์พงค์ จิตรคง', nickname: 'นาย', role: 'สมาชิกห้อง', dutyDay: 'วันพุธ', emoji: '🐰', homeLocation: 'https://maps.app.goo.gl/sVaQ6ha2M9TQVh1M6', homeNote: '', homeVisited: false },
    { no: 5, id: '20461', name: 'นายวรินทร จันทคุ้ม', nickname: 'ไนซ์', role: 'สมาชิกห้อง', dutyDay: 'วันศุกร์', emoji: '🐔', homeLocation: 'https://maps.app.goo.gl/6omN3Z3CaX5eUUEB8', homeNote: '', homeVisited: true },
    { no: 6, id: '20845', name: 'นายคณิศร ล่องลอย', nickname: 'เบล', role: 'สมาชิกห้อง', dutyDay: 'วันพุธ', emoji: '🐹', homeLocation: 'https://maps.app.goo.gl/maY417rXZWnSbwRB8', homeNote: '', homeVisited: true },
    { no: 7, id: '20846', name: 'นายณวัฒน์ สลุงอยู่', nickname: 'เฟย์', role: 'สมาชิกห้อง', dutyDay: 'วันจันทร์', emoji: '🐻', homeLocation: 'https://maps.app.goo.gl/GvFnuY4NQ7U6G8dV8', homeNote: '', homeVisited: true },
    { no: 8, id: '20847', name: 'นายธนโชค จุลศิลป์', nickname: 'โก๊ะ', role: 'สมาชิกห้อง', dutyDay: 'วันพุธ', emoji: '🐨', homeLocation: 'https://maps.app.goo.gl/thyzYbpivifCFoLt6', homeNote: '', homeVisited: true },
    { no: 9, id: '20848', name: 'นายธนธร ภู่แสนสอาด', nickname: 'อะตอม', role: 'สมาชิกห้อง', dutyDay: 'วันจันทร์', emoji: '🐯', homeLocation: 'https://maps.app.goo.gl/p2eWsp4MP6DjER368', homeNote: '', homeVisited: true },
    { no: 10, id: '20849', name: 'นายธนวิชญ์ เกตุสุวรรณ', nickname: 'ตูน', role: 'สมาชิกห้อง', dutyDay: 'วันพุธ', emoji: '🦁', homeLocation: 'https://maps.app.goo.gl/1CocAcPrzJs16wdy9', homeNote: '', homeVisited: true },
    { no: 11, id: '20850', name: 'นายภีมเดช เกิดเพ็ชร์', nickname: 'ภีม', role: 'สมาชิกห้อง', dutyDay: 'วันศุกร์', emoji: '🐶', homeLocation: 'https://maps.app.goo.gl/1jLsjYDe1rda7oA78', homeNote: '', homeVisited: true },
    { no: 12, id: '20851', name: 'นายภูริณัฐ สายสุข', nickname: 'ปังปอนด์', role: 'สมาชิกห้อง', dutyDay: 'วันจันทร์', emoji: '🐷', homeLocation: 'https://maps.app.goo.gl/AVaaSaGJdHv5ub7y9', homeNote: '', homeVisited: false },
    { no: 13, id: '20852', name: 'นายศุภมงคล นิ่มประดิษฐ์', nickname: 'ตี้', role: 'สมาชิกห้อง', dutyDay: 'วันพุธ', emoji: '🐸', homeLocation: 'https://maps.app.goo.gl/s1K1REEQKt1ceA5q9', homeNote: '', homeVisited: true },
    { no: 14, id: '20853', name: 'นายอาทิตย์ กฤษ์ศรี', nickname: 'โม่', role: 'สมาชิกห้อง', dutyDay: 'วันพุธ', emoji: '🐵', homeLocation: 'https://maps.app.goo.gl/p8aBhErskyw283BY8', homeNote: '', homeVisited: true },
    { no: 15, id: '21034', name: 'นายนพนัยต์ พรมมิ', nickname: 'เปา', role: 'สมาชิกห้อง', dutyDay: 'วันศุกร์', emoji: '🐧', homeLocation: 'https://maps.app.goo.gl/uG1W6tog8oGfA6zS7', homeNote: '', homeVisited: false },
    { no: 16, id: '18777', name: 'นางสาวณัชชา ลิบวงศ์สุต', nickname: 'ฝน', role: 'สมาชิกห้อง', dutyDay: 'วันพฤหัสบดี', emoji: '🐦', homeLocation: 'https://maps.app.goo.gl/Yf7hpsAA8qyTNyTk9', homeNote: '', homeVisited: false },
    { no: 17, id: '18939', name: 'นางสาวจิราพัชร สาทิพจันทร์', nickname: 'ปาล์ม', role: 'สมาชิกห้อง', dutyDay: 'วันพฤหัสบดี', emoji: '🐤', homeLocation: 'https://maps.app.goo.gl/DytBsjidxkS5vCzF6', homeNote: '', homeVisited: true },
    { no: 18, id: '18781', name: 'นางสาวนภัสสร เม็งจันทึก', nickname: 'หลิน', role: 'สมาชิกห้อง', dutyDay: 'วันอังคาร', emoji: '🦆', homeLocation: 'https://maps.app.goo.gl/K1xdmCPHCSk7Jxut8', homeNote: '', homeVisited: true },
    { no: 19, id: '18784', name: 'นางสาวปรัชญา โต๊ะศิลา', nickname: 'แพรว', role: 'หัวหน้าห้อง', dutyDay: 'วันอังคาร', emoji: '🦉', homeLocation: 'https://maps.app.goo.gl/kxNwG4fvZsnEfRCt8', homeNote: '', homeVisited: false },
    { no: 20, id: '18800', name: 'นางสาวอภิชญา ช่างทอง', nickname: 'ครีม', role: 'สมาชิกห้อง', dutyDay: 'วันพฤหัสบดี', emoji: '🐝', homeLocation: 'https://maps.app.goo.gl/RreRPhyKyaVRmckn9', homeNote: '', homeVisited: true },
    { no: 21, id: '20854', name: 'นางสาวกตธิตา ด้วงประเสริฐ', nickname: 'แก้ม', role: 'เหรัญญิกประจำห้อง 🧧', dutyDay: 'วันจันทร์', emoji: '🦋', homeLocation: 'https://maps.app.goo.gl/fxDnwp9nXW5AbnBB7', homeNote: '', homeVisited: true },
    { no: 22, id: '20855', name: 'นางสาวชญานุช ดอกสันเทียะ', nickname: 'มาย', role: 'สมาชิกห้อง', dutyDay: 'วันอังคาร', emoji: '🐢', homeLocation: 'https://maps.app.goo.gl/aXwuJoVFhqGuU1fH9', homeNote: '', homeVisited: false },
    { no: 23, id: '20856', name: 'นางสาวเบญญาภา ปีเอี่ยม', nickname: 'เอ็มเจ', role: 'สมาชิกห้อง', dutyDay: 'วันพุธ', emoji: '🐙', homeLocation: 'https://maps.app.goo.gl/LtjJgqpztYasYxwf6', homeNote: '', homeVisited: true },
    { no: 24, id: '20857', name: 'นางสาวปุณยาพร เทียมสี', nickname: 'กระติ๊บ', role: 'สมาชิกห้อง', dutyDay: 'วันศุกร์', emoji: '🐬', homeLocation: 'https://maps.app.goo.gl/78oaA4jpjDGEGHQy8', homeNote: '', homeVisited: false },
    { no: 25, id: '20858', name: 'นางสาวภัทราภรณ์ พงษ์โอสถ', nickname: 'แอม', role: 'สมาชิกห้อง', dutyDay: 'วันศุกร์', emoji: '🐳', homeLocation: 'https://maps.app.goo.gl/N4vrKyhZvhCjufHQ9', homeNote: '', homeVisited: true },
    { no: 26, id: '20859', name: 'นางสาวเมธาพร แจ้แจ้ง', nickname: 'อาย', role: 'สมาชิกห้อง', dutyDay: 'วันอังคาร', emoji: '🦭', homeLocation: 'https://maps.app.goo.gl/dCzFaud5vb6jqKV88', homeNote: '', homeVisited: true },
    { no: 27, id: '20860', name: 'นางสาวรุ้ง แก้วอุดร', nickname: 'รุ้ง', role: 'สมาชิกห้อง', dutyDay: 'วันอังคาร', emoji: '🦦', homeLocation: 'https://maps.app.goo.gl/wNZpjmeYMX3tj6ek9', homeNote: '', homeVisited: false },
    { no: 28, id: '20861', name: 'นางสาวศิรประภา จันทรา', nickname: 'มีน', role: 'สมาชิกห้อง', dutyDay: 'วันพฤหัสบดี', emoji: '🦥', homeLocation: 'https://maps.app.goo.gl/GFeLckv1uGDko13q9', homeNote: '', homeVisited: true },
    { no: 29, id: '20862', name: 'นางสาวสิริยากร ทำลานดี', nickname: 'มิว', role: 'สมาชิกห้อง', dutyDay: 'วันอังคาร', emoji: '🐿️', homeLocation: 'https://maps.app.goo.gl/1oJkvojdpX2j8anf6', homeNote: '', homeVisited: true },
    { no: 30, id: '20863', name: 'นางสาวอชิรญา ไชยทาง', nickname: 'ออม', role: 'สมาชิกห้อง', dutyDay: 'วันจันทร์', emoji: '🦔', homeLocation: 'https://maps.app.goo.gl/ohF36uwskmGoZT1s6', homeNote: '', homeVisited: false },
    { no: 31, id: '20999', name: 'นางสาวกัญชลิกา งานสลุง', nickname: 'เค้ก', role: 'สมาชิกห้อง', dutyDay: 'วันจันทร์', emoji: '🦢', homeLocation: 'https://maps.app.goo.gl/wPTNi6TD1eXd76ZR7', homeNote: '', homeVisited: true },
    { no: 32, id: '21000', name: 'นางสาววิศัลยา พลีสังข์', nickname: 'เปาเปา', role: 'สมาชิกห้อง', dutyDay: 'วันศุกร์', emoji: '🦩', homeLocation: 'https://maps.app.goo.gl/Efhnm9p3tpDExxr46', homeNote: '', homeVisited: false },
    { no: 33, id: '21001', name: 'นางสาวศิรภัสสร นิลมาลา', nickname: 'ลักยิ้ม', role: 'สมาชิกห้อง', dutyDay: 'วันพฤหัสบดี', emoji: '🦚', homeLocation: 'https://maps.app.goo.gl/aL7HCn4SyfttYbgo6', homeNote: '', homeVisited: true }
  ],
  announcements: [
    {
      id: 'ann-1795442108364',
      title: 'สลับตารางเรียน',
      tag: 'ข่าวสารห้อง',
      date: '23 พ.ย. 2569',
      content: 'วันพุธ -- ใช้ตารางพฤหัส สลับคาบ1 กับ คาบ8\nวันพฤหัส -- ใช้ตารางเรียนวันพุธ',
      isPinned: true
    },
    {
      id: 'ann-1',
      title: '🌸 ยินดีต้อนรับสู่เว็บ Homeroom ชั้น ม.4/6 (2569-2571)',
      content: 'นักเรียนทั้ง 36 คน สามารถใช้เลขประจำตัว 5 หลัก (เช่น 18872, 19816) หรือเลขที่ (1-36) เพื่อเข้ามาตรวจสอบสถานะเงินห้อง โครงงานคุณธรรม และดูตารางเวรประจำวันได้ทุกเวลา!',
      date: '20 พ.ย. 2569',
      tag: 'ประกาศสำคัญ',
      isPinned: false
    }
  ],
  tasks: [],
  paymentPeriods: [
    {
      id: 'period-1',
      name: 'ครั้งที่ 1',
      amountPerStudent: 5,
      isAdvance: false,
      paidStudentIds: ['18732','18733','18872','19816','20461','20845','20846','20847','20848','20850','20851','20852','20853','21034','18777','18939','18781','18784','18800','20854','20855','20856','20857','20858','20859','20860','20861','20862','20863','20999','21000','21001']
    },
    {
      id: 'period-2',
      name: 'ครั้งที่ 2',
      amountPerStudent: 5,
      isAdvance: false,
      paidStudentIds: ['18732','18733','18872','19816','20461','20845','20846','20847','20848','20850','20851','20852','20853','21034','18777','18939','18781','18784','18800','20854','20855','20856','20857','20858','20859','20860','20861','20862','20863','20999','21000','21001']
    },
    {
      id: 'period-3',
      name: 'ครั้งที่ 3',
      amountPerStudent: 5,
      isAdvance: false,
      paidStudentIds: ['18732','18733','18872','19816','20461','20845','20846','20847','20848','20850','20851','20852','20853','21034','18777','18939','18781','18784','18800','20854','20855','20856','20857','20858','20859','20860','20861','20862','20863','20999','21000']
    },
    {
      id: 'period-4',
      name: 'ครั้งที่ 4',
      amountPerStudent: 5,
      isAdvance: false,
      paidStudentIds: ['18732','18733','18872','19816','20461','20845','20846','20847','20848','20850','20851','20852','20853','21034','18777','18939','18781','18784','18800','20854','20855','20856','20857','20858','20859','20860','20861','20862','20863','20999','21000']
    },
    {
      id: 'period-5',
      name: 'ครั้งที่ 5',
      amountPerStudent: 5,
      isAdvance: false,
      paidStudentIds: ['18732','18733','18872','19816','20846','20847','20848','20850','20851','20853','21034','18777','18939','18781','18784','18800','20854','20855','20856','20857','20858','20859','20860','20861','20862','20863','20999']
    },
    {
      id: 'period-6',
      name: 'ครั้งที่ 6',
      amountPerStudent: 5,
      isAdvance: false,
      paidStudentIds: ['18732','18733','18872','19816','20846','20847','20848','20850','20851','20853','21034','18777','18939','18781','18784','18800','20854','20855','20856','20858','20859','20860','20861','20862','20863','20999']
    },
    {
      id: 'period-7',
      name: 'ครั้งที่ 7',
      amountPerStudent: 5,
      isAdvance: false,
      paidStudentIds: ['18732','18733','18872','19816','20846','20847','20848','20850','20851','20853','21034','18781','18784','18800','20854','20855','20856','20858','20859','20860','20861','20863','20999']
    },
    {
      id: 'period-8',
      name: 'ครั้งที่ 8',
      amountPerStudent: 5,
      isAdvance: false,
      paidStudentIds: ['18732','18733','18872','19816','20846','20847','20848','20850','20851','20853','21034','18781','18784','18800','20854','20855','20856','20858','20859','20860','20861','20863','20999']
    },
    {
      id: 'period-9',
      name: 'ครั้งที่ 9',
      amountPerStudent: 5,
      isAdvance: true,
      paidStudentIds: ['18781','18784','20855','20856','20858','20860']
    },
    {
      id: 'period-10',
      name: 'ครั้งที่ 10',
      amountPerStudent: 5,
      isAdvance: true,
      paidStudentIds: ['18781','20856','20858','20860']
    },
    {
      id: 'period-11',
      name: 'ครั้งที่ 11',
      amountPerStudent: 5,
      isAdvance: true,
      paidStudentIds: ['20858']
    },
    {
      id: 'period-12',
      name: 'ครั้งที่ 12',
      amountPerStudent: 5,
      isAdvance: true,
      paidStudentIds: ['20858']
    }
  ],
  ledger: [
    {
      id: 'led-1795433309535',
      type: 'expense',
      date: '2026-11-23',
      title: 'ทำกระทง',
      amount: 400,
      note: ''
    },
    {
      id: 'led-1795433267189',
      type: 'expense',
      date: '2026-06-16',
      title: 'ทำพานไหว้ครู',
      amount: 402,
      note: ''
    }
  ],
  calendarEvents: [
    {
      id: 'evt-1',
      date: '2026-11-23',
      time: '08:30 - 09:20',
      title: 'โฮมรูมประจำสัปดาห์ & ตรวจความพร้อม',
      category: 'กิจกรรมห้อง',
      isHoliday: false,
      note: 'พบครูที่ปรึกษาและเช็คยอดเงินห้อง'
    },
    {
      id: 'evt-1795442017540',
      date: '2026-11-24',
      time: '12.00-16.00',
      title: 'กิจกรรมวันลอยกระทง',
      category: 'กิจกรรมห้อง',
      isHoliday: false,
      note: 'หวังว่าจะเป็นกระทง'
    },
    {
      id: 'evt-2',
      date: '2026-11-27',
      time: '15:30 - 16:30',
      title: 'อัปเดตความคืบหน้าโครงงานคุณธรรม ม.4/6',
      category: 'โครงงานคุณธรรม',
      isHoliday: false,
      note: 'บันทึกผลกิจกรรมผ่านลิงก์เว็บโครงงานคุณธรรม'
    },
    {
      id: 'evt-1795441200127',
      date: '2026-11-29',
      time: '8.30-12.00',
      title: 'ประชุมผู้ปกครอง',
      category: 'กิจกรรมห้อง',
      isHoliday: false,
      note: ''
    },
    {
      id: 'evt-3',
      date: '2026-11-30',
      time: '13:00 - 16:00',
      title: 'ครูที่ปรึกษาลงพื้นที่เยี่ยมบ้านนักเรียน',
      category: 'เยี่ยมบ้าน',
      isHoliday: false,
      note: 'ตามพิกัด Google Maps ที่บันทึกไว้ในระบบ'
    },
    {
      id: 'evt-1795441450079',
      date: '2026-12-01',
      time: '',
      title: 'สอบธรรมสนามหลวง',
      category: 'กิจกรรมห้อง',
      isHoliday: false,
      note: ''
    },
    {
      id: 'evt-1795441473698',
      date: '2026-12-04',
      time: '8.30-9.30',
      title: 'กิจกรรมวันพ่อแห่งชาติ',
      category: 'กิจกรรมห้อง',
      isHoliday: false,
      note: ''
    },
    {
      id: 'evt-1795441401148',
      date: '2026-12-07',
      time: '',
      title: 'หยุดชดเชยวันพ่อ',
      category: 'วันหยุด',
      isHoliday: true,
      note: ''
    },
    {
      id: 'evt-1795441418496',
      date: '2026-12-10',
      time: '',
      title: 'หยุดวันรัฐธรรมนูญ',
      category: 'วันหยุด',
      isHoliday: true,
      note: ''
    },
    {
      id: 'evt-1795441518481',
      date: '2026-12-16',
      time: '',
      title: 'หยุดพิเศษพระราชพิธีฌาปนกิจพระพันปี',
      category: 'วันหยุด',
      isHoliday: true,
      note: ''
    },
    {
      id: 'evt-1795441548328',
      date: '2026-12-28',
      time: '',
      title: 'สอบกลางภาค',
      category: 'กิจกรรมห้อง',
      isHoliday: false,
      note: 'ใส่ชุดนักเรียน'
    },
    {
      id: 'evt-1795441561932',
      date: '2026-12-29',
      time: '',
      title: 'สอบกลางภาค',
      category: 'กิจกรรมห้อง',
      isHoliday: false,
      note: 'ใส่ชุดนักเรียน'
    },
    {
      id: 'evt-1795441576666',
      date: '2026-12-30',
      time: '',
      title: 'สอบกลางภาค',
      category: 'กิจกรรมห้อง',
      isHoliday: false,
      note: 'ใส่ชุดนักเรียน'
    }
  ],
  images: {
    duty: DEFAULT_DUTY_SVG,
    timetable: DEFAULT_TIMETABLE_SVG
  }
};

// Runtime State
let appData = loadAppData();
let currentUser = null; // { role: 'student' | 'admin', student: {...} | null }
let activeTaskId = appData.tasks[0]?.id || null;
let activePeriodId = appData.paymentPeriods[0]?.id || null;
let paymentFilter = 'all'; // 'all' | 'paid' | 'unpaid'
let owedTableFilter = 'unpaid'; // 'unpaid' | 'all'
let homeVisitFilter = 'all'; // 'all' | 'visited' | 'unvisited'
let calendarViewYear = new Date().getFullYear();
let calendarViewMonth = new Date().getMonth(); // 0-11
let selectedCalendarDate = null; // 'YYYY-MM-DD' or null
let luckyPickedHistory = [];
let isSpinning = false;

// ==========================================================
// DATA STORAGE & GOOGLE SHEETS SYNC
// ==========================================================
function loadAppData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const merged = { ...INITIAL_DATA, ...parsed };
      ensureUniqueStudentAnimals(merged.students);
      return merged;
    }
  } catch (e) {
    console.warn('Failed to parse local data, using default:', e);
  }
  const initCopy = JSON.parse(JSON.stringify(INITIAL_DATA));
  ensureUniqueStudentAnimals(initCopy.students);
  return initCopy;
}

function saveAppData(skipCloud = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch (e) {
    alert('พื้นที่จัดเก็บในเบราว์เซอร์เต็ม (อาจเกิดจากรูปภาพขนาดใหญ่เกินไป)');
  }
  renderAll();
  if (!skipCloud) {
    pushToGoogleSheets();
  }
}

function updateSyncStatusUI(state, text) {
  const dot = document.getElementById('syncStatusDot');
  const label = document.getElementById('syncStatusText');
  if (!dot || !label) return;
  dot.className = 'w-2 h-2 rounded-full ' + (
    state === 'syncing' ? 'bg-amber-400 animate-ping' :
    state === 'error' ? 'bg-rose-500' : 'bg-emerald-500'
  );
  label.textContent = text;
}

async function pushToGoogleSheets() {
  const gasUrl = getActiveGasUrl();
  if (!gasUrl) return;
  updateSyncStatusUI('syncing', 'กำลังบันทึกขึ้น Google Sheets...');
  try {
    await fetch(gasUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'saveAll', payload: appData })
    });
    updateSyncStatusUI('ok', 'ซิงค์ Google Sheets แล้ว');
  } catch (err) {
    console.warn('Cloud push error:', err);
    updateSyncStatusUI('error', 'บันทึกในเครื่องแล้ว (ออฟไลน์)');
  }
}

async function pullFromGoogleSheets(silent = false) {
  const inputEl = document.getElementById('gasUrlInput');
  const gasUrl = (inputEl && inputEl.value.trim()) ? inputEl.value.trim() : getActiveGasUrl();
  if (!gasUrl) {
    if (!silent) alert('กรุณาวาง URL ของ Google Apps Script ก่อนครับ');
    return;
  }
  localStorage.setItem(GAS_URL_KEY, gasUrl);
  updateSyncStatusUI('syncing', 'กำลังดึงข้อมูลจาก Sheets...');
  try {
    const sep = gasUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${gasUrl}${sep}action=getAll&t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow'
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (parseErr) {
      throw new Error('ลิงก์ Web App ไม่ได้ส่งค่า JSON กลับมา (ตรวจสอบว่าตั้งค่า Who has access เป็น Anyone แล้วหรือยัง)');
    }

    if (json && json.payload && Array.isArray(json.payload.students)) {
      // ถ้ารายชื่อใน Google Sheets ยังเป็นข้อมูลตัวอย่าง 15 คนเก่า (รหัส 69601) ให้ใช้ข้อมูลจริง ม.4/6 (36 คน) จากไฟล์ PDF แทนทันที!
      const isOldSampleInSheet = json.payload.students.length === 15 && String(json.payload.students[0]?.id) === '69601';
      if (isOldSampleInSheet) {
        appData = JSON.parse(JSON.stringify(INITIAL_DATA));
        ensureUniqueStudentAnimals(appData.students);
        saveAppData(false);
        updateSyncStatusUI('ok', 'อัปเดตข้อมูล ม.4/6 (36 คน) เข้า Sheets แล้ว');
        if (!silent) alert('ตรวจพบว่าใน Google Sheets ยังเป็นข้อมูลตัวอย่าง 15 คนเดิม ระบบจึงอัปเดตข้อมูล ม.4/6 (36 คน ตามไฟล์ PDF) เข้าไปใน Sheets ให้เรียบร้อยแล้วครับ! 🌸');
        return;
      }

      // เก็บรักษาข้อมูลการเยี่ยมบ้าน พิกัดแผนที่ ชื่อเล่น และรูปสัตว์ประจำตัวที่เคยบันทึกไว้ในเครื่อง ไม่ให้ถูกล้างทับ!
      const localStudentsMap = {};
      (appData.students || []).forEach(s => {
        localStudentsMap[String(s.id)] = s;
      });

      let localHasNewerHomeVisit = false;
      const mergedStudents = json.payload.students.map(remoteStu => {
        const localStu = localStudentsMap[String(remoteStu.id)];
        if (!localStu) return remoteStu;

        const merged = { ...localStu, ...remoteStu };
        // ถ้าในเครื่องมีพิกัดบ้าน/สถานะเยี่ยมบ้าน แต่ข้อมูลที่ดึงมาจาก Sheet ไม่มี (เพราะ Code.gs เวอร์ชันเก่าไม่ได้ส่งกลับมา) ให้ใช้ข้อมูลในเครื่อง!
        if (!remoteStu.homeLocation && localStu.homeLocation) {
          merged.homeLocation = localStu.homeLocation;
          localHasNewerHomeVisit = true;
        }
        if (remoteStu.homeVisited === undefined && localStu.homeVisited !== undefined) {
          merged.homeVisited = localStu.homeVisited;
          localHasNewerHomeVisit = true;
        }
        if (!remoteStu.homeNote && localStu.homeNote) {
          merged.homeNote = localStu.homeNote;
          localHasNewerHomeVisit = true;
        }
        if (localStu.emoji) {
          merged.emoji = localStu.emoji;
        }
        return merged;
      });

      // เก็บรักษาค่า isAdvance ของงวดเก็บเงิน (เช่น ครั้งที่ 9-12 เป็นงวดจ่ายล่วงหน้า หรือเมื่อครูเปิดเริ่มคิดเงินครั้งที่ 9 แล้วก็ไม่ให้ถูกล้างตอนรีเฟรช)
      const localPeriodsMap = {};
      (appData.paymentPeriods || []).forEach(p => {
        localPeriodsMap[p.id] = p;
        localPeriodsMap[p.name] = p;
      });
      let localPeriodModeChanged = false;
      const mergedPeriods = (json.payload.paymentPeriods || appData.paymentPeriods || []).map((rp, idx) => {
        const lp = localPeriodsMap[rp.id] || localPeriodsMap[rp.name];
        let isAdv;
        if (lp && lp.isAdvance !== undefined) {
          isAdv = Boolean(lp.isAdvance);
          if (rp.isAdvance !== isAdv) localPeriodModeChanged = true;
        } else if (rp.isAdvance !== undefined) {
          isAdv = Boolean(rp.isAdvance);
        } else {
          isAdv = (idx >= 8);
        }
        return {
          ...rp,
          isAdvance: isAdv
        };
      });

      appData = {
        ...INITIAL_DATA,
        ...json.payload,
        students: mergedStudents,
        paymentPeriods: mergedPeriods,
        calendarEvents: (Array.isArray(json.payload.calendarEvents) && json.payload.calendarEvents.length > 0)
          ? json.payload.calendarEvents
          : (appData.calendarEvents || INITIAL_DATA.calendarEvents),
        classInfo: { ...INITIAL_DATA.classInfo, ...(appData.classInfo || {}), ...(json.payload.classInfo || {}) },
        images: { ...INITIAL_DATA.images, ...(appData.images || {}), ...(json.payload.images || {}) }
      };
      ensureUniqueStudentAnimals(appData.students);
      saveAppData(!(localHasNewerHomeVisit || localPeriodModeChanged));
      updateSyncStatusUI('ok', 'ซิงค์ข้อมูลเรียบร้อย');
      if (!silent) alert(`ดึงข้อมูลล่าสุดและผสานข้อมูลการเยี่ยมบ้านสำเร็จ! (นักเรียน ${appData.students.length} คน) 🌸`);
    } else {
      // ถ้าใน Google Sheets ยังว่างเปล่า ให้ส่งข้อมูลเริ่มต้นขึ้นไปสร้างตารางใน Sheets ให้เลย
      await pushToGoogleSheets();
      updateSyncStatusUI('ok', 'สร้างตารางเริ่มต้นใน Sheets แล้ว');
      if (!silent) alert('ใน Google Sheets ยังไม่มีข้อมูล ระบบจึงส่งตารางเริ่มต้นไปสร้างใน Sheets ให้เรียบร้อยแล้วครับ!');
    }
  } catch (err) {
    console.warn('Cloud pull error:', err);
    updateSyncStatusUI('error', 'ดึงข้อมูลไม่สำเร็จ');
    if (!silent) {
      alert('ดึงข้อมูลจาก Google Sheets ไม่สำเร็จ:\n' + (err.message || err));
    }
  }
}

// ==========================================================
// AUTHENTICATION (STUDENT ID vs TEACHER/TREASURER)
// ==========================================================
function switchLoginTab(mode) {
  const studentForm = document.getElementById('studentLoginForm');
  const adminForm = document.getElementById('adminLoginForm');
  const studentBtn = document.getElementById('tabStudentBtn');
  const adminBtn = document.getElementById('tabAdminBtn');
  const errBox = document.getElementById('loginErrorMsg');
  errBox.classList.add('hidden');

  if (mode === 'student') {
    studentForm.classList.remove('hidden');
    adminForm.classList.add('hidden');
    studentBtn.className = 'py-2.5 px-4 rounded-xl text-sm font-medium transition-all bg-white text-china-red shadow-sm font-heading';
    adminBtn.className = 'py-2.5 px-4 rounded-xl text-sm font-medium transition-all text-slate-500 hover:text-china-red font-heading';
  } else {
    studentForm.classList.add('hidden');
    adminForm.classList.remove('hidden');
    adminBtn.className = 'py-2.5 px-4 rounded-xl text-sm font-medium transition-all bg-white text-china-red shadow-sm font-heading';
    studentBtn.className = 'py-2.5 px-4 rounded-xl text-sm font-medium transition-all text-slate-500 hover:text-china-red font-heading';
  }
}

function fillDemoStudent(val) {
  document.getElementById('studentIdInput').value = val;
  document.getElementById('studentLoginForm').requestSubmit();
}

function fillDemoAdmin(val) {
  switchLoginTab('admin');
  document.getElementById('adminPassInput').value = val;
  document.getElementById('adminLoginForm').requestSubmit();
}

function showLoginError(msg) {
  const errBox = document.getElementById('loginErrorMsg');
  errBox.textContent = msg;
  errBox.classList.remove('hidden');
}

function handleStudentLogin(e) {
  e.preventDefault();
  const raw = document.getElementById('studentIdInput').value.trim();
  if (!raw) return;

  // Match by 5-digit student ID OR student number (เลขที่)
  const found = appData.students.find(
    s => String(s.id).toLowerCase() === raw.toLowerCase() || String(s.no) === raw
  );

  if (!found) {
    showLoginError(`ไม่พบรหัสประจำตัวหรือเลขที่ "${raw}" ในระบบห้องทับหก`);
    return;
  }

  currentUser = { role: 'student', student: found };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
  document.getElementById('loginScreen').classList.add('hidden');
  renderAll();
}

function handleAdminLogin(e) {
  e.preventDefault();
  const pass = document.getElementById('adminPassInput').value.trim();
  const validPass = appData.adminPass || '2569';
  if (pass !== validPass) {
    showLoginError('รหัสผ่านครูที่ปรึกษาไม่ถูกต้อง');
    return;
  }

  currentUser = { role: 'admin', student: null };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
  document.getElementById('loginScreen').classList.add('hidden');
  renderAll();
}

function openQuickAdminPrompt() {
  if (currentUser && currentUser.role === 'admin') {
    // Switch back to student preview mode
    currentUser = { role: 'student', student: appData.students[0] || null };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    renderAll();
    return;
  }
  const pass = prompt('🏮 กรอกรหัสผ่านครูที่ปรึกษา เพื่อเปิดโหมดแก้ไขข้อมูล:');
  if (pass === null) return;
  if (pass.trim() === (appData.adminPass || '2569')) {
    currentUser = { role: 'admin', student: null };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    renderAll();
  } else {
    alert('รหัสผ่านไม่ถูกต้องครับ');
  }
}

function logoutUser() {
  sessionStorage.removeItem(SESSION_KEY);
  currentUser = null;
  document.getElementById('studentIdInput').value = '';
  document.getElementById('adminPassInput').value = '';
  document.getElementById('loginErrorMsg').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
}

// ==========================================================
// NAVIGATION TABS
// ==========================================================
function switchTab(tabName) {
  document.querySelectorAll('.tab-section').forEach(sec => sec.classList.add('hidden'));
  const target = document.getElementById(`tab-${tabName}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-tab').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('.mob-nav-btn').forEach(btn => {
    if (btn.getAttribute('data-mob-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================
// MASTER RENDER FUNCTION & ROLE PERMISSIONS
// ==========================================================
function isTreasurerUser() {
  if (!currentUser || currentUser.role !== 'student' || !currentUser.student) return false;
  const treasurerId = appData.treasurerStudentId || '69603';
  return String(currentUser.student.id) === String(treasurerId);
}

function canManageMoney() {
  // เหรัญญิก (ล็อกอินด้วยรหัสนักเรียนของตัวเอง) หรือ ครูที่ปรึกษา สามารถติ๊กเงินห้องได้
  return isTreasurerUser() || currentUser?.role === 'admin';
}

function renderAll() {
  const isAdmin = currentUser?.role === 'admin';
  const isTreasurer = isTreasurerUser();
  const moneyAllowed = canManageMoney();

  // Toggle admin-only controls (เฉพาะครูที่ปรึกษา)
  document.querySelectorAll('.admin-only').forEach(el => {
    if (isAdmin) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });

  // Toggle money-manager-only controls (เหรัญญิก หรือ ครู)
  document.querySelectorAll('.money-manager-only').forEach(el => {
    if (moneyAllowed) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });

  // Admin top banner
  const adminBanner = document.getElementById('adminBanner');
  if (adminBanner) {
    if (isAdmin) adminBanner.classList.remove('hidden');
    else adminBanner.classList.add('hidden');
  }

  // Treasurer top banner (แสดงเมื่อเหรัญญิกล็อกอินด้วยรหัสนักเรียนตัวเอง)
  const treasurerBanner = document.getElementById('treasurerBanner');
  if (treasurerBanner) {
    if (isTreasurer && !isAdmin) {
      const stu = currentUser.student;
      const titleEl = document.getElementById('treasurerBannerTitle');
      if (titleEl) {
        titleEl.textContent = `สวัสดีเหรัญญิก ${stu.nickname}! (รหัส ${stu.id}) คุณได้รับสิทธิ์ติ๊กเช็คเงินห้องและบันทึกรายรับ-รายจ่ายได้ทันที`;
      }
      treasurerBanner.classList.remove('hidden');
    } else {
      treasurerBanner.classList.add('hidden');
    }
  }

  // Top Header User Badge
  const quickAdminBtn = document.getElementById('quickAdminBtn');
  if (isAdmin) {
    document.getElementById('userAvatarEmoji').textContent = '🏮';
    document.getElementById('userNameDisplay').textContent = 'ครูที่ปรึกษา';
    document.getElementById('userRoleDisplay').textContent = 'โหมดครู (แก้ไขได้ทั้งหมด)';
    if (quickAdminBtn) {
      quickAdminBtn.innerHTML = `<i data-lucide="eye" class="w-4 h-4"></i><span class="hidden md:inline">สลับมุมมองนักเรียน</span>`;
    }
  } else if (currentUser?.student) {
    // Refresh student object from latest appData
    const stu = appData.students.find(s => s.id === currentUser.student.id) || currentUser.student;
    currentUser.student = stu;
    document.getElementById('userAvatarEmoji').textContent = isTreasurer ? '🧧' : (stu.emoji || '🎒');
    document.getElementById('userNameDisplay').textContent = `${stu.name} (${stu.nickname})`;
    document.getElementById('userRoleDisplay').textContent = isTreasurer
      ? `เลขที่ ${stu.no} • เหรัญญิกห้อง (ติ๊กเงินห้องได้)`
      : `เลขที่ ${stu.no} • รหัส ${stu.id}`;
    if (quickAdminBtn) {
      quickAdminBtn.innerHTML = `<i data-lucide="lock" class="w-4 h-4"></i><span class="hidden md:inline">โหมดครู</span>`;
    }
  }

  renderDashboard();
  renderMoneySection();
  renderHomeVisitSection();
  renderDutyAndTimetable();
  renderDirectory();
  renderLuckyHistoryUI();

  if (window.lucide) {
    lucide.createIcons();
  }
}

// ==========================================================
// SSO LINK TO MORAL PROJECT (ไม่ต้อง Login ซ้ำ)
// ==========================================================
function openMoralProjectSSO(event) {
  if (event) event.preventDefault();
  const baseUrl = appData.classInfo?.moralProjectUrl || 'https://ptnk-school.github.io/dd-moral/';
  let targetUrl = baseUrl;

  if (currentUser?.role === 'admin') {
    const params = new URLSearchParams({
      role: 'teacher',
      autoLogin: '1',
      class: '4/6'
    });
    targetUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${params.toString()}`;
  } else if (currentUser?.student) {
    const stu = currentUser.student;
    // Copy student ID to clipboard automatically as a fallback in case external domain requires paste
    try { navigator.clipboard.writeText(String(stu.id)); } catch (e) {}
    const params = new URLSearchParams({
      studentId: stu.id,
      id: stu.id,
      code: stu.id,
      no: stu.no,
      name: stu.name,
      autoLogin: '1'
    });
    targetUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${params.toString()}`;
  }

  const win = window.open(targetUrl, '_blank');
  if (win && currentUser) {
    // Send postMessage token after load in case the Moral Project web app listens for SSO message
    setTimeout(() => {
      try {
        win.postMessage({
          type: 'HOMEROOM_SSO_LOGIN',
          role: currentUser.role,
          studentId: currentUser.student?.id || null,
          studentNo: currentUser.student?.no || null,
          studentName: currentUser.student?.name || 'ครูที่ปรึกษา'
        }, '*');
      } catch (e) {}
    }, 800);
  }
}

function jumpSearchStudent(query) {
  const q = (query || '').trim();
  if (!q) return;
  const searchInput = document.getElementById('studentSearchInput');
  if (searchInput) searchInput.value = q;
  switchTab('directory');
  renderDirectory();
}

// ==========================================================
// 1. RENDER DASHBOARD (MedBoard Layout + Chinese Theme + Calendar)
// ==========================================================
function renderDashboard() {
  const isAdmin = currentUser?.role === 'admin';
  const stu = currentUser?.student;

  // Format Today's Date
  const todayEl = document.getElementById('dashTodayDateText');
  if (todayEl) {
    const dateStr = new Date().toLocaleDateString('th-TH', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    todayEl.textContent = `${dateStr} • ชั้นมัธยมศึกษาปีที่ 4/6`;
  }

  // Calculate Money & Home Visit Summary
  const moneyStats = calculateMoneySummary();
  const totalStudents = appData.students.length || 1;
  const visitedCount = appData.students.filter(s => s.homeVisited).length;
  const visitPct = Math.round((visitedCount / totalStudents) * 100);

  // Expected total fund from active periods
  const activePeriods = (appData.paymentPeriods || []).filter((p, idx) => !((p.isAdvance !== undefined) ? Boolean(p.isAdvance) : (idx >= 8)));
  const expectedPerStu = activePeriods.reduce((sum, p) => sum + Number(p.amountPerStudent || 0), 0);
  const totalExpectedFund = Math.max(1, expectedPerStu * totalStudents);
  const moneyPct = Math.min(100, Math.round((moneyStats.collectedFromPeriods / totalExpectedFund) * 100));

  // Update Hero Right Card (Latest results bars)
  const pMoneyText = document.getElementById('dashParamMoneyText');
  const pMoneyBar = document.getElementById('dashParamMoneyBar');
  if (pMoneyText) pMoneyText.textContent = `฿${moneyStats.collectedFromPeriods.toLocaleString()} (${moneyPct}%)`;
  if (pMoneyBar) pMoneyBar.style.width = `${moneyPct}%`;

  const pVisitText = document.getElementById('dashParamVisitText');
  const pVisitBar = document.getElementById('dashParamVisitBar');
  if (pVisitText) pVisitText.textContent = `${visitedCount}/${appData.students.length} คน (${visitPct}%)`;
  if (pVisitBar) pVisitBar.style.width = `${visitPct}%`;

  const eventsList = appData.calendarEvents || [];
  const pEventText = document.getElementById('dashParamEventText');
  if (pEventText) pEventText.textContent = `${eventsList.length} กิจกรรม`;

  // Personal Welcome & Right Sidebar Profile Card
  const fullNameEl = document.getElementById('dashProfileFullName');
  const myVisitEl = document.getElementById('myHomeVisitStatusText');

  if (stu && !isAdmin) {
    document.getElementById('dashProfileEmoji').textContent = stu.emoji || '🐼';
    if (fullNameEl) fullNameEl.textContent = stu.name;
    document.getElementById('dashStudentNoBadge').textContent = `${stu.no}`;
    document.getElementById('dashStudentIdBadge').textContent = `${stu.id}`;
    document.getElementById('dashStudentPositionBadge').textContent = stu.role || 'สมาชิกห้อง ม.4/6';
    document.getElementById('dashWelcomeName').textContent = `สวัสดี, ${stu.nickname || stu.name}! 🌸`;
    document.getElementById('dashPersonalSummary').textContent = `เข้าสู่ระบบด้วยรหัส ${stu.id} แล้ว คลิกปุ่มด้านล่างเพื่อเข้าเว็บโครงงานคุณธรรมได้ทันทีโดยไม่ต้องล็อกอินซ้ำ`;

    // Check personal unpaid periods (only non-advance active periods)
    const unpaidPeriods = appData.paymentPeriods.filter((p, idx) => {
      const isAdv = (p.isAdvance !== undefined) ? Boolean(p.isAdvance) : (idx >= 8);
      return !isAdv && !p.paidStudentIds.includes(stu.id);
    });
    const moneyStatusEl = document.getElementById('myMoneyStatusText');
    if (unpaidPeriods.length === 0) {
      moneyStatusEl.textContent = 'จ่ายครบทุกงวด ✨';
      moneyStatusEl.className = 'font-heading font-bold text-emerald-600';
    } else {
      const owed = unpaidPeriods.reduce((sum, p) => sum + Number(p.amountPerStudent || 0), 0);
      moneyStatusEl.textContent = `ค้าง ${unpaidPeriods.length} งวด (฿${owed})`;
      moneyStatusEl.className = 'font-heading font-bold text-china-red';
    }

    if (myVisitEl) {
      if (stu.homeVisited) {
        myVisitEl.textContent = 'เยี่ยมบ้านแล้ว ✓';
        myVisitEl.className = 'font-heading font-bold text-emerald-600';
      } else {
        myVisitEl.textContent = 'รอเยี่ยมบ้าน ⏳';
        myVisitEl.className = 'font-heading font-bold text-amber-700';
      }
    }

    document.getElementById('myDutyDayText').textContent = (stu.dutyDay || 'วันจันทร์').replace('วัน', '');
  } else {
    // Admin overview card
    document.getElementById('dashProfileEmoji').textContent = '🏮';
    if (fullNameEl) fullNameEl.textContent = 'ครูที่ปรึกษา ม.4/6';
    document.getElementById('dashStudentNoBadge').textContent = '36 คน';
    document.getElementById('dashStudentIdBadge').textContent = 'ADMIN';
    document.getElementById('dashStudentPositionBadge').textContent = 'โหมดครูที่ปรึกษา (แก้ไขได้ทั้งหมด)';
    document.getElementById('dashWelcomeName').textContent = 'สวัสดี, คุณครูที่ปรึกษา! 🌸';
    document.getElementById('dashPersonalSummary').textContent = 'จัดการปฏิทินกิจกรรม ประกาศห้อง เช็คเงินห้อง และบันทึกพิกัดการเยี่ยมบ้านนักเรียนได้จากแดชบอร์ดนี้เลย';

    document.getElementById('myMoneyStatusText').textContent = `คงเหลือ ฿${moneyStats.netBalance.toLocaleString()}`;
    if (myVisitEl) {
      myVisitEl.textContent = `เยี่ยมแล้ว ${visitedCount}/${appData.students.length} คน`;
      myVisitEl.className = 'font-heading font-bold text-emerald-600';
    }
    document.getElementById('myDutyDayText').textContent = 'ทุกวัน';
  }

  // 3 Middle Action Pills
  document.getElementById('kpiTotalStudents').textContent = `สมาชิก ${appData.students.length} คน`;
  document.getElementById('kpiFundBalance').textContent = `คงเหลือ ฿${moneyStats.netBalance.toLocaleString()}`;
  document.getElementById('kpiFundSubtext').textContent = `รับ ฿${moneyStats.totalIncome.toLocaleString()} | จ่าย ฿${moneyStats.totalExpense.toLocaleString()}`;
  const kpiVisitEl = document.getElementById('kpiHomeVisitStatus');
  if (kpiVisitEl) kpiVisitEl.textContent = `เยี่ยมแล้ว ${visitedCount}/${appData.students.length} คน`;

  document.getElementById('infoTeacherName').textContent = appData.classInfo.teacherName;
  document.getElementById('infoClassMotto').textContent = appData.classInfo.classMotto;

  // Render Monthly Activity Calendar & Event List
  renderDashboardCalendar();

  // Render Announcements in Right Sidebar (Pinned first, with Pin & Edit options)
  const annContainer = document.getElementById('announcementList');
  if (appData.announcements.length === 0) {
    annContainer.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 bg-rose-50/40 rounded-2xl border border-dashed border-rose-200">ยังไม่มีประกาศข่าวสาร</div>`;
  } else {
    const sortedAnnouncements = [...appData.announcements].sort((a, b) => {
      if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
        return a.isPinned ? -1 : 1;
      }
      return 0;
    });

    annContainer.innerHTML = sortedAnnouncements.map(ann => {
      const pinned = Boolean(ann.isPinned);
      return `
        <div class="p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-2.5 ${
          pinned
            ? 'bg-gradient-to-r from-amber-50/90 to-rose-50/90 border-amber-300 shadow-sm'
            : 'bg-rose-50/40 border-rose-100 hover:border-rose-200'
        }">
          <div class="w-8 h-8 rounded-xl bg-white border ${pinned ? 'border-amber-300 text-amber-600' : 'border-rose-100 text-china-red'} flex items-center justify-center shrink-0 text-sm shadow-sm">
            ${pinned ? '📌' : '🎐'}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5">
              ${pinned ? `<span class="px-2 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">📌 ปักหมุด</span>` : ''}
              <span class="px-2 py-0.2 rounded-full bg-china-red text-white text-[10px] font-medium">${ann.tag || 'ประกาศ'}</span>
              <span class="text-[11px] text-slate-400">${ann.date}</span>
            </div>
            <h4 class="font-heading font-bold text-xs sm:text-sm text-slate-800 mt-1 leading-snug">${ann.title}</h4>
            <p class="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">${ann.content}</p>
          </div>
          ${isAdmin ? `
            <div class="flex flex-col sm:flex-row items-center gap-0.5 shrink-0">
              <button onclick="togglePinAnnouncement('${ann.id}')" class="p-1.5 rounded-lg ${pinned ? 'text-amber-600 bg-amber-100/70' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}" title="${pinned ? 'เลิกปักหมุด' : 'ปักหมุดประกาศสำคัญ'}">
                <i data-lucide="pin" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="openEditAnnouncementModal('${ann.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-china-red hover:bg-rose-100" title="แก้ไขข้อความประกาศ">
                <i data-lucide="pen-line" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="deleteAnnouncement('${ann.id}')" class="p-1.5 rounded-lg text-rose-400 hover:text-china-red hover:bg-rose-100" title="ลบประกาศ">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }
}

// ==========================================================
// DASHBOARD ACTIVITY CALENDAR (มีสีวันหยุด & แก้ไขข้อความได้)
// ==========================================================
function renderDashboardCalendar() {
  const titleEl = document.getElementById('calendarMonthTitle');
  const gridEl = document.getElementById('calendarDaysGrid');
  const listEl = document.getElementById('calendarEventsList');
  if (!titleEl || !gridEl || !listEl) return;

  const isAdmin = currentUser?.role === 'admin';
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  titleEl.textContent = `${thaiMonths[calendarViewMonth]} ${calendarViewYear + 543}`;

  if (!Array.isArray(appData.calendarEvents)) {
    appData.calendarEvents = INITIAL_DATA.calendarEvents || [];
  }

  // Build map of date -> events
  const eventMap = {};
  appData.calendarEvents.forEach(ev => {
    if (!ev.date) return;
    if (!eventMap[ev.date]) eventMap[ev.date] = [];
    eventMap[ev.date].push(ev);
  });

  // First day of month (Monday-first index: 0=Mon ... 5=Sat, 6=Sun)
  const firstDate = new Date(calendarViewYear, calendarViewMonth, 1);
  const startDayMonFirst = (firstDate.getDay() + 6) % 7;
  const daysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(calendarViewYear, calendarViewMonth, 0).getDate();

  const todayIso = new Date().toISOString().slice(0, 10);
  let cellsHtml = '';

  // Leading days from previous month
  for (let i = startDayMonFirst - 1; i >= 0; i--) {
    cellsHtml += `<div class="py-2 text-slate-300 select-none">${prevMonthDays - i}</div>`;
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(calendarViewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const iso = `${calendarViewYear}-${mm}-${dd}`;
    const dayEvents = eventMap[iso] || [];
    const hasEvents = dayEvents.length > 0;
    const hasHolidayEvent = dayEvents.some(ev => Boolean(ev.isHoliday) || ev.category === 'วันหยุด');
    const colIndex = (startDayMonFirst + d - 1) % 7; // 5 = Sat, 6 = Sun
    const isWeekend = colIndex === 5 || colIndex === 6;
    const isSelected = selectedCalendarDate === iso;
    const isToday = todayIso === iso;

    let dayStyle = 'text-slate-700 hover:bg-rose-50';
    if (isSelected) {
      dayStyle = 'bg-china-red text-white font-bold shadow-md scale-105';
    } else if (hasHolidayEvent) {
      dayStyle = 'bg-rose-100/90 text-china-red font-bold border border-rose-300 hover:bg-rose-200/80';
    } else if (isToday) {
      dayStyle = 'bg-amber-100 text-china-darkred font-bold ring-2 ring-china-red/50';
    } else if (hasEvents) {
      dayStyle = 'bg-amber-50 text-china-darkred font-bold border border-amber-200 hover:bg-amber-100';
    } else if (isWeekend) {
      dayStyle = 'bg-rose-50/50 text-rose-500 font-semibold hover:bg-rose-100/70';
    }

    cellsHtml += `
      <button type="button" onclick="selectCalendarDate('${iso}')"
        title="${hasEvents ? dayEvents.map(e => e.title).join(', ') : (isWeekend ? 'วันหยุดสุดสัปดาห์' : '')}"
        class="relative py-2 sm:py-2.5 rounded-xl text-xs transition-all flex flex-col items-center justify-center ${dayStyle}">
        <span>${d}</span>
        ${hasEvents ? `
          <span class="w-1.5 h-1.5 rounded-full mt-0.5 ${
            isSelected ? 'bg-white' : (hasHolidayEvent ? 'bg-china-red' : 'bg-amber-500')
          }"></span>
        ` : ''}
      </button>
    `;
  }

  gridEl.innerHTML = cellsHtml;

  // Filter events for right-side appointment card
  const monthPrefix = `${calendarViewYear}-${String(calendarViewMonth + 1).padStart(2, '0')}`;
  let shownEvents = selectedCalendarDate
    ? (eventMap[selectedCalendarDate] || [])
    : appData.calendarEvents.filter(ev => (ev.date || '').startsWith(monthPrefix));

  if (shownEvents.length === 0 && !selectedCalendarDate) {
    shownEvents = [...appData.calendarEvents];
  }
  shownEvents.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  if (shownEvents.length === 0) {
    listEl.innerHTML = `
      <div class="p-4 rounded-2xl bg-rose-50/40 border border-dashed border-rose-200 text-center text-xs text-slate-400">
        ไม่มีนัดหมายในวันที่เลือก ${selectedCalendarDate ? `<button onclick="selectCalendarDate(null)" class="block mx-auto mt-1 text-china-red underline">ดูกิจกรรมทั้งหมดในเดือนนี้</button>` : ''}
      </div>
    `;
  } else {
    listEl.innerHTML = shownEvents.map(ev => {
      const isHol = Boolean(ev.isHoliday) || ev.category === 'วันหยุด';
      return `
        <div class="p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-2 ${
          isHol
            ? 'bg-rose-50/90 border-rose-200'
            : 'bg-amber-50/40 border-rose-100 hover:border-rose-200'
        }">
          <div class="space-y-0.5 min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="px-2 py-0.5 rounded-lg bg-white ${isHol ? 'text-china-red border-rose-200' : 'text-amber-800 border-amber-200'} font-heading font-bold text-[11px] border">
                📅 ${ev.date}
              </span>
              ${isHol ? `<span class="px-2 py-0.5 rounded-full bg-china-red text-white text-[10px] font-bold">🏖️ วันหยุด</span>` : ''}
              ${ev.time ? `<span class="text-[11px] text-amber-700 font-medium">⏰ ${ev.time}</span>` : ''}
            </div>
            <h4 class="font-heading font-bold text-xs sm:text-sm ${isHol ? 'text-china-darkred' : 'text-slate-800'} pt-0.5 break-words">${ev.title}</h4>
            ${ev.note ? `<p class="text-[11px] text-slate-500 break-words">${ev.note}</p>` : ''}
          </div>
          ${isAdmin ? `
            <div class="flex items-center gap-0.5 shrink-0">
              <button onclick="openEditCalendarEventModal('${ev.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-china-red hover:bg-rose-100" title="แก้ไขข้อความกิจกรรม">
                <i data-lucide="pen-line" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="deleteCalendarEvent('${ev.id}')" class="p-1.5 rounded-lg text-rose-400 hover:text-china-red hover:bg-rose-100" title="ลบกิจกรรม">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }
}

function changeCalendarMonth(delta) {
  calendarViewMonth += delta;
  if (calendarViewMonth > 11) {
    calendarViewMonth = 0;
    calendarViewYear++;
  } else if (calendarViewMonth < 0) {
    calendarViewMonth = 11;
    calendarViewYear--;
  }
  selectedCalendarDate = null;
  renderDashboardCalendar();
  if (window.lucide) lucide.createIcons();
}

function selectCalendarDate(isoDate) {
  selectedCalendarDate = (selectedCalendarDate === isoDate) ? null : isoDate;
  renderDashboardCalendar();
  if (window.lucide) lucide.createIcons();
}

function openAddCalendarEventModal() {
  const defaultDate = selectedCalendarDate || new Date().toISOString().slice(0, 10);
  openCustomModal('📅 เพิ่มกิจกรรม / วันหยุดในปฏิทินห้องเรียน', `
    <form onsubmit="saveCalendarEvent(event)" class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">วันที่ *</label>
          <input type="date" id="evtDateInput" required value="${defaultDate}" class="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs outline-none">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">เวลา (ถ้ามี)</label>
          <input type="text" id="evtTimeInput" placeholder="เช่น 08:30 - 09:30 หรือ ตลอดวัน" class="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs outline-none">
        </div>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">ชื่อกิจกรรม / วันหยุด *</label>
        <input type="text" id="evtTitleInput" required placeholder="เช่น วันหยุดชดเชย / ส่งเล่มโครงงานคุณธรรม" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">รายละเอียดเพิ่มเติม</label>
        <input type="text" id="evtNoteInput" placeholder="เช่น โรงเรียนหยุดทำการเรียนการสอน / เตรียมอุปกรณ์" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <label class="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-china-darkred font-medium cursor-pointer">
        <input type="checkbox" id="evtIsHolidayInput" class="w-4 h-4 accent-china-red rounded">
        <span>🏖️ กำหนดให้วันนี้แสดงสีเป็น "วันหยุด" บนปฏิทิน</span>
      </label>
      <button type="submit" class="w-full py-2.5 rounded-xl bg-china-red text-white font-heading font-bold text-xs shadow">บันทึกกิจกรรมลงปฏิทิน</button>
    </form>
  `);
}

function saveCalendarEvent(e) {
  e.preventDefault();
  if (!Array.isArray(appData.calendarEvents)) appData.calendarEvents = [];
  const dateVal = document.getElementById('evtDateInput').value;
  const isHol = document.getElementById('evtIsHolidayInput')?.checked || false;
  appData.calendarEvents.push({
    id: 'evt-' + Date.now(),
    date: dateVal,
    time: document.getElementById('evtTimeInput').value.trim(),
    title: document.getElementById('evtTitleInput').value.trim(),
    note: document.getElementById('evtNoteInput').value.trim(),
    isHoliday: isHol,
    category: isHol ? 'วันหยุด' : 'กิจกรรมห้อง'
  });
  if (dateVal) {
    const parts = dateVal.split('-');
    if (parts.length === 3) {
      calendarViewYear = Number(parts[0]);
      calendarViewMonth = Number(parts[1]) - 1;
    }
  }
  saveAppData();
  closeCustomModal();
}

function openEditCalendarEventModal(eventId) {
  const ev = (appData.calendarEvents || []).find(item => item.id === eventId);
  if (!ev) return;
  const isHol = Boolean(ev.isHoliday) || ev.category === 'วันหยุด';

  openCustomModal('✏️ แก้ไขข้อความกิจกรรม / วันหยุดในปฏิทิน', `
    <form onsubmit="saveEditedCalendarEvent(event, '${ev.id}')" class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">วันที่ *</label>
          <input type="date" id="editEvtDateInput" required value="${ev.date || ''}" class="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs outline-none">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">เวลา (ถ้ามี)</label>
          <input type="text" id="editEvtTimeInput" value="${ev.time || ''}" placeholder="เช่น 08:30 - 09:30" class="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs outline-none">
        </div>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">ชื่อกิจกรรม / วันหยุด *</label>
        <input type="text" id="editEvtTitleInput" required value="${ev.title || ''}" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">รายละเอียดเพิ่มเติม</label>
        <input type="text" id="editEvtNoteInput" value="${ev.note || ''}" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <label class="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-china-darkred font-medium cursor-pointer">
        <input type="checkbox" id="editEvtIsHolidayInput" ${isHol ? 'checked' : ''} class="w-4 h-4 accent-china-red rounded">
        <span>🏖️ กำหนดให้วันนี้แสดงสีเป็น "วันหยุด" บนปฏิทิน</span>
      </label>
      <button type="submit" class="w-full py-2.5 rounded-xl bg-china-red text-white font-heading font-bold text-xs shadow">บันทึกการแก้ไข</button>
    </form>
  `);
}

function saveEditedCalendarEvent(e, eventId) {
  e.preventDefault();
  const ev = (appData.calendarEvents || []).find(item => item.id === eventId);
  if (!ev) return;
  const isHol = document.getElementById('editEvtIsHolidayInput')?.checked || false;
  ev.date = document.getElementById('editEvtDateInput').value;
  ev.time = document.getElementById('editEvtTimeInput').value.trim();
  ev.title = document.getElementById('editEvtTitleInput').value.trim();
  ev.note = document.getElementById('editEvtNoteInput').value.trim();
  ev.isHoliday = isHol;
  ev.category = isHol ? 'วันหยุด' : 'กิจกรรมห้อง';
  saveAppData();
  closeCustomModal();
}

function deleteCalendarEvent(eventId) {
  if (!confirm('ต้องการลบกิจกรรมนี้ออกจากปฏิทินใช่หรือไม่?')) return;
  appData.calendarEvents = (appData.calendarEvents || []).filter(ev => ev.id !== eventId);
  saveAppData();
}

// ==========================================================
// 7. HOME VISIT TRACKER & GOOGLE MAPS LINK (การเยี่ยมบ้านนักเรียน)
// ==========================================================
function buildGoogleMapsUrl(locationText) {
  const raw = (locationText || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(raw)}`;
}

function renderHomeVisitSection() {
  const grid = document.getElementById('homeVisitGrid');
  if (!grid) return;

  const isAdmin = currentUser?.role === 'admin';
  const myId = currentUser?.student?.id;
  const total = appData.students.length;
  const visitedCount = appData.students.filter(s => Boolean(s.homeVisited)).length;
  const pendingCount = total - visitedCount;
  const mappedCount = appData.students.filter(s => Boolean((s.homeLocation || '').trim())).length;
  const pct = total > 0 ? Math.round((visitedCount / total) * 100) : 0;

  const doneEl = document.getElementById('visitDoneCount');
  const pctEl = document.getElementById('visitDonePct');
  const pendEl = document.getElementById('visitPendingCount');
  const mapEl = document.getElementById('visitMappedCount');
  if (doneEl) doneEl.textContent = `${visitedCount} คน`;
  if (pctEl) pctEl.textContent = `คิดเป็น ${pct}% ของทั้งห้อง (${total} คน)`;
  if (pendEl) pendEl.textContent = `${pendingCount} คน`;
  if (mapEl) mapEl.textContent = `${mappedCount} หลัง`;

  const q = (document.getElementById('homeVisitSearchInput')?.value || '').trim().toLowerCase();

  const filtered = appData.students.filter(s => {
    const visited = Boolean(s.homeVisited);
    if (homeVisitFilter === 'visited' && !visited) return false;
    if (homeVisitFilter === 'unvisited' && visited) return false;
    if (!q) return true;
    return (
      String(s.no).includes(q) ||
      String(s.id).toLowerCase().includes(q) ||
      (s.name || '').toLowerCase().includes(q) ||
      (s.nickname || '').toLowerCase().includes(q) ||
      (s.homeLocation || '').toLowerCase().includes(q)
    );
  });

  grid.innerHTML = filtered.map(stu => {
    const visited = Boolean(stu.homeVisited);
    const loc = (stu.homeLocation || '').trim();
    const mapUrl = buildGoogleMapsUrl(loc);
    const isMe = myId === stu.id;

    return `
      <div class="p-4 rounded-3xl bg-white border-2 transition-all flex flex-col justify-between gap-3 ${
        visited ? 'border-emerald-200 bg-emerald-50/20' : 'border-rose-100'
      } ${isMe ? 'ring-2 ring-china-red' : ''}">
        
        <!-- Top Student Info & Visit Status Badge -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-2xl shrink-0">
              ${stu.emoji || '🐼'}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="px-2 py-0.5 rounded-full bg-china-red text-white text-[10px] font-bold">เลขที่ ${stu.no}</span>
                <span class="text-[11px] text-slate-400">รหัส ${stu.id}</span>
              </div>
              <h4 class="font-heading font-bold text-sm text-slate-800 truncate mt-0.5">${stu.name}</h4>
            </div>
          </div>

          <span class="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-heading font-bold ${
            visited
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-rose-100 text-china-red border border-rose-200'
          }">
            ${visited ? '✓ เยี่ยมบ้านแล้ว' : '⏳ ยังไม่ได้เยี่ยม'}
          </span>
        </div>

        <!-- Location & Google Maps Direct Link -->
        <div class="p-3 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-2 text-xs">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-[11px] text-slate-400 font-medium">📍 ตำแหน่งที่ตั้ง / ที่อยู่บ้านนักเรียน:</p>
              <p class="text-slate-700 font-medium break-words mt-0.5">${loc ? loc : 'ยังไม่ได้ระบุตำแหน่งที่ตั้งบ้าน'}</p>
              ${stu.homeNote ? `<p class="text-[11px] text-slate-500 mt-0.5">📝 ${stu.homeNote}</p>` : ''}
            </div>
            ${isAdmin ? `
              <button onclick="openEditHomeLocationModal('${stu.id}')" class="p-1.5 rounded-xl bg-white hover:bg-rose-100 text-china-red border border-rose-200 shrink-0" title="เพิ่ม/แก้ไขพิกัดบ้าน">
                <i data-lucide="pen-line" class="w-3.5 h-3.5"></i>
              </button>
            ` : ''}
          </div>

          <div class="flex flex-wrap items-center gap-2 pt-1">
            ${mapUrl ? `
              <a href="${mapUrl}" target="_blank" rel="noopener noreferrer" 
                class="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-china-red to-china-pink text-white font-heading font-bold text-xs text-center shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-1.5">
                <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
                <span>นำทางด้วย Google Maps</span>
                <i data-lucide="external-link" class="w-3 h-3"></i>
              </a>
            ` : (isAdmin ? `
              <button onclick="openEditHomeLocationModal('${stu.id}')" class="w-full py-2 px-3 rounded-xl bg-white hover:bg-rose-100 text-china-red border border-dashed border-rose-300 font-medium text-xs flex items-center justify-center gap-1">
                <i data-lucide="map-pin-plus" class="w-3.5 h-3.5"></i>
                <span>+ เพิ่มที่อยู่ / พิกัด Google Maps</span>
              </button>
            ` : '')}
          </div>
        </div>

        <!-- Teacher Action Buttons: เยี่ยมบ้านแล้ว / ยังไม่ได้เยี่ยมบ้าน -->
        ${isAdmin ? `
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onclick="setStudentHomeVisitStatus('${stu.id}', true)"
              class="py-2 px-2.5 rounded-xl text-xs font-heading font-bold transition-all flex items-center justify-center gap-1 ${
                visited
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }">
              <span>✓ เยี่ยมบ้านแล้ว</span>
            </button>
            <button type="button" onclick="setStudentHomeVisitStatus('${stu.id}', false)"
              class="py-2 px-2.5 rounded-xl text-xs font-heading font-bold transition-all flex items-center justify-center gap-1 ${
                !visited
                  ? 'bg-china-red text-white shadow-sm'
                  : 'bg-rose-50 text-china-darkred hover:bg-rose-100 border border-rose-200'
              }">
              <span>⏳ ยังไม่ได้เยี่ยม</span>
            </button>
          </div>
        ` : ''}

      </div>
    `;
  }).join('');
}

function setHomeVisitFilter(filter) {
  homeVisitFilter = filter;
  ['all', 'visited', 'unvisited'].forEach(f => {
    const btn = document.getElementById(`visitFilter-${f}`);
    if (btn) {
      btn.className = f === filter
        ? 'px-3 py-1.5 rounded-lg bg-china-red text-white font-medium'
        : 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-china-red font-medium';
    }
  });
  renderHomeVisitSection();
  if (window.lucide) lucide.createIcons();
}

function setStudentHomeVisitStatus(studentId, isVisited) {
  if (currentUser?.role !== 'admin') return;
  const stu = appData.students.find(s => String(s.id) === String(studentId));
  if (!stu) return;
  stu.homeVisited = Boolean(isVisited);
  saveAppData();
}

function openEditHomeLocationModal(studentId) {
  const stu = appData.students.find(s => String(s.id) === String(studentId));
  if (!stu) return;

  openCustomModal(`🏡 ตำแหน่งบ้านของ เลขที่ ${stu.no} ${stu.name}`, `
    <form onsubmit="saveStudentHomeLocation(event, '${stu.id}')" class="space-y-3">
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">
          ที่อยู่ / พิกัด GPS หรือวางลิงก์ Google Maps *
        </label>
        <input type="text" id="homeLocInput" value="${stu.homeLocation || ''}" 
          placeholder="เช่น บ้านเลขที่ 123 ต.ในเมือง หรือวางลิงก์ https://maps.app.goo.gl/..." 
          class="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-xs outline-none">
        <p class="text-[11px] text-slate-400 mt-1">
          💡 สามารถพิมพ์เป็นชื่อหมู่บ้าน/ที่อยู่ พิกัดละติจูด,ลองจิจูด หรือวางลิงก์จากแอป Google Maps ได้เลย ระบบจะสร้างปุ่มกดนำทางให้อัตโนมัติ
        </p>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">หมายเหตุการเยี่ยมบ้าน / เบอร์ติดต่อผู้ปกครอง</label>
        <input type="text" id="homeNoteInput" value="${stu.homeNote || ''}" placeholder="เช่น โทรนัดผู้ปกครองล่วงหน้า..." class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">สถานะการเยี่ยมบ้าน</label>
        <select id="homeStatusSelect" class="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs outline-none bg-white">
          <option value="false" ${!stu.homeVisited ? 'selected' : ''}>⏳ ยังไม่ได้เยี่ยมบ้าน</option>
          <option value="true" ${stu.homeVisited ? 'selected' : ''}>✓ เยี่ยมบ้านแล้ว</option>
        </select>
      </div>
      <button type="submit" class="w-full py-2.5 rounded-xl bg-china-red text-white font-heading font-bold text-xs shadow">บันทึกข้อมูลการเยี่ยมบ้าน</button>
    </form>
  `);
}

function saveStudentHomeLocation(e, studentId) {
  e.preventDefault();
  const stu = appData.students.find(s => String(s.id) === String(studentId));
  if (!stu) return;
  stu.homeLocation = document.getElementById('homeLocInput').value.trim();
  stu.homeNote = document.getElementById('homeNoteInput').value.trim();
  stu.homeVisited = document.getElementById('homeStatusSelect').value === 'true';
  saveAppData();
  closeCustomModal();
}

// ==========================================================
// 2. RENDER PROJECTS & TASK TRACKING
// ==========================================================
function renderProjectsAndTasks() {
  const isAdmin = currentUser?.role === 'admin';
  const myId = currentUser?.student?.id;

  // Hero Moral Project Link
  document.getElementById('projectHeroTitle').textContent = appData.classInfo.moralProjectTitle;
  document.getElementById('projectHeroDesc').textContent = appData.classInfo.moralProjectDesc;
  document.getElementById('projectUrlDisplay').textContent = appData.classInfo.moralProjectUrl;
  document.getElementById('projectHeroBtn').href = appData.classInfo.moralProjectUrl || '#';

  if (!activeTaskId && appData.tasks.length > 0) {
    activeTaskId = appData.tasks[0].id;
  }

  const tasksContainer = document.getElementById('tasksContainer');
  if (appData.tasks.length === 0) {
    tasksContainer.innerHTML = `<div class="col-span-2 p-6 text-center text-xs text-slate-400">ยังไม่มีรายการงานที่ติดตาม</div>`;
  } else {
    tasksContainer.innerHTML = appData.tasks.map(task => {
      const isSelected = task.id === activeTaskId;
      const submittedCount = task.submittedIds.length;
      const totalStudents = appData.students.length;
      const pct = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;
      const iSubmitted = myId ? task.submittedIds.includes(myId) : false;

      return `
        <div onclick="selectActiveTask('${task.id}')" class="cursor-pointer p-4 rounded-2xl border-2 transition-all ${
          isSelected ? 'border-china-red bg-rose-50/70 shadow-sm' : 'border-rose-100 bg-white hover:border-rose-200'
        }">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <span class="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-rose-100 text-china-darkred">กำหนดส่ง: ${task.dueDate || '-'}</span>
                ${myId ? (
                  iSubmitted
                    ? `<span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ คุณส่งแล้ว</span>`
                    : `<span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">⏳ คุณยังไม่ส่ง</span>`
                ) : ''}
              </div>
              <h4 class="font-heading font-bold text-base text-slate-800">${task.title}</h4>
              <p class="text-xs text-slate-500 mt-0.5">${task.description || ''}</p>
            </div>
            ${isAdmin ? `
              <button onclick="event.stopPropagation(); deleteTask('${task.id}')" class="p-1.5 text-rose-400 hover:text-china-red rounded-lg hover:bg-rose-100" title="ลบงานนี้">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            ` : ''}
          </div>

          <div class="mt-3 space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="font-medium text-emerald-700">ส่งแล้ว ${submittedCount}/${totalStudents} คน (${pct}%)</span>
              ${task.link ? `<a href="${task.link}" target="_blank" onclick="event.stopPropagation()" class="text-china-red font-semibold hover:underline flex items-center gap-1">เปิดลิงก์งาน <i data-lucide="external-link" class="w-3 h-3"></i></a>` : ''}
            </div>
            <div class="w-full h-2 bg-rose-100 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-china-red to-emerald-500 rounded-full" style="width: ${pct}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Checklist for Active Task
  const activeTask = appData.tasks.find(t => t.id === activeTaskId);
  const titleEl = document.getElementById('activeTaskTitle');
  const gridEl = document.getElementById('taskStudentGrid');

  if (!activeTask) {
    titleEl.textContent = 'ไม่มีรายการงานที่เลือก';
    gridEl.innerHTML = '';
    return;
  }

  titleEl.textContent = `${activeTask.title} (คลิกที่ชื่อเพื่อเช็คส่งงาน)`;
  gridEl.innerHTML = appData.students.map(stu => {
    const isSubmitted = activeTask.submittedIds.includes(stu.id);
    const isMe = myId === stu.id;
    return `
      <div onclick="toggleTaskSubmission('${activeTask.id}', '${stu.id}')" 
        class="${isAdmin ? 'cursor-pointer hover:scale-[1.02]' : ''} p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
          isSubmitted
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            : 'bg-rose-50/60 border-rose-200 text-slate-700'
        } ${isMe ? 'ring-2 ring-china-red' : ''}">
        <div class="truncate">
          <p class="text-xs font-bold truncate">เลขที่ ${stu.no} ${stu.nickname}</p>
          <p class="text-[11px] opacity-75 truncate">${stu.name}</p>
        </div>
        <span class="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
          isSubmitted ? 'bg-emerald-500 text-white' : 'bg-rose-200 text-china-darkred'
        }">
          ${isSubmitted ? 'ส่งแล้ว' : 'ค้าง'}
        </span>
      </div>
    `;
  }).join('');
}

function selectActiveTask(taskId) {
  activeTaskId = taskId;
  renderProjectsAndTasks();
  if (window.lucide) lucide.createIcons();
}

function toggleTaskSubmission(taskId, studentId) {
  if (currentUser?.role !== 'admin') return;
  const task = appData.tasks.find(t => t.id === taskId);
  if (!task) return;
  const idx = task.submittedIds.indexOf(studentId);
  if (idx >= 0) task.submittedIds.splice(idx, 1);
  else task.submittedIds.push(studentId);
  saveAppData();
}

function markAllTaskSubmitted() {
  if (currentUser?.role !== 'admin') return;
  const task = appData.tasks.find(t => t.id === activeTaskId);
  if (!task) return;
  task.submittedIds = appData.students.map(s => s.id);
  saveAppData();
}

// ==========================================================
// 3. RENDER CLASS FUND (เงินห้อง & รายรับ-รายจ่ายแต่ละวัน)
// ==========================================================
function calculateMoneySummary() {
  // Income from student payments across all periods
  let collectedFromPeriods = 0;
  appData.paymentPeriods.forEach(period => {
    collectedFromPeriods += (period.paidStudentIds?.length || 0) * Number(period.amountPerStudent || 0);
  });

  // Income & Expenses from daily ledger
  let extraIncome = 0;
  let totalExpense = 0;
  appData.ledger.forEach(item => {
    const amt = Number(item.amount || 0);
    if (item.type === 'income') extraIncome += amt;
    else totalExpense += amt;
  });

  const totalIncome = collectedFromPeriods + extraIncome;
  const netBalance = totalIncome - totalExpense;
  return { collectedFromPeriods, extraIncome, totalIncome, totalExpense, netBalance };
}

function renderMoneySection() {
  const moneyAllowed = canManageMoney();
  const myId = currentUser?.student?.id;
  const stats = calculateMoneySummary();

  document.getElementById('moneyTotalIncome').textContent = `฿${stats.totalIncome.toLocaleString()}`;
  document.getElementById('moneyIncomeDetail').textContent = `เก็บเงินห้อง ฿${stats.collectedFromPeriods.toLocaleString()} + รายรับอื่น ฿${stats.extraIncome.toLocaleString()}`;
  document.getElementById('moneyTotalExpense').textContent = `฿${stats.totalExpense.toLocaleString()}`;
  document.getElementById('moneyExpenseDetail').textContent = `ทั้งหมด ${appData.ledger.filter(l => l.type === 'expense').length} รายการเบิกจ่าย`;
  document.getElementById('moneyNetBalance').textContent = `฿${stats.netBalance.toLocaleString()}`;

  if (!activePeriodId && appData.paymentPeriods.length > 0) {
    activePeriodId = appData.paymentPeriods[0].id;
  }

  // Period Selector Tabs
  const periodTabs = document.getElementById('paymentPeriodTabs');
  periodTabs.innerHTML = appData.paymentPeriods.map((p, idx) => {
    const active = p.id === activePeriodId;
    const isAdv = (p.isAdvance !== undefined) ? Boolean(p.isAdvance) : (idx >= 8);
    return `
      <div class="inline-flex items-center bg-rose-50/70 rounded-xl p-0.5 border ${isAdv ? 'border-dashed border-amber-300' : 'border-rose-100'}">
        <button onclick="selectPaymentPeriod('${p.id}')" class="px-3 py-1.5 rounded-lg text-xs font-heading font-semibold transition-all flex items-center gap-1 ${
          active
            ? 'bg-china-red text-white shadow-sm'
            : isAdv
              ? 'text-amber-700 hover:bg-amber-50'
              : 'text-china-darkred hover:bg-rose-100'
        }">
          <span>${p.name} (฿${p.amountPerStudent})</span>
          ${isAdv ? `<span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">ล่วงหน้า</span>` : ''}
        </button>
        ${moneyAllowed ? `
          <button onclick="openEditPaymentPeriodModal('${p.id}')" class="ml-0.5 p-1 text-slate-400 hover:text-china-red" title="แก้ไขชื่องวด/จำนวนเงิน">
            <i data-lucide="pen-line" class="w-3.5 h-3.5"></i>
          </button>
        ` : ''}
        ${moneyAllowed && appData.paymentPeriods.length > 1 ? `
          <button onclick="deletePaymentPeriod('${p.id}')" class="p-1 text-rose-400 hover:text-china-red" title="ลบงวดนี้">
            <i data-lucide="x-circle" class="w-3.5 h-3.5"></i>
          </button>
        ` : ''}
      </div>
    `;
  }).join('');

  const activeIdx = appData.paymentPeriods.findIndex(p => p.id === activePeriodId);
  const activePeriod = activeIdx >= 0 ? appData.paymentPeriods[activeIdx] : null;
  if (activePeriod) {
    const paidCount = activePeriod.paidStudentIds.length;
    const totalCount = appData.students.length;
    const collectedBath = paidCount * Number(activePeriod.amountPerStudent || 0);
    const pct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
    const isAdv = (activePeriod.isAdvance !== undefined) ? Boolean(activePeriod.isAdvance) : (activeIdx >= 8);

    document.getElementById('activePeriodName').textContent = activePeriod.name;
    document.getElementById('activePeriodAmount').textContent = `คนละ ${activePeriod.amountPerStudent} บาท`;
    document.getElementById('activePeriodStats').textContent = `จ่ายแล้ว ${paidCount}/${totalCount} คน (฿${collectedBath.toLocaleString()})`;
    document.getElementById('activePeriodBar').style.width = `${pct}%`;
    document.getElementById('moneyPaidRatioText').textContent = `${activePeriod.name}: จ่ายแล้ว ${paidCount}/${totalCount} คน`;

    const modeBadge = document.getElementById('activePeriodModeBadge');
    const toggleAdvBtn = document.getElementById('togglePeriodAdvanceBtn');
    if (modeBadge) {
      if (isAdv) {
        modeBadge.textContent = '⏳ งวดล่วงหน้า (ยังไม่คิดค้างจ่าย)';
        modeBadge.className = 'px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200';
      } else {
        modeBadge.textContent = '✓ เริ่มคิดเงินงวดนี้แล้ว';
        modeBadge.className = 'px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200';
      }
    }
    if (toggleAdvBtn) {
      if (isAdv) {
        toggleAdvBtn.innerHTML = `<span>🔔 กดเพื่อเริ่มคิดเงินงวดนี้</span>`;
        toggleAdvBtn.className = `${moneyAllowed ? '' : 'hidden'} money-manager-only px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-heading font-bold inline-flex items-center gap-1 transition-all shadow-sm`;
      } else {
        toggleAdvBtn.innerHTML = `<span>⏸️ ตั้งเป็นงวดล่วงหน้า (ยังไม่คิดค้าง)</span>`;
        toggleAdvBtn.className = `${moneyAllowed ? '' : 'hidden'} money-manager-only px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-heading font-bold inline-flex items-center gap-1 transition-all shadow-sm`;
      }
    }

    // Filter Student List
    const filteredStudents = appData.students.filter(stu => {
      const paid = activePeriod.paidStudentIds.includes(stu.id);
      if (paymentFilter === 'paid') return paid;
      if (paymentFilter === 'unpaid') return !paid;
      return true;
    });

    const grid = document.getElementById('studentPaymentGrid');
    grid.innerHTML = filteredStudents.map(stu => {
      const isPaid = activePeriod.paidStudentIds.includes(stu.id);
      const isMe = myId === stu.id;
      return `
        <div onclick="toggleStudentPayment('${activePeriod.id}', '${stu.id}')"
          title="${stu.name} (รหัส ${stu.id})"
          class="${moneyAllowed ? 'cursor-pointer hover:scale-105 active:scale-95' : ''} p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-1.5 ${
            isPaid
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/70 border-rose-200 text-slate-700'
          } ${isMe ? 'ring-2 ring-china-red' : ''}">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="w-6 h-6 rounded-lg bg-white border border-rose-100 flex items-center justify-center text-[11px] font-bold text-china-darkred shrink-0">
              ${stu.no}
            </span>
            <span class="font-heading font-bold text-xs sm:text-sm truncate">${stu.nickname || stu.name}</span>
          </div>
          <span class="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
            isPaid
              ? 'bg-emerald-500 text-white'
              : 'bg-rose-200/80 text-china-darkred'
          }">
            ${isPaid ? '✓' : '⏳'}
          </span>
        </div>
      `;
    }).join('');
  }

  // Daily Income/Expense Ledger List
  const ledgerContainer = document.getElementById('ledgerListContainer');
  const sortedLedger = [...appData.ledger].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (sortedLedger.length === 0) {
    ledgerContainer.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 bg-rose-50/40 rounded-2xl border border-dashed border-rose-200">ยังไม่มีรายการบันทึกรายรับ-รายจ่ายรายวัน</div>`;
  } else {
    ledgerContainer.innerHTML = sortedLedger.map(item => {
      const isIncome = item.type === 'income';
      return `
        <div class="p-3.5 rounded-2xl bg-rose-50/40 border border-rose-100 flex items-start justify-between gap-3">
          <div class="flex items-start gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
              isIncome ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-china-red'
            }">
              ${isIncome ? '+' : '-'}
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-[11px] text-slate-400">📅 ${item.date}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  isIncome ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-china-red'
                }">${isIncome ? 'รายรับ' : 'รายจ่าย'}</span>
              </div>
              <p class="font-heading font-bold text-xs sm:text-sm text-slate-800 mt-0.5">${item.title}</p>
              ${item.note ? `<p class="text-[11px] text-slate-500 mt-0.5">${item.note}</p>` : ''}
            </div>
          </div>
          <div class="text-right shrink-0 flex flex-col items-end">
            <span class="font-heading font-bold text-sm sm:text-base ${
              isIncome ? 'text-emerald-600' : 'text-china-red'
            }">
              ${isIncome ? '+' : '-'}฿${Number(item.amount).toLocaleString()}
            </span>
            ${moneyAllowed ? `
              <div class="flex items-center gap-2 mt-1">
                <button onclick="openEditLedgerModal('${item.id}')" class="text-[11px] text-slate-400 hover:text-china-red">แก้ไข</button>
                <button onclick="deleteLedgerItem('${item.id}')" class="text-[11px] text-rose-400 hover:text-china-red">ลบ</button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  renderStudentOwedTable();
}

function renderStudentOwedTable() {
  const container = document.getElementById('studentOwedListContainer');
  const badge = document.getElementById('totalUnpaidSummaryBadge');
  if (!container) return;

  const moneyAllowed = canManageMoney();
  const myId = currentUser?.student?.id;
  const periods = appData.paymentPeriods || [];

  // Calculate per-student payment & owed details across all periods
  let totalUnpaidStudents = 0;
  let totalUnpaidAmountAll = 0;

  const rowsData = appData.students.map(stu => {
    let paidAmt = 0;
    let owedAmt = 0;
    const unpaidPeriods = [];
    const paidPeriods = [];

    periods.forEach((p, idx) => {
      const amt = Number(p.amountPerStudent || 0);
      const isAdv = (p.isAdvance !== undefined) ? Boolean(p.isAdvance) : (idx >= 8);
      if ((p.paidStudentIds || []).includes(stu.id)) {
        paidAmt += amt;
        paidPeriods.push(p);
      } else if (!isAdv) {
        // นับยอดค้างเฉพาะงวดที่ถึงกำหนดเรียกเก็บแล้ว (ไม่นับงวดจ่ายล่วงหน้า 9-12)
        owedAmt += amt;
        unpaidPeriods.push(p);
      }
    });

    if (owedAmt > 0) {
      totalUnpaidStudents++;
      totalUnpaidAmountAll += owedAmt;
    }

    return {
      stu,
      paidAmt,
      owedAmt,
      unpaidPeriods,
      paidPeriods
    };
  });

  if (badge) {
    badge.textContent = totalUnpaidStudents > 0
      ? `ค้างชำระ ${totalUnpaidStudents} คน (รวม ฿${totalUnpaidAmountAll.toLocaleString()})`
      : 'จ่ายครบทุกคนแล้ว! 🎉';
    badge.className = totalUnpaidStudents > 0
      ? 'px-3 py-0.5 rounded-full bg-rose-100 text-china-red text-xs font-heading font-bold border border-rose-200'
      : 'px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-heading font-bold border border-emerald-200';
  }

  const displayRows = rowsData.filter(r => owedTableFilter === 'all' ? true : r.owedAmt > 0);

  if (displayRows.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-8 px-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center text-emerald-700 font-heading font-semibold text-xs sm:text-sm">
        🎉 ไม่มีคนค้างจ่ายเงินห้องในงวดปัจจุบันเลย! ทุกคนจ่ายครบหมดแล้ว
      </div>
    `;
    return;
  }

  container.innerHTML = displayRows.map(row => {
    const { stu, paidAmt, owedAmt, unpaidPeriods } = row;
    const isMe = myId === stu.id;

    const unpaidPills = unpaidPeriods.length === 0
      ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-semibold">✓ จ่ายครบทุกงวด</span>`
      : unpaidPeriods.map(p => `
          <button type="button"
            onclick="${moneyAllowed ? `toggleStudentPayment('${p.id}', '${stu.id}')` : ''}"
            title="${moneyAllowed ? 'คลิกเพื่อติ๊กว่าจ่ายงวดนี้แล้ว' : p.name}"
            class="${moneyAllowed ? 'cursor-pointer hover:bg-china-red hover:text-white active:scale-95' : 'cursor-default'} inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-100 text-china-darkred text-[11px] font-medium border border-rose-200 transition-all whitespace-nowrap">
            <span>⏳ ${p.name}</span>
          </button>
        `).join('');

    return `
      <div class="p-3 sm:p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
        isMe
          ? 'bg-rose-50/90 border-china-red ring-1 ring-china-red'
          : owedAmt > 0
            ? 'bg-rose-50/30 border-rose-100 hover:border-rose-200'
            : 'bg-emerald-50/20 border-emerald-100'
      }">
        <!-- Top Row: Student Number + Nickname + Paid vs Owed Badge -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-china-red text-white font-heading font-bold text-xs shrink-0">
              ${stu.no}
            </span>
            <span class="text-base shrink-0">${stu.emoji || '🐼'}</span>
            <div class="min-w-0 truncate">
              <span class="font-heading font-bold text-slate-800 text-sm">${stu.nickname || stu.name}</span>
              <span class="text-[11px] text-slate-400 ml-1">(${stu.name})</span>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <span class="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 whitespace-nowrap">
              จ่ายแล้ว ฿${paidAmt.toLocaleString()}
            </span>
            ${owedAmt > 0 ? `
              <span class="px-2.5 py-1 rounded-xl bg-china-red text-white font-heading font-bold text-xs shadow-sm whitespace-nowrap">
                ค้าง ฿${owedAmt.toLocaleString()}
              </span>
            ` : `
              <span class="px-2 py-0.5 rounded-lg bg-emerald-500 text-white font-heading font-bold text-[11px] whitespace-nowrap">
                ครบ ✓
              </span>
            `}
          </div>
        </div>

        <!-- Bottom Row: Compact Horizontal Pills of Unpaid Periods -->
        <div class="flex flex-wrap items-center gap-1.5 pt-1 border-t border-rose-100/70">
          <span class="text-[11px] text-slate-400 mr-0.5">${unpaidPeriods.length > 0 ? 'งวดที่ค้าง:' : 'สถานะ:'}</span>
          ${unpaidPills}
        </div>
      </div>
    `;
  }).join('');
}

function setOwedTableFilter(mode) {
  owedTableFilter = mode;
  ['unpaid', 'all'].forEach(m => {
    const btn = document.getElementById(`owedFilter-${m}`);
    if (btn) {
      btn.className = m === mode
        ? 'px-3 py-1.5 rounded-lg bg-china-red text-white font-medium transition-all'
        : 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-china-red font-medium transition-all';
    }
  });
  renderStudentOwedTable();
}

function copyUnpaidListToClipboard() {
  const periods = appData.paymentPeriods || [];
  const unpaidLines = [];
  let totalOwedSum = 0;

  appData.students.forEach(stu => {
    let owedAmt = 0;
    const unpaidNames = [];
    periods.forEach((p, idx) => {
      const isAdv = (p.isAdvance !== undefined) ? Boolean(p.isAdvance) : (idx >= 8);
      if (!isAdv && !(p.paidStudentIds || []).includes(stu.id)) {
        owedAmt += Number(p.amountPerStudent || 0);
        unpaidNames.push(p.name);
      }
    });
    if (owedAmt > 0) {
      totalOwedSum += owedAmt;
      unpaidLines.push(`• เลขที่ ${stu.no} ${stu.nickname || stu.name}: ต้องจ่ายอีก ${owedAmt} บาท (ค้าง: ${unpaidNames.join(', ')})`);
    }
  });

  if (unpaidLines.length === 0) {
    alert('🎉 นักเรียนทุกคนจ่ายเงินห้องครบทุกงวดแล้ว ไม่มีรายการค้างชำระครับ!');
    return;
  }

  const text = `🧧 แจ้งยอดค้างชำระเงินห้องทับหก (${unpaidLines.length} คน | รวม ฿${totalOwedSum.toLocaleString()})\n` +
    unpaidLines.join('\n') +
    `\n🌸 ชำระได้ที่เหรัญญิกประจำห้องนะครับ ขอบคุณครับ`;

  navigator.clipboard.writeText(text).then(() => {
    alert('📋 คัดลอกรายชื่อและยอดเงินที่ต้องจ่ายเพิ่มเรียบร้อยแล้ว! นำไปกดวาง (Paste) ในกลุ่มแชทห้องได้เลยครับ 🧧');
  }).catch(() => {
    prompt('คัดลอกข้อความด้านล่างไปวางในแชทห้องได้เลยครับ:', text);
  });
}

function selectPaymentPeriod(periodId) {
  activePeriodId = periodId;
  renderMoneySection();
  if (window.lucide) lucide.createIcons();
}

function toggleActivePeriodAdvanceMode() {
  if (!canManageMoney()) return;
  const idx = appData.paymentPeriods.findIndex(p => p.id === activePeriodId);
  if (idx < 0) return;
  const period = appData.paymentPeriods[idx];
  const curAdv = (period.isAdvance !== undefined) ? Boolean(period.isAdvance) : (idx >= 8);
  period.isAdvance = !curAdv;
  saveAppData();
}

function setPaymentFilter(filter) {
  paymentFilter = filter;
  ['all', 'paid', 'unpaid'].forEach(f => {
    const btn = document.getElementById(`payFilter-${f}`);
    if (btn) {
      btn.className = f === filter
        ? 'px-3 py-1.5 rounded-xl bg-china-red text-white font-medium'
        : 'px-3 py-1.5 rounded-xl bg-rose-50 text-slate-600 hover:bg-rose-100 font-medium';
    }
  });
  renderMoneySection();
}

function toggleStudentPayment(periodId, studentId) {
  if (!canManageMoney()) return;
  const period = appData.paymentPeriods.find(p => p.id === periodId);
  if (!period) return;
  const idx = period.paidStudentIds.indexOf(studentId);
  if (idx >= 0) period.paidStudentIds.splice(idx, 1);
  else period.paidStudentIds.push(studentId);
  saveAppData();
}

function markAllPaidInPeriod() {
  if (!canManageMoney()) return;
  const period = appData.paymentPeriods.find(p => p.id === activePeriodId);
  if (!period) return;
  period.paidStudentIds = appData.students.map(s => s.id);
  saveAppData();
}

// ==========================================================
// 4. LUCKY NUMBER RANDOMIZER (สุ่มเลขที่มงคล)
// ==========================================================
function startLuckyDraw() {
  if (isSpinning) return;
  const excludePicked = document.getElementById('excludePickedCheck').checked;
  const pickCount = parseInt(document.getElementById('pickCountSelect').value, 10) || 1;

  let pool = appData.students.filter(s => !excludePicked || !luckyPickedHistory.includes(s.no));
  if (pool.length === 0) {
    alert('สุ่มครบทุกคนในห้องแล้ว! ระบบจะรีเซ็ตกล่องสุ่มใหม่ให้ครับ 🧧');
    luckyPickedHistory = [];
    pool = [...appData.students];
    renderLuckyHistoryUI();
  }

  const actualCount = Math.min(pickCount, pool.length);
  isSpinning = true;

  const numEl = document.getElementById('randomNumberBig');
  const nameEl = document.getElementById('randomNameBig');
  const idEl = document.getElementById('randomIdSmall');
  numEl.classList.add('lucky-spinning');

  let ticks = 0;
  const maxTicks = 18;
  const interval = setInterval(() => {
    const temp = pool[Math.floor(Math.random() * pool.length)];
    numEl.textContent = temp.no;
    nameEl.textContent = `${temp.name} (${temp.nickname})`;
    idEl.textContent = `รหัสประจำตัว ${temp.id}`;
    ticks++;

    if (ticks >= maxTicks) {
      clearInterval(interval);
      numEl.classList.remove('lucky-spinning');
      isSpinning = false;

      // Pick unique winners
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const winners = shuffled.slice(0, actualCount);
      const first = winners[0];

      numEl.textContent = winners.map(w => w.no).join(', ');
      nameEl.textContent = winners.length === 1
        ? `${first.emoji || '🐼'} ${first.name} (${first.nickname})`
        : `ผู้โชคดี ${winners.length} คน! 🎉`;
      idEl.textContent = winners.length === 1
        ? `รหัสประจำตัว ${first.id} • ${first.role || 'สมาชิกห้อง'}`
        : winners.map(w => `เลขที่ ${w.no} ${w.nickname}`).join(' • ');

      winners.forEach(w => {
        if (!luckyPickedHistory.includes(w.no)) {
          luckyPickedHistory.push(w.no);
        }
      });

      // Render Latest Winners Cards
      const latestBox = document.getElementById('latestPickedCards');
      latestBox.innerHTML = winners.map(w => `
        <div class="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-rose-200 flex items-center justify-between gap-3 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-china-red text-white font-heading font-bold text-lg flex items-center justify-center shadow">
              ${w.no}
            </div>
            <div>
              <p class="font-heading font-bold text-sm sm:text-base text-china-darkred">${w.name} (${w.nickname})</p>
              <p class="text-xs text-slate-500">รหัส ${w.id} • ${w.role || 'สมาชิกห้อง'}</p>
            </div>
          </div>
          <span class="text-2xl">${w.emoji || '🧧'}</span>
        </div>
      `).join('');

      renderLuckyHistoryUI();

      // Fire Auspicious Red & Gold Confetti
      if (window.confetti) {
        confetti({
          particleCount: 70,
          spread: 65,
          origin: { y: 0.6 },
          colors: ['#E11D48', '#FB7185', '#F59E0B', '#FEF08A']
        });
      }
    }
  }, 75);
}

function resetLuckyHistory() {
  luckyPickedHistory = [];
  document.getElementById('randomNumberBig').textContent = '?';
  document.getElementById('randomNameBig').textContent = 'กดปุ่มเพื่อสุ่มเลย!';
  document.getElementById('randomIdSmall').textContent = '🌸 ห้องทับหก 🌸';
  document.getElementById('latestPickedCards').innerHTML = `
    <div class="p-4 rounded-2xl bg-rose-50/50 border border-dashed border-rose-200 text-center text-xs text-slate-400">
      รีเซ็ตประวัติเรียบร้อย กดปุ่มสุ่มเลขที่ได้เลย!
    </div>
  `;
  renderLuckyHistoryUI();
}

function renderLuckyHistoryUI() {
  const countBadge = document.getElementById('pickedCountBadge');
  const remBadge = document.getElementById('remainingPoolBadge');
  const pillsBox = document.getElementById('pickedHistoryPills');
  if (!countBadge || !pillsBox) return;

  countBadge.textContent = luckyPickedHistory.length;
  const remaining = Math.max(0, appData.students.length - luckyPickedHistory.length);
  remBadge.textContent = `เหลือในกล่อง ${remaining} คน`;

  if (luckyPickedHistory.length === 0) {
    pillsBox.innerHTML = `<span class="text-xs text-slate-400">ยังไม่มีประวัติการสุ่ม</span>`;
  } else {
    pillsBox.innerHTML = luckyPickedHistory.map(no => {
      const stu = appData.students.find(s => s.no === no);
      return `<span class="px-3 py-1 rounded-full bg-rose-100 text-china-darkred text-xs font-heading font-semibold border border-rose-200">เลขที่ ${no} ${stu ? stu.nickname : ''}</span>`;
    }).join('');
  }
}

// ==========================================================
// 5. DUTY & TIMETABLE IMAGE UPLOAD & LIGHTBOX
// ==========================================================
function renderDutyAndTimetable() {
  const dutyImg = document.getElementById('dutyScheduleImg');
  const timeImg = document.getElementById('timetableScheduleImg');
  if (dutyImg) dutyImg.src = appData.images?.duty || DEFAULT_DUTY_SVG;
  if (timeImg) timeImg.src = appData.images?.timetable || DEFAULT_TIMETABLE_SVG;
}

function handleImageUpload(event, targetKey) {
  const file = event.target.files?.[0];
  if (!file) return;

  // Resize & compress image using canvas so it fits comfortably in LocalStorage & Google Sheets
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1280;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

      if (!appData.images) appData.images = {};
      appData.images[targetKey] = dataUrl;
      saveAppData();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function openImageUrlModal(targetKey) {
  const currentUrl = appData.images?.[targetKey] || '';
  openCustomModal(
    targetKey === 'duty' ? '🖼️ ใส่ลิงก์รูปภาพตารางเวรประจำวัน' : '🖼️ ใส่ลิงก์รูปภาพตารางเรียน',
    `
      <div class="space-y-3">
        <label class="block text-xs text-slate-600">ลิงก์รูปภาพ (URL) หรือกดปุ่มรีเซ็ตเป็นตารางมาตรฐาน</label>
        <input type="url" id="modalImgUrlInput" value="${currentUrl.startsWith('data:') ? '' : currentUrl}" placeholder="https://..." class="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-xs outline-none">
        <div class="flex justify-between gap-2 pt-2">
          <button type="button" onclick="resetScheduleImage('${targetKey}')" class="px-3.5 py-2 rounded-xl bg-rose-50 text-china-red text-xs font-medium">คืนค่ารูปตารางเริ่มต้น</button>
          <button type="button" onclick="saveScheduleImageUrl('${targetKey}')" class="px-4 py-2 rounded-xl bg-china-red text-white text-xs font-medium">บันทึกรูปภาพ</button>
        </div>
      </div>
    `
  );
}

function saveScheduleImageUrl(targetKey) {
  const url = document.getElementById('modalImgUrlInput').value.trim();
  if (!url) return;
  if (!appData.images) appData.images = {};
  appData.images[targetKey] = url;
  saveAppData();
  closeCustomModal();
}

function resetScheduleImage(targetKey) {
  if (!appData.images) appData.images = {};
  appData.images[targetKey] = targetKey === 'duty' ? DEFAULT_DUTY_SVG : DEFAULT_TIMETABLE_SVG;
  saveAppData();
  closeCustomModal();
}

function openLightbox(src) {
  if (!src) return;
  document.getElementById('lightboxImg').src = src;
  const modal = document.getElementById('lightboxModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeLightbox() {
  const modal = document.getElementById('lightboxModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// ==========================================================
// 6. RENDER STUDENT DIRECTORY (ทำเนียบสมาชิกห้อง & อัปข้อมูลทีละรายคน)
// ==========================================================
function renderDirectory() {
  const isAdmin = currentUser?.role === 'admin';
  const myId = currentUser?.student?.id;
  const q = (document.getElementById('studentSearchInput')?.value || '').trim().toLowerCase();

  // Populate default next student number in the inline quick form if empty
  const noInput = document.getElementById('quickStuNo');
  const origInput = document.getElementById('quickStuOrigId');
  if (noInput && origInput && !origInput.value && !noInput.value) {
    const nextNo = appData.students.length > 0 ? Math.max(...appData.students.map(s => Number(s.no))) + 1 : 1;
    noInput.value = nextNo;
    const idInput = document.getElementById('quickStuId');
    if (idInput && !idInput.value) idInput.value = String(69600 + nextNo);
  }

  const list = appData.students.filter(s => {
    if (!q) return true;
    return (
      String(s.no).includes(q) ||
      String(s.id).toLowerCase().includes(q) ||
      (s.name || '').toLowerCase().includes(q) ||
      (s.nickname || '').toLowerCase().includes(q) ||
      (s.role || '').toLowerCase().includes(q)
    );
  });

  const grid = document.getElementById('directoryGrid');
  grid.innerHTML = list.map(stu => {
    const isMe = myId === stu.id;
    return `
      <div class="p-4 rounded-3xl bg-white border-2 transition-all ${
        isMe ? 'border-china-red bg-rose-50/40 shadow-md' : 'border-rose-100 hover:border-rose-200 shadow-sm'
      } flex flex-col justify-between gap-3">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 border border-rose-200 flex items-center justify-center text-2xl shrink-0">
              ${stu.emoji || '🐼'}
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="px-2 py-0.5 rounded-full bg-china-red text-white text-[11px] font-bold">เลขที่ ${stu.no}</span>
                <span class="text-xs text-slate-400">รหัส ${stu.id}</span>
              </div>
              <h4 class="font-heading font-bold text-base text-china-darkred mt-1">${stu.nickname || '-'}</h4>
              <p class="text-xs text-slate-600">${stu.name}</p>
            </div>
          </div>
        </div>

        <div class="pt-2 border-t border-rose-100 flex items-center justify-between text-xs">
          <span class="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium">${stu.role || 'สมาชิกห้อง'}</span>
          <span class="text-slate-400">เวร${stu.dutyDay || '-'}</span>
        </div>

        ${isAdmin ? `
          <div class="pt-2 border-t border-rose-100 flex items-center gap-1.5">
            <button onclick="loadStudentIntoQuickForm('${stu.id}')" class="flex-1 py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-china-red text-china-red hover:text-white text-xs font-heading font-semibold transition-all flex items-center justify-center gap-1">
              <i data-lucide="user-cog" class="w-3.5 h-3.5"></i>
              <span>อัปเดตข้อมูลคนนี้</span>
            </button>
            <button onclick="openEditStudentModal('${stu.id}')" class="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-slate-500 hover:text-china-red" title="แก้ไขแบบป๊อปอัป">
              <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function loadStudentIntoQuickForm(studentId) {
  const stu = appData.students.find(s => s.id === studentId);
  if (!stu) return;
  document.getElementById('quickStuOrigId').value = stu.id;
  document.getElementById('quickStuNo').value = stu.no;
  document.getElementById('quickStuId').value = stu.id;
  document.getElementById('quickStuNick').value = stu.nickname || '';
  document.getElementById('quickStuName').value = stu.name || '';
  document.getElementById('quickStuRole').value = stu.role || 'สมาชิกห้อง';
  document.getElementById('quickStuDuty').value = stu.dutyDay || 'วันจันทร์';
  const btn = document.getElementById('quickStuSubmitBtn');
  if (btn) btn.textContent = `อัปเดตเลขที่ ${stu.no} (${stu.nickname})`;
  document.getElementById('quickStudentForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetQuickStudentForm() {
  const nextNo = appData.students.length > 0 ? Math.max(...appData.students.map(s => Number(s.no))) + 1 : 1;
  document.getElementById('quickStuOrigId').value = '';
  document.getElementById('quickStuNo').value = nextNo;
  document.getElementById('quickStuId').value = String(69600 + nextNo);
  document.getElementById('quickStuNick').value = '';
  document.getElementById('quickStuName').value = '';
  document.getElementById('quickStuRole').value = 'สมาชิกห้อง';
  document.getElementById('quickStuDuty').value = 'วันจันทร์';
  const btn = document.getElementById('quickStuSubmitBtn');
  if (btn) btn.textContent = 'บันทึกเพิ่มคนใหม่';
}

function handleQuickStudentSave(e) {
  e.preventDefault();
  const origId = document.getElementById('quickStuOrigId').value.trim();
  const existing = origId ? appData.students.find(s => s.id === origId) : null;
  const noVal = Number(document.getElementById('quickStuNo').value) || 1;
  const usedEmojis = new Set(appData.students.filter(s => s.id !== origId).map(s => s.emoji));
  let assignedEmoji = existing?.emoji;
  if (!assignedEmoji || usedEmojis.has(assignedEmoji)) {
    assignedEmoji = ANIMAL_AVATARS.find(a => !usedEmojis.has(a)) || getUniqueAnimalForNo(noVal);
  }
  const payload = {
    ...(existing || {}),
    no: noVal,
    id: document.getElementById('quickStuId').value.trim(),
    nickname: document.getElementById('quickStuNick').value.trim(),
    name: document.getElementById('quickStuName').value.trim(),
    role: document.getElementById('quickStuRole').value.trim() || 'สมาชิกห้อง',
    dutyDay: document.getElementById('quickStuDuty').value,
    emoji: assignedEmoji
  };

  if (origId) {
    const idx = appData.students.findIndex(s => s.id === origId);
    if (idx >= 0) appData.students[idx] = payload;
  } else {
    // Check if student ID or No already exists, update if so
    const dupIdx = appData.students.findIndex(s => s.id === payload.id);
    if (dupIdx >= 0) appData.students[dupIdx] = payload;
    else appData.students.push(payload);
  }

  appData.students.sort((a, b) => a.no - b.no);
  saveAppData();
  resetQuickStudentForm();
}

// ==========================================================
// ADMIN CRUD MODALS
// ==========================================================
function openCustomModal(title, bodyHtml) {
  document.getElementById('customModalTitle').textContent = title;
  document.getElementById('customModalBody').innerHTML = bodyHtml;
  const modal = document.getElementById('customModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeCustomModal() {
  const modal = document.getElementById('customModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// 1. Add / Edit / Pin Announcement
function openAnnouncementModal() {
  openCustomModal('🎐 เพิ่มประกาศข่าวสารประจำห้อง', `
    <form onsubmit="saveAnnouncement(event)" class="space-y-3">
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">หัวข้อประกาศ *</label>
        <input type="text" id="annTitleInput" required placeholder="เช่น แจ้งนัดหมายส่งโครงงานคุณธรรม" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">ป้ายกำกับ</label>
          <input type="text" id="annTagInput" value="ข่าวสารห้อง" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">วันที่</label>
          <input type="text" id="annDateInput" value="${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
        </div>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">รายละเอียด *</label>
        <textarea id="annContentInput" rows="3" required placeholder="รายละเอียดที่ต้องการแจ้งนักเรียน..." class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none"></textarea>
      </div>
      <label class="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium cursor-pointer">
        <input type="checkbox" id="annPinInput" class="w-4 h-4 accent-amber-500 rounded">
        <span>📌 ปักหมุดประกาศนี้ไว้ด้านบนสุด (ประกาศสำคัญ)</span>
      </label>
      <button type="submit" class="w-full py-2.5 rounded-xl bg-china-red text-white font-heading font-bold text-xs shadow">บันทึกประกาศ</button>
    </form>
  `);
}

function saveAnnouncement(e) {
  e.preventDefault();
  appData.announcements.unshift({
    id: 'ann-' + Date.now(),
    title: document.getElementById('annTitleInput').value.trim(),
    tag: document.getElementById('annTagInput').value.trim(),
    date: document.getElementById('annDateInput').value.trim(),
    content: document.getElementById('annContentInput').value.trim(),
    isPinned: document.getElementById('annPinInput')?.checked || false
  });
  saveAppData();
  closeCustomModal();
}

function togglePinAnnouncement(id) {
  if (currentUser?.role !== 'admin') return;
  const ann = appData.announcements.find(a => a.id === id);
  if (!ann) return;
  ann.isPinned = !Boolean(ann.isPinned);
  saveAppData();
}

function openEditAnnouncementModal(id) {
  const ann = appData.announcements.find(a => a.id === id);
  if (!ann) return;

  openCustomModal('✏️ แก้ไขข้อความประกาศห้องเรียน', `
    <form onsubmit="saveEditedAnnouncement(event, '${ann.id}')" class="space-y-3">
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">หัวข้อประกาศ *</label>
        <input type="text" id="editAnnTitleInput" required value="${ann.title || ''}" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">ป้ายกำกับ</label>
          <input type="text" id="editAnnTagInput" value="${ann.tag || 'ข่าวสารห้อง'}" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">วันที่</label>
          <input type="text" id="editAnnDateInput" value="${ann.date || ''}" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
        </div>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">รายละเอียด *</label>
        <textarea id="editAnnContentInput" rows="3" required class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">${ann.content || ''}</textarea>
      </div>
      <label class="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium cursor-pointer">
        <input type="checkbox" id="editAnnPinInput" ${ann.isPinned ? 'checked' : ''} class="w-4 h-4 accent-amber-500 rounded">
        <span>📌 ปักหมุดประกาศนี้ไว้ด้านบนสุด (ประกาศสำคัญ)</span>
      </label>
      <button type="submit" class="w-full py-2.5 rounded-xl bg-china-red text-white font-heading font-bold text-xs shadow">บันทึกการแก้ไข</button>
    </form>
  `);
}

function saveEditedAnnouncement(e, id) {
  e.preventDefault();
  const ann = appData.announcements.find(a => a.id === id);
  if (!ann) return;
  ann.title = document.getElementById('editAnnTitleInput').value.trim();
  ann.tag = document.getElementById('editAnnTagInput').value.trim();
  ann.date = document.getElementById('editAnnDateInput').value.trim();
  ann.content = document.getElementById('editAnnContentInput').value.trim();
  ann.isPinned = document.getElementById('editAnnPinInput')?.checked || false;
  saveAppData();
  closeCustomModal();
}

function deleteAnnouncement(id) {
  if (!confirm('ต้องการลบประกาศนี้ใช่หรือไม่?')) return;
  appData.announcements = appData.announcements.filter(a => a.id !== id);
  saveAppData();
}

// 2. Edit Moral Project Link
function openEditMoralLinkModal() {
  openCustomModal('🌟 ตั้งค่าลิงก์เว็บไซต์โครงงานคุณธรรม', `
    <form onsubmit="saveMoralProjectLink(event)" class="space-y-3">
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">ชื่อโครงงานคุณธรรม</label>
        <input type="text" id="moralTitleInput" required value="${appData.classInfo.moralProjectTitle}" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">ลิงก์เว็บไซต์โครงงานคุณธรรมที่เคยทำ (URL)</label>
        <input type="url" id="moralUrlInput" required value="${appData.classInfo.moralProjectUrl}" placeholder="https://..." class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">คำอธิบายสั้นๆ</label>
        <textarea id="moralDescInput" rows="2" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">${appData.classInfo.moralProjectDesc}</textarea>
      </div>
      <button type="submit" class="w-full py-2.5 rounded-xl bg-china-red text-white font-heading font-bold text-xs shadow">บันทึกลิงก์โครงงาน</button>
    </form>
  `);
}

function saveMoralProjectLink(e) {
  e.preventDefault();
  appData.classInfo.moralProjectTitle = document.getElementById('moralTitleInput').value.trim();
  appData.classInfo.moralProjectUrl = document.getElementById('moralUrlInput').value.trim();
  appData.classInfo.moralProjectDesc = document.getElementById('moralDescInput').value.trim();
  saveAppData();
  closeCustomModal();
}

// 3. Edit Class Info (Teacher & Motto)
function openEditClassInfoModal() {
  openCustomModal('🏮 แก้ไขข้อมูลครูที่ปรึกษา & คติพจน์ห้อง', `
    <form onsubmit="saveClassInfo(event)" class="space-y-3">
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">ชื่อครูที่ปรึกษา</label>
        <input type="text" id="teacherNameInput" required value="${appData.classInfo.teacherName}" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">คติพจน์ประจำห้อง</label>
        <input type="text" id="classMottoInput" required value="${appData.classInfo.classMotto}" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <button type="submit" class="w-full py-2.5 rounded-xl bg-china-red text-white font-heading font-bold text-xs shadow">บันทึกข้อมูล</button>
    </form>
  `);
}

function saveClassInfo(e) {
  e.preventDefault();
  appData.classInfo.teacherName = document.getElementById('teacherNameInput').value.trim();
  appData.classInfo.classMotto = document.getElementById('classMottoInput').value.trim();
  saveAppData();
  closeCustomModal();
}

// 4. Add Task / Homework
function openAddTaskModal() {
  openCustomModal('📋 เพิ่มรายการติดตามงาน / กิจกรรมห้อง', `
    <form onsubmit="saveNewTask(event)" class="space-y-3">
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">ชื่องาน / กิจกรรม</label>
        <input type="text" id="taskTitleInput" required placeholder="เช่น ส่งสมุดบันทึกความดีครั้งที่ 2" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">กำหนดส่ง</label>
        <input type="text" id="taskDueInput" placeholder="เช่น วันศุกร์ที่ 28 พ.ย." class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">ลิงก์ส่งงาน หรือเว็บอ้างอิง (ถ้ามี)</label>
        <input type="url" id="taskLinkInput" placeholder="https://..." class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">รายละเอียดเพิ่มเติม</label>
        <textarea id="taskDescInput" rows="2" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none"></textarea>
      </div>
      <button type="submit" class="w-full py-2.5 rounded-xl bg-china-red text-white font-heading font-bold text-xs shadow">เพิ่มงานใหม่</button>
    </form>
  `);
}

function saveNewTask(e) {
  e.preventDefault();
  const newTask = {
    id: 'task-' + Date.now(),
    title: document.getElementById('taskTitleInput').value.trim(),
    dueDate: document.getElementById('taskDueInput').value.trim(),
    link: document.getElementById('taskLinkInput').value.trim(),
    description: document.getElementById('taskDescInput').value.trim(),
    submittedIds: []
  };
  appData.tasks.unshift(newTask);
  activeTaskId = newTask.id;
  saveAppData();
  closeCustomModal();
}

function deleteTask(id) {
  if (!confirm('ลบรายการงานนี้ใช่หรือไม่?')) return;
  appData.tasks = appData.tasks.filter(t => t.id !== id);
  if (activeTaskId === id) activeTaskId = appData.tasks[0]?.id || null;
  saveAppData();
}

// 5. Add / Edit Payment Period (งวดเก็บเงินห้อง)
function openAddPaymentPeriodModal() {
  openCustomModal('🧧 เพิ่มงวดเก็บเงินห้องใหม่', `
    <form onsubmit="saveNewPaymentPeriod(event)" class="space-y-3">
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">ชื่องวด / ข้อความ</label>
        <input type="text" id="periodNameInput" required placeholder="เช่น งวดที่ 1 (สัปดาห์แรก) หรือ เงินห้อง พ.ย." class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">จำนวนเงินที่เก็บต่อคน (บาท)</label>
        <input type="number" id="periodAmountInput" required value="5" min="1" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <label class="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-1">
        <input type="checkbox" id="periodAdvanceInput" class="w-4 h-4 accent-china-red rounded">
        <span>เป็นงวดจ่ายล่วงหน้า (ยังไม่นำมาคิดเป็นยอดค้างชำระในตารางทวงเงิน)</span>
      </label>
      <button type="submit" class="w-full py-2.5 rounded-xl bg-china-red text-white font-heading font-bold text-xs shadow">สร้างงวดเก็บเงิน</button>
    </form>
  `);
}

function saveNewPaymentPeriod(e) {
  e.preventDefault();
  const newP = {
    id: 'period-' + Date.now(),
    name: document.getElementById('periodNameInput').value.trim(),
    amountPerStudent: Number(document.getElementById('periodAmountInput').value) || 5,
    isAdvance: document.getElementById('periodAdvanceInput')?.checked || false,
    paidStudentIds: []
  };
  appData.paymentPeriods.push(newP);
  activePeriodId = newP.id;
  saveAppData();
  closeCustomModal();
}

function openEditPaymentPeriodModal(periodId) {
  const targetId = periodId || activePeriodId;
  const period = appData.paymentPeriods.find(p => p.id === targetId);
  if (!period) return;

  openCustomModal(`✏️ แก้ไขรายการงวดเก็บเงิน (${period.name})`, `
    <form onsubmit="saveEditedPaymentPeriod(event, '${period.id}')" class="space-y-3">
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">ชื่องวด / ข้อความที่ต้องการแสดง</label>
        <input type="text" id="editPeriodNameInput" required value="${period.name}" placeholder="เช่น สัปดาห์ที่ 1 (5 พ.ย.)" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">จำนวนเงินต่อคน (บาท)</label>
        <input type="number" id="editPeriodAmountInput" required value="${period.amountPerStudent}" min="1" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <label class="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-1">
        <input type="checkbox" id="editPeriodAdvanceInput" ${period.isAdvance ? 'checked' : ''} class="w-4 h-4 accent-china-red rounded">
        <span>เป็นงวดจ่ายล่วงหน้า (ยังไม่คิดเป็นยอดค้างชำระในตารางทวงเงิน)</span>
      </label>
      <button type="submit" class="w-full py-2.5 rounded-xl bg-china-red text-white font-heading font-bold text-xs shadow">บันทึกการแก้ไข</button>
    </form>
  `);
}

function saveEditedPaymentPeriod(e, periodId) {
  e.preventDefault();
  const period = appData.paymentPeriods.find(p => p.id === periodId);
  if (!period) return;
  period.name = document.getElementById('editPeriodNameInput').value.trim();
  period.amountPerStudent = Number(document.getElementById('editPeriodAmountInput').value) || 5;
  period.isAdvance = document.getElementById('editPeriodAdvanceInput')?.checked || false;
  saveAppData();
  closeCustomModal();
}

function deletePaymentPeriod(id) {
  if (!confirm('ต้องการลบงวดเก็บเงินนี้ใช่หรือไม่?')) return;
  appData.paymentPeriods = appData.paymentPeriods.filter(p => p.id !== id);
  if (activePeriodId === id) activePeriodId = appData.paymentPeriods[0]?.id || null;
  saveAppData();
}

// 6. Add / Edit Daily Ledger Item (รายรับ-รายจ่ายแต่ละวัน)
function openAddLedgerModal() {
  const today = new Date().toISOString().slice(0, 10);
  openCustomModal('📖 บันทึกรายรับ-รายจ่ายประจำวัน', `
    <form onsubmit="saveNewLedgerItem(event)" class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">ประเภท</label>
          <select id="ledgerTypeInput" class="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs outline-none">
            <option value="expense">🔴 รายจ่าย (เบิกซื้อของ)</option>
            <option value="income">🟢 รายรับพิเศษ</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">วันที่</label>
          <input type="date" id="ledgerDateInput" required value="${today}" class="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs outline-none">
        </div>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">รายการ</label>
        <input type="text" id="ledgerTitleInput" required placeholder="เช่น ซื้อปากกาไวท์บอร์ด 3 ด้าม" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">จำนวนเงิน (บาท)</label>
        <input type="number" id="ledgerAmountInput" required min="1" placeholder="เช่น 60" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">หมายเหตุ / ผู้เบิก</label>
        <input type="text" id="ledgerNoteInput" placeholder="เช่น มีใบเสร็จเก็บไว้ที่เหรัญญิก" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <button type="submit" class="w-full py-2.5 rounded-xl bg-china-red text-white font-heading font-bold text-xs shadow">บันทึกรายการ</button>
    </form>
  `);
}

function saveNewLedgerItem(e) {
  e.preventDefault();
  appData.ledger.unshift({
    id: 'led-' + Date.now(),
    type: document.getElementById('ledgerTypeInput').value,
    date: document.getElementById('ledgerDateInput').value,
    title: document.getElementById('ledgerTitleInput').value.trim(),
    amount: Number(document.getElementById('ledgerAmountInput').value) || 0,
    note: document.getElementById('ledgerNoteInput').value.trim()
  });
  saveAppData();
  closeCustomModal();
}

function openEditLedgerModal(ledgerId) {
  const item = appData.ledger.find(l => l.id === ledgerId);
  if (!item) return;

  openCustomModal('✏️ แก้ไขรายการรายรับ-รายจ่าย', `
    <form onsubmit="saveEditedLedgerItem(event, '${item.id}')" class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">ประเภท</label>
          <select id="editLedgerTypeInput" class="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs outline-none">
            <option value="expense" ${item.type === 'expense' ? 'selected' : ''}>🔴 รายจ่าย (เบิกซื้อของ)</option>
            <option value="income" ${item.type === 'income' ? 'selected' : ''}>🟢 รายรับพิเศษ</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">วันที่</label>
          <input type="date" id="editLedgerDateInput" required value="${item.date || ''}" class="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs outline-none">
        </div>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">รายการ / ข้อความ</label>
        <input type="text" id="editLedgerTitleInput" required value="${item.title || ''}" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">จำนวนเงิน (บาท)</label>
        <input type="number" id="editLedgerAmountInput" required min="1" value="${item.amount || 0}" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">หมายเหตุ / ผู้เบิก</label>
        <input type="text" id="editLedgerNoteInput" value="${item.note || ''}" class="w-full px-3.5 py-2 rounded-xl border border-rose-200 text-xs outline-none">
      </div>
      <button type="submit" class="w-full py-2.5 rounded-xl bg-china-red text-white font-heading font-bold text-xs shadow">บันทึกการแก้ไข</button>
    </form>
  `);
}

function saveEditedLedgerItem(e, ledgerId) {
  e.preventDefault();
  const item = appData.ledger.find(l => l.id === ledgerId);
  if (!item) return;
  item.type = document.getElementById('editLedgerTypeInput').value;
  item.date = document.getElementById('editLedgerDateInput').value;
  item.title = document.getElementById('editLedgerTitleInput').value.trim();
  item.amount = Number(document.getElementById('editLedgerAmountInput').value) || 0;
  item.note = document.getElementById('editLedgerNoteInput').value.trim();
  saveAppData();
  closeCustomModal();
}

function deleteLedgerItem(id) {
  if (!confirm('ลบรายการบัญชีนี้ใช่หรือไม่?')) return;
  appData.ledger = appData.ledger.filter(l => l.id !== id);
  saveAppData();
}

// 7. Add / Edit Student
function openAddStudentModal() {
  const nextNo = appData.students.length > 0 ? Math.max(...appData.students.map(s => Number(s.no))) + 1 : 1;
  const nextId = String(69600 + nextNo);
  const usedEmojis = new Set(appData.students.map(s => s.emoji));
  const nextAnimal = ANIMAL_AVATARS.find(a => !usedEmojis.has(a)) || getUniqueAnimalForNo(nextNo);
  openStudentFormModal({ no: nextNo, id: nextId, name: '', nickname: '', role: 'สมาชิกห้อง', dutyDay: 'วันจันทร์', emoji: nextAnimal }, false);
}

function openEditStudentModal(studentId) {
  const stu = appData.students.find(s => s.id === studentId);
  if (!stu) return;
  openStudentFormModal(stu, true);
}

function openStudentFormModal(stu, isEdit) {
  openCustomModal(isEdit ? `🐼 แก้ไขข้อมูลนักเรียน เลขที่ ${stu.no}` : '🐼 เพิ่มนักเรียนใหม่เข้าห้องทับหก', `
    <form onsubmit="saveStudentForm(event, '${isEdit ? stu.id : ''}')" class="space-y-3">
      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">เลขที่</label>
          <input type="number" id="stuNoInput" required value="${stu.no}" class="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs outline-none">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">รหัสประจำตัว</label>
          <input type="text" id="stuIdInput" required value="${stu.id}" class="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs outline-none">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">สัตว์ประจำตัว</label>
          <select id="stuEmojiInput" class="w-full px-2 py-2 rounded-xl border border-rose-200 text-sm outline-none">
            ${ANIMAL_AVATARS.map(em => `<option value="${em}" ${stu.emoji === em ? 'selected' : ''}>${em}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div class="col-span-2">
          <label class="block text-xs font-medium text-slate-700 mb-1">ชื่อ - นามสกุล</label>
          <input type="text" id="stuNameInput" required value="${stu.name}" placeholder="ชื่อ นามสกุล" class="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs outline-none">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">ชื่อเล่น</label>
          <input type="text" id="stuNickInput" required value="${stu.nickname}" placeholder="ชื่อเล่น" class="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs outline-none">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">ตำแหน่งในห้อง</label>
          <input type="text" id="stuRoleInput" value="${stu.role}" class="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs outline-none">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">เวรประจำวัน</label>
          <select id="stuDutyInput" class="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs outline-none">
            ${['วันจันทร์','วันอังคาร','วันพุธ','วันพฤหัสบดี','วันศุกร์'].map(d => `<option value="${d}" ${stu.dutyDay === d ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="flex justify-between gap-2 pt-2">
        ${isEdit ? `<button type="button" onclick="deleteStudent('${stu.id}')" class="px-3.5 py-2.5 rounded-xl bg-rose-100 text-china-red text-xs font-medium">ลบรายชื่อ</button>` : '<div></div>'}
        <button type="submit" class="px-6 py-2.5 rounded-xl bg-china-red text-white font-heading font-bold text-xs shadow">บันทึกข้อมูลนักเรียน</button>
      </div>
    </form>
  `);
}

function saveStudentForm(e, originalId) {
  e.preventDefault();
  const existing = originalId ? appData.students.find(s => s.id === originalId) : null;
  const payload = {
    ...(existing || {}),
    no: Number(document.getElementById('stuNoInput').value) || 1,
    id: document.getElementById('stuIdInput').value.trim(),
    emoji: document.getElementById('stuEmojiInput').value,
    name: document.getElementById('stuNameInput').value.trim(),
    nickname: document.getElementById('stuNickInput').value.trim(),
    role: document.getElementById('stuRoleInput').value.trim() || 'สมาชิกห้อง',
    dutyDay: document.getElementById('stuDutyInput').value
  };

  if (originalId) {
    const idx = appData.students.findIndex(s => s.id === originalId);
    if (idx >= 0) appData.students[idx] = payload;
  } else {
    appData.students.push(payload);
  }
  appData.students.sort((a, b) => a.no - b.no);
  saveAppData();
  closeCustomModal();
}

function deleteStudent(studentId) {
  if (!confirm('ต้องการลบรายชื่อนักเรียนคนนี้ออกจากระบบใช่หรือไม่?')) return;
  appData.students = appData.students.filter(s => s.id !== studentId);
  saveAppData();
  closeCustomModal();
}

// ==========================================================
// SETTINGS & BACKUP / RESTORE & TREASURER SELECTION
// ==========================================================
function openSetTreasurerModal() {
  const curId = appData.treasurerStudentId || '69603';
  const options = appData.students.map(s =>
    `<option value="${s.id}" ${String(s.id) === String(curId) ? 'selected' : ''}>เลขที่ ${s.no} ${s.nickname} (${s.name} - รหัส ${s.id})</option>`
  ).join('');

  openCustomModal('🧧 กำหนดรหัสนักเรียนที่เป็น "เหรัญญิกประจำห้อง"', `
    <form onsubmit="saveTreasurerModalForm(event)" class="space-y-3">
      <p class="text-xs text-slate-600 leading-relaxed">
        นักเรียนที่ถูกเลือกเป็นเหรัญญิก (1 คน) จะสามารถใช้ <strong>รหัสประจำตัวนักเรียนของตัวเอง</strong> ล็อกอินเข้ามาเพื่อติ๊กเช็คคนจ่ายเงินห้อง เพิ่มงวดเก็บเงิน และบันทึกรายรับ-รายจ่ายได้โดยไม่ต้องใช้รหัสผ่านครู
      </p>
      <div>
        <label class="block text-xs font-medium text-slate-700 mb-1">เลือกนักเรียนที่เป็นเหรัญญิก</label>
        <select id="modalTreasurerSelect" class="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-xs sm:text-sm outline-none bg-white">
          ${options}
        </select>
      </div>
      <button type="submit" class="w-full py-2.5 rounded-xl bg-china-red text-white font-heading font-bold text-xs shadow">บันทึกสิทธิ์เหรัญญิก</button>
    </form>
  `);
}

function saveTreasurerModalForm(e) {
  e.preventDefault();
  const selectedId = document.getElementById('modalTreasurerSelect').value;
  applyNewTreasurer(selectedId);
  closeCustomModal();
}

function applyNewTreasurer(selectedId) {
  appData.treasurerStudentId = selectedId;
  // Update student role badge automatically
  appData.students.forEach(s => {
    if (String(s.id) === String(selectedId)) {
      s.role = 'เหรัญญิกประจำห้อง 🧧';
    } else if (s.role && s.role.includes('เหรัญญิก')) {
      s.role = 'สมาชิกห้อง';
    }
  });
  saveAppData();
}

function openSettingsModal() {
  document.getElementById('gasUrlInput').value = getActiveGasUrl();
  document.getElementById('currentAdminPassHint').textContent = appData.adminPass || '2569';
  const trSelect = document.getElementById('treasurerSelectInput');
  if (trSelect) {
    const curId = appData.treasurerStudentId || '20854';
    trSelect.innerHTML = appData.students.map(s =>
      `<option value="${s.id}" ${String(s.id) === String(curId) ? 'selected' : ''}>เลขที่ ${s.no} ${s.nickname} (รหัส ${s.id})</option>`
    ).join('');
  }
  const modal = document.getElementById('settingsModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function saveTreasurerFromSettings() {
  const trSelect = document.getElementById('treasurerSelectInput');
  if (!trSelect) return;
  applyNewTreasurer(trSelect.value);
  const stu = appData.students.find(s => String(s.id) === String(trSelect.value));
  alert(`กำหนดให้ ${stu ? stu.nickname : ''} (รหัส ${trSelect.value}) เป็นเหรัญญิกประจำห้องเรียบร้อยแล้ว 🧧`);
}

function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function saveGasUrlAndSync() {
  const url = document.getElementById('gasUrlInput').value.trim();
  if (url) {
    localStorage.setItem(GAS_URL_KEY, url);
    pushToGoogleSheets();
    alert('บันทึกลิงก์ Google Apps Script และส่งข้อมูลขึ้น Google Sheets เรียบร้อยแล้ว!');
  } else {
    localStorage.removeItem(GAS_URL_KEY);
    updateSyncStatusUI('ok', 'โหมดเก็บข้อมูลในเครื่อง');
  }
}

async function forceLoadPdfClassData() {
  const urlInput = document.getElementById('gasUrlInput');
  if (urlInput && urlInput.value.trim()) {
    localStorage.setItem(GAS_URL_KEY, urlInput.value.trim());
  }
  appData = JSON.parse(JSON.stringify(INITIAL_DATA));
  ensureUniqueStudentAnimals(appData.students);
  activePeriodId = appData.paymentPeriods[0]?.id || null;
  saveAppData(false); // บันทึกในเครื่อง + ส่งขึ้น Google Sheets ทันที
  alert('✅ โหลดข้อมูลนักเรียน ม.4/6 (36 คน) และยอดเงินห้องตามไฟล์ PDF (1,295 บาท) ลงในเว็บและส่งขึ้น Google Sheets เรียบร้อยแล้วครับ!');
  closeSettingsModal();
}

function updateAdminPassword() {
  const newPass = document.getElementById('newAdminPassInput').value.trim();
  if (!newPass) return;
  appData.adminPass = newPass;
  saveAppData();
  document.getElementById('currentAdminPassHint').textContent = newPass;
  document.getElementById('newAdminPassInput').value = '';
  alert(`เปลี่ยนรหัสผ่านครู/เหรัญญิกเป็น "${newPass}" เรียบร้อยแล้ว`);
}

function exportDataJson() {
  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `homeroom-tub6-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importDataJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported && imported.students) {
        appData = { ...INITIAL_DATA, ...imported };
        saveAppData();
        alert('นำเข้าข้อมูลสำเร็จเรียบร้อยแล้ว 🌸');
        closeSettingsModal();
      } else {
        alert('ไฟล์ JSON ไม่ถูกต้อง');
      }
    } catch (err) {
      alert('ไม่สามารถอ่านไฟล์ได้');
    }
  };
  reader.readAsText(file);
}

// ==========================================================
// INITIALIZATION
// ==========================================================
window.addEventListener('DOMContentLoaded', () => {
  // Check existing session
  try {
    const savedSession = sessionStorage.getItem(SESSION_KEY);
    if (savedSession) {
      currentUser = JSON.parse(savedSession);
      document.getElementById('loginScreen').classList.add('hidden');
    }
  } catch (e) {}

  renderAll();

  // Automatically connect to the embedded Google Apps Script URL on any device
  const gasUrl = getActiveGasUrl();
  if (gasUrl) {
    pullFromGoogleSheets(true);
  }
});
