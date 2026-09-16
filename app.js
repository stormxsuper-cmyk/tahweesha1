/* =========================================================
   تطبيق تحويشتي - Tahweesha
   Full Application Logic + Supabase & Google OAuth Integration
   ========================================================= */

const SUPABASE_URL = "https://iupgijqisikfsikgsjfg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fCADiUYIL0cs2c2QpcynEw_qmMc-qJ3";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// 1. عناصر الواجهة (DOM Elements)
const authView = document.getElementById('authView');
const appView = document.getElementById('appView');
const userArea = document.getElementById('userArea');
const userEmail = document.getElementById('userEmail');
const authMessage = document.getElementById('authMessage');
const planMessage = document.getElementById('planMessage');
const grid = document.getElementById('grid');
const emptyState = document.getElementById('emptyState');
const remainingEl = document.getElementById('remaining');
const targetTotalEl = document.getElementById('targetTotal');
const progressWrap = document.getElementById('progressWrap');
const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');
const targetInput = document.getElementById('targetAmount');
const boxesSelect = document.getElementById('boxesCount'); // قائمة اختيار الخانات
const googleBtn = document.getElementById('googleBtn');

let currentUser = null;
let currentPlan = null;
let items = [];

// 2. رسائل تشجيعية ديناميكية حسب نسبة الإنجاز
const MOTIVATIONAL_QUOTES = {
  0: "بداية الألف ميل تبدأ بخطوة واحدة! يلا نبدأ تحويش 🚀",
  25: "عاش يا بطل! قطعنا ربع الطريق بامتياز 💪",
  50: "وصلنا لنص الطريق! المجهود باين والمستقبل يلمع 🌟",
  75: "قربنا جداً من خط النهاية! عشت يا وحش 🎯",
  100: "ألف مبروك! حققت الهدف وجمعت تحويشتك كاملاً 👑🎉"
};

// 3. دوال مساعدة
function money(n) { return `${Number(n).toLocaleString('ar-EG')} ج`; }

function setMessage(el, text, ok = false) { 
  if (!el) return;
  el.textContent = text || ''; 
  el.style.color = ok ? '#86efac' : '#f87171'; 
}

function randomShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { 
    const j = Math.floor(Math.random() * (i + 1)); 
    [a[i], a[j]] = [a[j], a[i]]; 
  }
  return a;
}

// 4. خوارزمية توزيع المبالغ بالنسب المئوية والتوزيع العشوائي
function makeCombination(total, targetBoxes) {
  if (total < targetBoxes * 20 || !Number.isInteger(total)) return null;

  // تحديد الفئات المتاحة (إضافة فئات إضافية للمبالغ الكبيرة أكثر من 10,000)
  let denoms = [20, 50, 100, 200, 250];
  if (total > 10000) {
    denoms.push(300, 500);
  }

  // توزيع الخانات الأساسية بناءً على النسب المحددة
  // 30% فئة 20ج | 20% فئة 50ج | 20% فئة 100ج | 15% فئة 200ج | 15% فئة 250ج
  let counts = {
    20: Math.floor(targetBoxes * 0.30),
    50: Math.floor(targetBoxes * 0.20),
    100: Math.floor(targetBoxes * 0.20),
    200: Math.floor(targetBoxes * 0.15),
    250: Math.floor(targetBoxes * 0.15)
  };

  // تعديل النسب في حالة المبالغ الكبيرة
  if (total > 10000) {
    counts[300] = Math.floor(targetBoxes * 0.05);
    counts[500] = Math.floor(targetBoxes * 0.05);
    counts[20] = Math.floor(targetBoxes * 0.25);
    counts[50] = Math.floor(targetBoxes * 0.15);
  }

  // استكمال الخانات المتبقية لضمان الوصول لعدد الخانات المطلوب
  let currentBoxesCount = Object.values(counts).reduce((a, b) => a + b, 0);
  while (currentBoxesCount < targetBoxes) {
    counts[20]++;
    currentBoxesCount++;
  }

  // إعداد مصفوفة الخانات
  let result = [];
  for (const [denom, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i++) {
      result.push(Number(denom));
    }
  }

  // ضبط مجموع القيم لتطابق المبلغ الإجمالي المطلوبة بدقة
  let currentSum = result.reduce((a, b) => a + b, 0);
  let diff = total - currentSum;
  let safetyLoop = 0;

  while (diff !== 0 && safetyLoop < 3000) {
    safetyLoop++;
    const idx = Math.floor(Math.random() * result.length);
    const currentVal = result[idx];

    if (diff > 0) {
      const nextDenom = denoms.find(d => d > currentVal && (d - currentVal) <= diff);
      if (nextDenom) {
        diff -= (nextDenom - currentVal);
        result[idx] = nextDenom;
      }
    } else if (diff < 0) {
      const neededSub = Math.abs(diff);
      const prevDenom = [...denoms].reverse().find(d => d < currentVal && (currentVal - d) <= neededSub);
      if (prevDenom) {
        diff += (currentVal - prevDenom);
        result[idx] = prevDenom;
      }
    }
  }

  // خلط وترتيب الخانات عشوائياً
  return randomShuffle(result);
}

// 5. عرض الخانات والتقدم والرسائل التشجيعية
function render() {
  grid.innerHTML = '';
  
  if (!items.length) { 
    emptyState.classList.remove('hidden'); 
    progressWrap.classList.add('hidden'); 
    updateTotals(); 
    return; 
  }

  emptyState.classList.add('hidden'); 
  progressWrap.classList.remove('hidden');

  items.forEach(item => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'saving-card' + (item.checked ? ' checked' : '');
    card.innerHTML = `
      <div class="denom">${item.denomination.toLocaleString('ar-EG')}<small> جنيه</small></div>
      <div class="check-text">${item.checked ? 'تم التحويش ✓' : 'اضغط للتعليم ✓'}</div>
    `;
    card.addEventListener('click', () => toggleItem(item.id));
    grid.appendChild(card);
  });

  updateTotals();
}

function updateTotals() {
  const target = Number(currentPlan?.target_amount || 0);
  const saved = items.filter(x => x.checked).reduce((s, x) => s + Number(x.denomination), 0);
  const remaining = Math.max(0, target - saved);
  const percent = target ? Math.min(100, Math.round((saved / target) * 100)) : 0;

  remainingEl.textContent = money(remaining);
  targetTotalEl.textContent = money(target);
  progressPercent.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;

  // إظهار الرسائل التشجيعية
  if (items.length > 0) {
    let currentQuote = MOTIVATIONAL_QUOTES[0];
    if (percent >= 100) currentQuote = MOTIVATIONAL_QUOTES[100];
    else if (percent >= 75) currentQuote = MOTIVATIONAL_QUOTES[75];
    else if (percent >= 50) currentQuote = MOTIVATIONAL_QUOTES[50];
    else if (percent >= 25) currentQuote = MOTIVATIONAL_QUOTES[25];

    setMessage(planMessage, currentQuote, true);
  }
}

// 6. الربط مع Supabase Database
async function loadPlan() {
  const { data: plan, error: planError } = await sb
    .from('saving_plans')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (planError) { setMessage(planMessage, planError.message); return; }
  currentPlan = plan;

  if (!plan) { items = []; render(); return; }

  const { data: rows, error } = await sb
    .from('saving_items')
    .select('*')
    .eq('plan_id', plan.id)
    .order('position');

  if (error) { setMessage(planMessage, error.message); return; }

  items = rows || [];
  targetInput.value = plan.target_amount;
  render();
}

async function createPlan() {
  setMessage(planMessage, '');
  const amount = Number(targetInput.value);
  const boxesCount = boxesSelect ? Number(boxesSelect.value) : 100;

  if (!Number.isInteger(amount) || amount < boxesCount * 20) {
    setMessage(planMessage, `المبلغ يجب أن يكون رقماً صحيحاً ويبدأ من ${money(boxesCount * 20)} لجدول الـ ${boxesCount} خانة.`);
    return;
  }

  const combo = makeCombination(amount, boxesCount);
  if (!combo) {
    setMessage(planMessage, 'تعذر تقسيم المبلغ على الخانات المحددة. اختر مبلغاً أكبر.');
    return;
  }

  // مسح الخطة القديمة إن وجدت
  const { data: oldPlans } = await sb.from('saving_plans').select('id').eq('user_id', currentUser.id);
  if (oldPlans?.length) {
    const { error: delErr } = await sb.from('saving_plans').delete().eq('user_id', currentUser.id);
    if (delErr) { setMessage(planMessage, delErr.message); return; }
  }

  // إنشاء الخطة الجديدة
  const { data: plan, error } = await sb
    .from('saving_plans')
    .insert({ user_id: currentUser.id, target_amount: amount })
    .select()
    .single();

  if (error) { setMessage(planMessage, error.message); return; }

  const rows = combo.map((d, i) => ({
    plan_id: plan.id,
    user_id: currentUser.id,
    denomination: d,
    position: i,
    checked: false
  }));

  const { error: itemErr } = await sb.from('saving_items').insert(rows);
  if (itemErr) { setMessage(planMessage, itemErr.message); return; }

  currentPlan = plan;
  await loadPlan();
  setMessage(planMessage, `تم إنشاء خطة الـ ${boxesCount} خانة بنجاح ✨ بالتوفيق يا بطل!`, true);
}

// التغيير السريع مع الحفظ في الخلفية
async function toggleItem(id) {
  const item = items.find(x => x.id === id);
  if (!item) return;

  const next = !item.checked;
  item.checked = next;
  render();

  const { error } = await sb
    .from('saving_items')
    .update({ checked: next })
    .eq('id', id)
    .eq('user_id', currentUser.id);

  if (error) {
    item.checked = !next; // التراجع في حالة وجود خطأ
    render();
    setMessage(planMessage, error.message);
  }
}

// 7. إدارة المصادقة (Auth) وتسجيل الدخول
async function login(mode) {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  setMessage(authMessage, '');

  if (mode === 'signup') {
    const { error } = await sb.auth.signUp({ email, password });
    if (error) { setMessage(authMessage, error.message); return; }
    setMessage(authMessage, 'تم إنشاء الحساب بنجاح! إذا طلبت منك المنصة التأكيد، افتح بريدك الإلكتروني.', true);
  } else {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) setMessage(authMessage, error.message);
  }
}

// تسجيل الدخول بـ Google
if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) setMessage(authMessage, error.message);
  });
}

// الأحداث (Event Listeners)
document.getElementById('authForm')?.addEventListener('submit', e => {
  e.preventDefault();
  login(e.submitter?.dataset.mode || 'login');
});

document.getElementById('logoutBtn')?.addEventListener('click', () => sb.auth.signOut());
document.getElementById('generateBtn')?.addEventListener('click', createPlan);
targetInput?.addEventListener('keydown', e => { if (e.key === 'Enter') createPlan(); });

// 8. التحكم في حالة الواجهة والجلسات
function showLoggedIn(user) {
  currentUser = user;
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  userArea.classList.remove('hidden');
  userEmail.textContent = user.email || user.user_metadata?.full_name || 'حساب Google';
  loadPlan();
}

function showLoggedOut() {
  currentUser = null;
  currentPlan = null;
  items = [];
  authView.classList.remove('hidden');
  appView.classList.add('hidden');
  userArea.classList.add('hidden');
}

sb.auth.onAuthStateChange((_event, session) => {
  if (session?.user) showLoggedIn(session.user);
  else showLoggedOut();
});

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) showLoggedIn(session.user);
  else showLoggedOut();
})();
