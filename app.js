/* =========================================================
   تطبيق تحويشتي - Tahweesha
   Full Logic + Glowing Effects & Completion Celebration
   ========================================================= */

const SUPABASE_URL = "https://iupgijqisikfsikgsjfg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fCADiUYIL0cs2c2QpcynEw_qmMc-qJ3";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// 1. عناصر الواجهة
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
const boxesSelect = document.getElementById('boxesCount');
const googleBtn = document.getElementById('googleBtn');

// التبويبات Tabs
const tabSavingBtn = document.getElementById('tabSavingBtn');
const tabSubBtn = document.getElementById('tabSubBtn');
const tabSaving = document.getElementById('tabSaving');
const tabSub = document.getElementById('tabSub');

// عناصر الاشتراكات
const subBadge = document.getElementById('subBadge');
const subDescription = document.getElementById('subDescription');
const subHistory = document.getElementById('subHistory');

// النافذة المنبثقة للترقية Modal
const premiumModal = document.getElementById('premiumModal');
const upgradeBtn = document.getElementById('upgradeBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const confirmPayBtn = document.getElementById('confirmPayBtn');

// نافذة التهنئة بالإنجاز Celebration Modal
const celebrationModal = document.getElementById('celebrationModal');
const closeCelebrationBtn = document.getElementById('closeCelebrationBtn');

let currentUser = null;
let currentPlan = null;
let items = [];
let celebrationShown = false; // لمنع تكرار فتح النافذة تلقائياً

const MOTIVATIONAL_QUOTES = {
  0: "بداية الألف ميل تبدأ بخطوة واحدة! يلا نبدأ تحويش 🚀",
  25: "عاش يا بطل! قطعنا ربع الطريق بامتياز 💪",
  50: "وصلنا لنص الطريق! المجهود باين والمستقبل يلمع 🌟",
  75: "قربنا جداً من خط النهاية! عشت يا وحش 🎯",
  100: "ألف مبروك! حققت الهدف وجمعت تحويشتك كاملاً 👑🎉"
};

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

// تبديل القوائم (Tabs)
tabSavingBtn?.addEventListener('click', () => {
  tabSavingBtn.classList.add('active');
  tabSubBtn.classList.remove('active');
  tabSaving.classList.remove('hidden');
  tabSub.classList.add('hidden');
});

tabSubBtn?.addEventListener('click', () => {
  tabSubBtn.classList.add('active');
  tabSavingBtn.classList.remove('active');
  tabSub.classList.remove('hidden');
  tabSaving.classList.add('hidden');
  loadSubscriptions();
});

// خوارزمية التوزيع
function makeCombination(total, targetBoxes) {
  if (total < targetBoxes * 20 || !Number.isInteger(total)) return null;

  let denoms = [20, 50, 100, 200, 250];
  if (total > 10000) denoms.push(300, 500);

  let counts = {
    20: Math.floor(targetBoxes * 0.30),
    50: Math.floor(targetBoxes * 0.20),
    100: Math.floor(targetBoxes * 0.20),
    200: Math.floor(targetBoxes * 0.15),
    250: Math.floor(targetBoxes * 0.15)
  };

  if (total > 10000) {
    counts[300] = Math.floor(targetBoxes * 0.05);
    counts[500] = Math.floor(targetBoxes * 0.05);
    counts[20] = Math.floor(targetBoxes * 0.25);
    counts[50] = Math.floor(targetBoxes * 0.15);
  }

  let currentBoxesCount = Object.values(counts).reduce((a, b) => a + b, 0);
  while (currentBoxesCount < targetBoxes) {
    counts[20]++;
    currentBoxesCount++;
  }

  let result = [];
  for (const [denom, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i++) {
      result.push(Number(denom));
    }
  }

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

  return randomShuffle(result);
}

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
    
    // ربط الفئة المالية بخاصية data-denom لتلوين الفئات
    card.setAttribute('data-denom', item.denomination);

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

  // تحويل لون الشريط إلى الذهبي المتوهج عند الوصول إلى 100%
  if (percent >= 100) {
    progressBar.classList.add('completed-gold');
    if (!celebrationShown && items.length > 0) {
      celebrationModal?.classList.remove('hidden');
      celebrationShown = true;
    }
  } else {
    progressBar.classList.remove('completed-gold');
    celebrationShown = false;
  }

  if (items.length > 0) {
    let currentQuote = MOTIVATIONAL_QUOTES[0];
    if (percent >= 100) currentQuote = MOTIVATIONAL_QUOTES[100];
    else if (percent >= 75) currentQuote = MOTIVATIONAL_QUOTES[75];
    else if (percent >= 50) currentQuote = MOTIVATIONAL_QUOTES[50];
    else if (percent >= 25) currentQuote = MOTIVATIONAL_QUOTES[25];

    setMessage(planMessage, currentQuote, true);
  }
}

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
  celebrationShown = false; // إعادة تعيين التنبيه للرحلة الجديدة
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

  const { data: oldPlans } = await sb.from('saving_plans').select('id').eq('user_id', currentUser.id);
  if (oldPlans?.length) {
    const { error: delErr } = await sb.from('saving_plans').delete().eq('user_id', currentUser.id);
    if (delErr) { setMessage(planMessage, delErr.message); return; }
  }

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
    item.checked = !next;
    render();
    setMessage(planMessage, error.message);
  }
}

// عرض تحميل بيانات الاشتراك وتحديث القائمة
async function loadSubscriptions() {
  if (!currentUser) return;

  const { data, error } = await sb
    .from('premium_requests')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    subHistory.innerHTML = `<p class="error-text">حدث خطأ أثناء تحميل الاشتراكات: ${error.message}</p>`;
    return;
  }

  const activeSub = data?.find(x => x.status === 'approved');

  if (activeSub) {
    subBadge.className = 'sub-badge premium';
    subBadge.textContent = 'حساب بلس مُفعل 👑';
    subDescription.textContent = 'حسابك مميز حالياً! تتمتع بكافة الصلاحيات والمميزات.';
    upgradeBtn.style.display = 'none';
  } else {
    subBadge.className = 'sub-badge free';
    subBadge.textContent = 'الحساب المجاني ⭐️';
    subDescription.textContent = 'أنت الآن على الخطة المجانية. يمكنك ترقية حسابك للحصول على مميزات إضافية.';
    upgradeBtn.style.display = 'inline-block';
  }

  if (!data || data.length === 0) {
    subHistory.innerHTML = '<p class="empty-text">لا توجد طلبات اشتراك سابقة.</p>';
    return;
  }

  subHistory.innerHTML = data.map(req => {
    let statusText = 'قيد المراجعة ⏳';
    let statusClass = 'pending';
    if (req.status === 'approved') {
      statusText = 'مُفعل ✓';
      statusClass = 'approved';
    }

    const dateStr = new Date(req.created_at).toLocaleDateString('ar-EG');
    return `
      <div class="history-item">
        <div>
          <strong>مبلغ ${req.amount} ج.م</strong>
          <small>رقم المحول: ${req.sender_phone} (${dateStr})</small>
        </div>
        <span class="status-tag ${statusClass}">${statusText}</span>
      </div>
    `;
  }).join('');
}

// فتح وإغلاق النوافذ
upgradeBtn?.addEventListener('click', () => premiumModal?.classList.remove('hidden'));
closeModalBtn?.addEventListener('click', () => premiumModal?.classList.add('hidden'));
closeCelebrationBtn?.addEventListener('click', () => celebrationModal?.classList.add('hidden'));

confirmPayBtn?.addEventListener('click', async () => {
  const selectedPlan = document.querySelector('input[name="plan"]:checked')?.value;
  const senderPhone = document.getElementById('senderPhone')?.value.trim();

  if (!currentUser) return alert('يرجى تسجيل الدخول أولاً.');
  if (!senderPhone || senderPhone.length < 11) return alert('يرجى إدخال رقم موبايل صحيح مكون من 11 رقم.');

  const { error } = await sb
    .from('premium_requests')
    .insert({
      user_id: currentUser.id,
      user_email: currentUser.email,
      amount: Number(selectedPlan),
      sender_phone: senderPhone,
      status: 'pending'
    });

  if (error) return alert('حدث خطأ أثناء الإرسال: ' + error.message);

  alert('تم إرسال الطلب بنجاح! سيتم مراجعة التحويل وتفعيل حسابك فور التأكد.');
  premiumModal?.classList.add('hidden');
  loadSubscriptions();
});

// إدارة تسجيل الدخول والإنشاء بشكل مباشر وصحيح
async function login(mode) {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  
  setMessage(authMessage, '');

  if (!email || !password) {
    return setMessage(authMessage, 'يرجى كتابة البريد الإلكتروني وكلمة المرور بشكل صحيح');
  }

  if (mode === 'signup') {
    // 1. محاولة إنشاء الحساب
    const { data, error } = await sb.auth.signUp({ email, password });

    if (error) {
      return setMessage(authMessage, error.message);
    }

    // التحقق من أن Supabase لم يرفض البريد المسجل سابقاً
    if (data?.user && data?.user?.identities?.length === 0) {
      return setMessage(authMessage, 'هذا البريد الإلكتروني مُسجل بالفعل! جرب تسجيل الدخول.');
    }

    // 2. تسجيل الدخول التلقائي فوراً بعد الإنشاء
    const { error: signInErr } = await sb.auth.signInWithPassword({ email, password });
    
    if (signInErr) {
      // في حال كان خيار Confirm Email لا يزال مفعلاً في Supabase
      setMessage(authMessage, 'تم إنشاء الحساب! تفقد بريدك الإلكتروني لتأكيد الحساب ثم سجل الدخول.', true);
    } else {
      setMessage(authMessage, 'تم إنشاء الحساب وتسجيل الدخول بنجاح! 🚀', true);
    }

  } else {
    // تسجيل الدخول العادي
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setMessage(authMessage, 'البريد أو كلمة المرور غير صحيحة، أو الحساب غير مفعل.');
      } else {
        setMessage(authMessage, error.message);
      }
    }
  }
}

if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) setMessage(authMessage, error.message);
  });
}

document.getElementById('authForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const submitter = e.submitter;
  const mode = submitter && submitter.dataset && submitter.dataset.mode ? submitter.dataset.mode : 'login';
  login(mode);
});

document.getElementById('logoutBtn')?.addEventListener('click', () => sb.auth.signOut());
document.getElementById('generateBtn')?.addEventListener('click', createPlan);

function showLoggedIn(user) {
  currentUser = user;
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  userArea.classList.remove('hidden');
  userEmail.textContent = user.email || 'مستخدم';
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
