/* =========================================================
   تطبيق تحويشتي - Tahweesha (Master Edition)
   Multi-Plan, Moneypools with Legal Verification & Credits System
   ========================================================= */

const SUPABASE_URL = "https://iupgijqisikfsikgsjfg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fCADiUYIL0cs2c2QpcynEw_qmMc-qJ3";

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// عناصر الواجهة
const authView = document.getElementById('authView');
const appView = document.getElementById('appView');
const userArea = document.getElementById('userArea');
const userEmail = document.getElementById('userEmail');
const userCreditsDisplay = document.getElementById('userCreditsDisplay');
const streakDisplay = document.getElementById('streakDisplay');

const authMessage = document.getElementById('authMessage');
const planMessage = document.getElementById('planMessage');
const poolMessage = document.getElementById('poolMessage');

const tabButtons = document.querySelectorAll('.nav-btn, .sidebar-link, .mobile-nav-link');
const tabSections = document.querySelectorAll('.tab-content');

const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileNavOverlay = document.getElementById('mobileNavOverlay');
const mobileCloseBtn = document.getElementById('mobileCloseBtn');

const grid = document.getElementById('grid');
const emptyState = document.getElementById('emptyState');
const remainingEl = document.getElementById('remaining');
const targetTotalEl = document.getElementById('targetTotal');
const progressWrap = document.getElementById('progressWrap');
const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');
const targetInput = document.getElementById('targetAmount');
const boxesSelect = document.getElementById('boxesCount');
const plansList = document.getElementById('plansList');

const totalSavedStat = document.getElementById('totalSavedStat');
const activePlansStat = document.getElementById('activePlansStat');
const highestPlanStat = document.getElementById('highestPlanStat');

const poolsList = document.getElementById('poolsList');
const createPoolBtn = document.getElementById('createPoolBtn');
const poolDetailsModal = document.getElementById('poolDetailsModal');

const printPreviewModal = document.getElementById('printPreviewModal');
const confirmPrintBtn = document.getElementById('confirmPrintBtn');
const closePrintPreviewBtn = document.getElementById('closePrintPreviewBtn');

const copyPhoneBtn = document.getElementById('copyPhoneBtn');
const sendCreditReqBtn = document.getElementById('sendCreditReqBtn');
const creditHistoryList = document.getElementById('creditHistoryList');

const celebrationModal = document.getElementById('celebrationModal');
const closeCelebrationBtn = document.getElementById('closeCelebrationBtn');
const termsCheckbox = document.getElementById('termsCheckbox');

let currentUser = null;
let currentPlan = null;
let allPlans = [];
let items = [];
let userCredits = 20;
let userStreak = 0;
let celebrationShown = false;
let currentPools = [];

const MOTIVATIONAL_QUOTES = {
  0: "بداية الألف ميل تبدأ بخطوة واحدة! يلا نبدأ تحويش 🚀",
  25: "عاش يا بطل! قطعنا ربع الطريق بامتياز 💪",
  50: "وصلنا لنص الطريق! المجهود باين والمستقبل يلمع 🌟",
  75: "قربنا جداً من خط النهاية! عشت يا وحش 🎯",
  100: "ألف مبروك! حققت الهدف وجمعت تحويشتك كاملاً 👑🎉"
};

function money(n) {
  return `${Number(n || 0).toLocaleString('ar-EG')} ج`;
}

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

// قائمة الموبايل
function openMobileMenu() {
  if (!mobileNavOverlay) return;
  mobileNavOverlay.classList.add('open');
  document.body.classList.add('mobile-menu-open');
}

function closeMobileMenu() {
  if (!mobileNavOverlay) return;
  mobileNavOverlay.classList.remove('open');
  document.body.classList.remove('mobile-menu-open');
}

mobileMenuBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  if (mobileNavOverlay?.classList.contains('open')) closeMobileMenu();
  else openMobileMenu();
});

mobileCloseBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  closeMobileMenu();
});

mobileNavOverlay?.addEventListener('click', (e) => {
  if (e.target === mobileNavOverlay) closeMobileMenu();
});

// التنقل بين التبويبات
tabButtons?.forEach((btn) => {
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const targetTab = btn.getAttribute('data-tab');
    if (!targetTab) return;

    tabButtons.forEach((b) => b.classList.remove('active'));
    tabSections.forEach((s) => s.classList.add('hidden'));

    document.querySelectorAll(`[data-tab="${targetTab}"]`).forEach((b) => b.classList.add('active'));
    document.getElementById(`tab-${targetTab}`)?.classList.remove('hidden');

    if (btn.classList.contains('mobile-nav-link')) closeMobileMenu();

    if (targetTab === 'pools') await loadMoneypools();
    if (targetTab === 'credits') await loadCreditHistory();
    if (targetTab === 'dashboard') updateDashboardStats();
    if (targetTab === 'saving') {
      if (currentPlan) render();
      else if (currentUser) await loadAllPlans();
    }
  });
});

async function fetchUserCredits() {
  if (!currentUser) return;
  const { data } = await sb.from('savings_plans').select('user_credits').eq('user_id', currentUser.id).limit(1).maybeSingle();
  userCredits = data && data.user_credits !== undefined ? data.user_credits : 20;
  if (userCreditsDisplay) userCreditsDisplay.textContent = `${userCredits} كريدت`;
}

async function deductCredits(amount) {
  if (userCredits < amount) {
    alert(`عفواً رصيدك غير كافٍ. تحتاج إلى ${amount} كريدت.`);
    return false;
  }
  const newCredits = userCredits - amount;
  const { error } = await sb.from('savings_plans').update({ user_credits: newCredits }).eq('user_id', currentUser.id);
  if (error) return false;
  userCredits = newCredits;
  if (userCreditsDisplay) userCreditsDisplay.textContent = `${userCredits} كريدت`;
  return true;
}

// ==========================================
// خوارزمية دمج وتوزيع الفئات المختارة بدقة متناهية
// ==========================================
function makeCombination(total, targetBoxes, selectedDenoms) {
  if (!selectedDenoms || selectedDenoms.length === 0) {
    selectedDenoms = [10, 20, 50, 100];
  }
  
  selectedDenoms.sort((a, b) => a - b);
  const minAllowed = targetBoxes * selectedDenoms[0];
  const maxAllowed = targetBoxes * selectedDenoms[selectedDenoms.length - 1];

  if (total < minAllowed || total > maxAllowed) {
    return null;
  }

  let result = [];
  const baseVal = selectedDenoms[0];
  for (let i = 0; i < targetBoxes; i++) {
    result.push(baseVal);
  }

  let currentSum = result.reduce((a, b) => a + b, 0);
  let diff = total - currentSum;
  let safety = 0;

  while (diff > 0 && safety < 10000) {
    safety++;
    const idx = Math.floor(Math.random() * result.length);
    const curr = result[idx];
    
    // اختر فئة أعلى تساهم في تقليل الفارق
    const candidates = selectedDenoms.filter(d => d > curr && (d - curr) <= diff);
    if (candidates.length > 0) {
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      diff -= (chosen - curr);
      result[idx] = chosen;
    } else {
      // إذا تعذر إيجاد زيادة مناسبة، حاول توزيع فرق صغير عشوائياً
      const smallCandidates = selectedDenoms.filter(d => d > curr);
      if (smallCandidates.length > 0) {
        const chosen = smallCandidates[0];
        if ((chosen - curr) <= diff) {
          diff -= (chosen - curr);
          result[idx] = chosen;
        } else {
          break;
        }
      } else {
        break;
      }
    }
  }

  // مراجعة نهائية لتطابق المجموع بالضبط
  currentSum = result.reduce((a, b) => a + b, 0);
  if (currentSum !== total) {
    // تعديل خانة واحدة أخيرة لضبط المجموع بدقة
    const exactDiff = total - currentSum;
    result[0] += exactDiff;
    if (result[0] <= 0) return null;
  }

  return randomShuffle(result);
}

function render() {
  if (!grid) return;
  grid.innerHTML = '';
  renderPlansHeader();

  if (!items.length) {
    emptyState?.classList.remove('hidden');
    progressWrap?.classList.add('hidden');
    updateTotals();
    return;
  }

  emptyState?.classList.add('hidden');
  progressWrap?.classList.remove('hidden');

  items.forEach((item) => {
    const card = document.createElement('button');
    card.type = 'button';
    
    // ربط فئة اللون بالخانة تلقائياً
    const valClass = `val-${item.denomination}`;
    card.className = `saving-card ${valClass}` + (item.checked ? ' checked' : '');
    card.setAttribute('data-denom', item.denomination);

    card.innerHTML = `
      <div class="denom">
        ${item.denomination.toLocaleString('ar-EG')}
        <small> جنيه</small>
      </div>
      <div class="check-text">
        ${item.checked ? 'تم التحويش ✓' : 'اضغط للتعليم ✓'}
      </div>
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
    const isSelected = currentPlan?.id === p.id;
    const planSaved = Number(p.current_amount || 0);
    const planTarget = Number(p.target_amount || 1);
    const planPercent = Math.min(100, Math.round((planSaved / planTarget) * 100));

    card.style.cssText = `
      background: ${isSelected ? 'rgba(37, 99, 235, 0.15)' : 'rgba(30, 41, 59, 0.7)'};
      border: 1px solid ${isSelected ? '#3b82f6' : 'rgba(255,255,255,0.08)'};
      padding: 14px;
      border-radius: 14px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span style="color: #facc15; font-size: 0.9rem; font-weight: 700;">🎯 ${p.title || `تحويشة #${i + 1}`}</span>
          <div style="color: #fff; font-size: 1.1rem; font-weight: 700; margin-top:2px;">${money(p.target_amount)}</div>
        </div>
        <div style="display:flex; gap:6px;">
          ${!isSelected ? `<button type="button" onclick="switchPlan('${p.id}')" style="background:#2563eb; color:#fff; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-size:0.8rem;">فتح 🔓</button>` : `<span style="background:rgba(34,197,94,0.2); color:#4ade80; padding:4px 8px; border-radius:6px; font-size:0.75rem;">نشط ✨</span>`}
          <button type="button" onclick="deletePlan('${p.id}')" style="background:rgba(239, 68, 68, 0.2); color:#f87171; border:none; padding:6px 10px; border-radius:8px; cursor:pointer;">🗑️</button>
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#94a3b8;">
        <span>تم تحويش: ${money(planSaved)}</span>
        <span style="color:#34d399; font-weight:bold;">${planPercent}%</span>
      </div>
      <div style="background:rgba(255,255,255,0.1); height:6px; border-radius:3px; overflow:hidden;">
        <div style="background: linear-gradient(90deg, #10b981, #34d399); width:${planPercent}%; height:100%;"></div>
      </div>
    `;
    plansList.appendChild(card);
  });
}

function updateTotals() {
  const target = Number(currentPlan?.target_amount || 0);
  const saved = items.filter((x) => x.checked).reduce((s, x) => s + Number(x.denomination), 0);
  const remaining = Math.max(0, target - saved);
  const percent = target ? Math.min(100, Math.round((saved / target) * 100)) : 0;

  if (remainingEl) remainingEl.textContent = money(remaining);
  if (targetTotalEl) targetTotalEl.textContent = money(target);
  if (progressPercent) progressPercent.textContent = `${percent}%`;
  if (progressBar) progressBar.style.width = `${percent}%`;

  if (percent >= 100) {
    progressBar?.classList.add('completed-gold');
    if (!celebrationShown && items.length > 0) {
      celebrationModal?.classList.remove('hidden');
      celebrationShown = true;
    }
  } else {
    progressBar?.classList.remove('completed-gold');
    celebrationShown = false;
  }
}

function updateDashboardStats() {
  let totalSavedSum = 0;
  let totalTargetSum = 0;
  let maxTarget = 0;

  allPlans.forEach((p) => {
    totalSavedSum += Number(p.current_amount || 0);
    totalTargetSum += Number(p.target_amount || 0);
    if (Number(p.target_amount) > maxTarget) maxTarget = Number(p.target_amount);
  });

  if (totalSavedStat) totalSavedStat.textContent = money(totalSavedSum);
  if (activePlansStat) activePlansStat.textContent = allPlans.length.toString();
  if (highestPlanStat) highestPlanStat.textContent = money(maxTarget);
  if (streakDisplay) streakDisplay.textContent = `${userStreak} يوم 🔥`;
}

async function loadAllPlans() {
  const { data: plans } = await sb.from('savings_plans').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
  allPlans = plans || [];
  updateDashboardStats();
  if (!allPlans.length) {
    currentPlan = null;
    items = [];
    render();
    return;
  }
  if (!currentPlan || !allPlans.find((p) => p.id === currentPlan.id)) currentPlan = allPlans[0];
  await loadPlanItems(currentPlan.id);
}

async function loadPlanItems(planId) {
  const { data: rows } = await sb.from('savings_items').select('*').eq('plan_id', planId).order('position');
  items = rows || [];
  celebrationShown = false;
  render();
}

window.switchPlan = async function (planId) {
  currentPlan = allPlans.find((p) => p.id === planId);
  if (currentPlan) await loadPlanItems(planId);
};

async function createPlan() {
  setMessage(planMessage, '');

  const amount = Number(targetInput.value);
  const boxesCount = boxesSelect ? Number(boxesSelect.value) : 100;

  // جلب الفئات المفعلة من الأزرار الجديدة
  const checkedBoxes = document.querySelectorAll('input[name="boxDenom"]:checked');
  let selectedDenoms = Array.from(checkedBoxes).map(cb => Number(cb.value));

  if (selectedDenoms.length === 0) {
    setMessage(planMessage, 'يرجى اختيار فئة واحدة على الأقل لعمل الجدول!');
    return;
  }

  if (allPlans.length >= 1) {
    if (!confirm('الخطة الأولى مجانية! إنشاء خطة إضافية جديدة يستهلك 30 كريدت.')) return;
    if (!await deductCredits(30)) return;
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    setMessage(planMessage, 'يرجى إدخال مبلغ صحيح.');
    return;
  }

  const combo = makeCombination(amount, boxesCount, selectedDenoms);

  if (!combo) {
    const minM = boxesCount * Math.min(...selectedDenoms);
    const maxM = boxesCount * Math.max(...selectedDenoms);
    setMessage(planMessage, `المبلغ غير مناسب لعدد الخانات والفئات المختارة! يجب أن يكون بين ${money(minM)} و ${money(maxM)}.`);
    return;
  }

  const title = prompt('اكتب اسم التحويشة (مثلاً: موبايل جديد / سفرية):') || `تحويشة ${amount} ج`;

  const { data: plan, error } = await sb.from('savings_plans').insert({
    user_id: currentUser.id,
    title: title.trim(),
    target_amount: amount,
    current_amount: 0,
    user_credits: userCredits
  }).select().single();

  if (error) return setMessage(planMessage, error.message);

  const rows = combo.map((d, i) => ({
    plan_id: plan.id,
    user_id: currentUser.id,
    denomination: d,
    position: i,
    checked: false
  }));

  const { error: itemErr } = await sb.from('savings_items').insert(rows);
  if (itemErr) return setMessage(planMessage, itemErr.message);

  currentPlan = plan;
  await loadAllPlans();
  setMessage(planMessage, 'تم إنشاء خطتك بنجاح ✨', true);
}

async function toggleItem(id) {
  const item = items.find((x) => x.id === id);
  if (!item) return;

  const next = !item.checked;
  item.checked = next;
  const saved = items.filter((x) => x.checked).reduce((s, x) => s + Number(x.denomination), 0);
  render();

  await sb.from('savings_items').update({ checked: next }).eq('id', id).eq('user_id', currentUser.id);
  await sb.from('savings_plans').update({ current_amount: saved }).eq('id', currentPlan.id);
  if (currentPlan) currentPlan.current_amount = saved;
  updateDashboardStats();
}

window.deletePlan = async function (planId) {
  if (!confirm('هل أنت تأكد من حذف هذه التحويشة؟')) return;
  await sb.from('savings_plans').delete().eq('id', planId).eq('user_id', currentUser.id);
  await loadAllPlans();
};

// المصادقة
async function login(mode) {
  const email = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;
  setMessage(authMessage, '');

  if (!email || !password) return setMessage(authMessage, 'املأ البيانات بشكل صحيح');

  if (mode === 'signup') {
    if (!termsCheckbox?.checked) return setMessage(authMessage, 'يجب الموافقة على الشروط');
    const { error } = await sb.auth.signUp({ email, password });
    if (error) return setMessage(authMessage, error.message);
    await sb.auth.signInWithPassword({ email, password });
  } else {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) setMessage(authMessage, 'البريد أو كلمة المرور غير صحيحة');
  }
}

document.getElementById('authForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  login(e.submitter?.dataset?.mode || 'login');
});

document.getElementById('logoutBtn')?.addEventListener('click', () => sb.auth.signOut());
document.getElementById('generateBtn')?.addEventListener('click', createPlan);
closeCelebrationBtn?.addEventListener('click', () => celebrationModal?.classList.add('hidden'));

async function showLoggedIn(user) {
  currentUser = user;
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  userArea.classList.remove('hidden');
  if (userEmail) userEmail.textContent = user.email;
  closeMobileMenu();
  await fetchUserCredits();
  await loadAllPlans();
}

function showLoggedOut() {
  currentUser = null;
  currentPlan = null;
  allPlans = [];
  items = [];
  closeMobileMenu();
  authView.classList.remove('hidden');
  appView.classList.add('hidden');
  userArea.classList.add('hidden');
}

sb.auth.onAuthStateChange((_, session) => {
  if (session?.user) showLoggedIn(session.user);
  else showLoggedOut();
});

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) showLoggedIn(session.user);
  else showLoggedOut();
})();
