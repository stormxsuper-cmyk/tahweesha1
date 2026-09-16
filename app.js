/* =========================================================
   تطبيق تحويشتي - Tahweesha
   Multi-Plan Management & Persistent Database Logic
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
const plansList = document.getElementById('plansList');

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
let allPlans = [];
let items = [];
let isPremiumUser = false;
let celebrationShown = false;

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
  renderPlansHeader();
  
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

function renderPlansHeader() {
  if (!plansList) return;
  plansList.innerHTML = '';

  if (!allPlans.length) return;

  allPlans.forEach((p, i) => {
    const card = document.createElement('div');
    card.style.cssText = `
      background: ${currentPlan?.id === p.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(30, 41, 59, 0.7)'};
      border: 1px solid ${currentPlan?.id === p.id ? '#3b82f6' : 'rgba(255,255,255,0.1)'};
      padding: 12px 16px; border-radius: 12px; margin-bottom: 12px;
      display: flex; justify-content: space-between; align-items: center;
    `;

    const planTitle = p.title || `تحويشة #${i + 1}`;

    card.innerHTML = `
      <div>
        <div style="color: #facc15; font-size: 0.85rem; font-weight: bold; margin-bottom: 2px;">
          (${planTitle})
        </div>
        <strong style="color: #fff; font-size: 1.05rem;">${money(p.target_amount)}</strong>
        <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">تم تجميع: ${money(p.current_amount || 0)}</div>
      </div>
      <div>
        ${currentPlan?.id !== p.id ? `<button onclick="switchPlan('${p.id}')" class="ghost-btn" style="margin-left: 8px;">فتح</button>` : ''}
        <button onclick="deletePlan('${p.id}')" style="background: #ef4444; color: #fff; border:none; padding:6px 10px; border-radius:6px; cursor:pointer;">حذف 🗑️</button>
      </div>
    `;
    plansList.appendChild(card);
  });
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

async function loadAllPlans() {
  const { data: plans, error } = await sb
    .from('savings_plans')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) { setMessage(planMessage, error.message); return; }

  allPlans = plans || [];

  if (!allPlans.length) {
    currentPlan = null;
    items = [];
    render();
    return;
  }

  if (!currentPlan || !allPlans.find(p => p.id === currentPlan.id)) {
    currentPlan = allPlans[0];
  }

  await loadPlanItems(currentPlan.id);
}

async function loadPlanItems(planId) {
  const { data: rows, error } = await sb
    .from('savings_items')
    .select('*')
    .eq('plan_id', planId)
    .order('position');

  if (error) { setMessage(planMessage, error.message); return; }

  items = rows || [];
  celebrationShown = false;
  render();
}

window.switchPlan = async function(planId) {
  currentPlan = allPlans.find(p => p.id === planId);
  if (currentPlan) {
    await loadPlanItems(planId);
  }
};

async function createPlan() {
  setMessage(planMessage, '');
  const amount = Number(targetInput.value);
  const boxesCount = boxesSelect ? Number(boxesSelect.value) : 100;

  // 1. فحص شرط الحساب المجاني
  if (allPlans.length >= 1 && !isPremiumUser) {
    setMessage(planMessage, 'الحساب المجاني يسمح بتحويشة واحدة فقط! يمكنك مسح التحويشة الحالية لإنشاء واحدة جديدة، أو ترقية حسابك.');
    return;
  }

  if (!Number.isInteger(amount) || amount < boxesCount * 20) {
    setMessage(planMessage, `المبلغ يجب أن يكون رقماً صحيحاً ويبدأ من ${money(boxesCount * 20)} لجدول الـ ${boxesCount} خانة.`);
    return;
  }

  const combo = makeCombination(amount, boxesCount);
  if (!combo) {
    setMessage(planMessage, 'تعذر تقسيم المبلغ على الخانات المحددة. اختر مبلغاً أكبر.');
    return;
  }

  // سؤال المستخدم عن اسم التحويشة
  const userInputTitle = prompt('اكتب اسم التحويشة (مثلاً: موبايل جديد / سفرية العيد):');
  const finalTitle = userInputTitle && userInputTitle.trim() !== '' ? userInputTitle.trim() : `تحويشة ${amount} ج`;

  // 2. إدراج التحويشة في جدول savings_plans مع اسم التحويشة
  const { data: plan, error } = await sb
    .from('savings_plans')
    .insert({ 
      user_id: currentUser.id, 
      title: finalTitle,
      target_amount: amount, 
      current_amount: 0 
    })
    .select()
    .single();

  if (error) { setMessage(planMessage, error.message); return; }

  // 3. إدراج الخانات في جدول savings_items
  const rows = combo.map((d, i) => ({
    plan_id: plan.id,
    user_id: currentUser.id,
    denomination: d,
    position: i,
    checked: false
  }));

  const { error: itemErr } = await sb.from('savings_items').insert(rows);
  if (itemErr) { setMessage(planMessage, itemErr.message); return; }

  currentPlan = plan;
  await loadAllPlans();
  setMessage(planMessage, `تم إنشاء خطة (${finalTitle}) بنجاح ✨ بالتوفيق يا بطل!`, true);
}

async function toggleItem(id) {
  const item = items.find(x => x.id === id);
  if (!item) return;

  const next = !item.checked;
  item.checked = next;

  const saved = items.filter(x => x.checked).reduce((s, x) => s + Number(x.denomination), 0);

  render();

  const { error } = await sb
    .from('savings_items')
    .update({ checked: next })
    .eq('id', id)
    .eq('user_id', currentUser.id);

  if (error) {
    item.checked = !next;
    render();
    setMessage(planMessage, error.message);
    return;
  }

  await sb
    .from('savings_plans')
    .update({ current_amount: saved })
    .eq('id', currentPlan.id);

  if (currentPlan) currentPlan.current_amount = saved;
}

window.deletePlan = async function(planId) {
  if (!confirm('هل أنت تأكد من حذف هذه التحويشة؟')) return;

  const { error } = await sb
    .from('savings_plans')
    .delete()
    .eq('id', planId)
    .eq('user_id', currentUser.id);

  if (error) {
    alert('حدث خطأ أثناء الحذف: ' + error.message);
    return;
  }

  await loadAllPlans();
  setMessage(planMessage, 'تم حذف التحويشة بنجاح، يمكنك الآن إنشاء تحويشة جديدة! 🚀', true);
};

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
    isPremiumUser = true;
    subBadge.className = 'sub-badge premium';
    subBadge.textContent = 'حساب بلس مُفعل 👑';
    subDescription.textContent = 'حسابك مميز حالياً! تتمتع بكافة الصلاحيات والمميزات.';
    upgradeBtn.style.display = 'none';
  } else {
    isPremiumUser = false;
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
    const { data, error } = await sb.auth.signUp({ email, password });

    if (error) return setMessage(authMessage, error.message);

    if (data?.user && data?.user?.identities?.length === 0) {
      return setMessage(authMessage, 'هذا البريد الإلكتروني مُسجل بالفعل! جرب تسجيل الدخول.');
    }

    const { error: signInErr } = await sb.auth.signInWithPassword({ email, password });
    
    if (signInErr) {
      setMessage(authMessage, 'تم إنشاء الحساب! تفقد بريدك الإلكتروني لتأكيد الحساب ثم سجل الدخول.', true);
    } else {
      setMessage(authMessage, 'تم إنشاء الحساب وتسجيل الدخول بنجاح! 🚀', true);
    }

  } else {
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

async function showLoggedIn(user) {
  currentUser = user;
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  userArea.classList.remove('hidden');
  userEmail.textContent = user.email || 'مستخدم';
  await loadSubscriptions();
  await loadAllPlans();
}

function showLoggedOut() {
  currentUser = null;
  currentPlan = null;
  allPlans = [];
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
