/* =========================================================
   تطبيق تحويشتي - Tahweesha (Master Edition)
   Multi-Plan, Moneypools with Legal Verification & Credits System
   ========================================================= */

const SUPABASE_URL = "https://iupgijqisikfsikgsjfg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fCADiUYIL0cs2c2QpcynEw_qmMc-qJ3";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ==========================================
// 1. عناصر الواجهة (DOM Elements)
// ==========================================
const authView = document.getElementById('authView');
const appView = document.getElementById('appView');
const userArea = document.getElementById('userArea');
const userEmail = document.getElementById('userEmail');
const userCreditsDisplay = document.getElementById('userCreditsDisplay');
const streakDisplay = document.getElementById('streakDisplay');

const authMessage = document.getElementById('authMessage');
const planMessage = document.getElementById('planMessage');
const poolMessage = document.getElementById('poolMessage');

// القائمة الجانبية (Sidebar) والتبويبات
const sidebarNav = document.getElementById('sidebarNav');
const tabButtons = document.querySelectorAll('.sidebar-link');
const tabSections = document.querySelectorAll('.tab-content');

// عناصر التحويش
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

// إحصائيات بصرية
const totalSavedStat = document.getElementById('totalSavedStat');
const activePlansStat = document.getElementById('activePlansStat');
const highestPlanStat = document.getElementById('highestPlanStat');

// الجمعيات (Moneypools)
const poolsList = document.getElementById('poolsList');
const createPoolBtn = document.getElementById('createPoolBtn');
const poolDetailsModal = document.getElementById('poolDetailsModal');

// المعاينة والطباعة
const printPreviewModal = document.getElementById('printPreviewModal');
const confirmPrintBtn = document.getElementById('confirmPrintBtn');
const closePrintPreviewBtn = document.getElementById('closePrintPreviewBtn');

// شراء الكريدت
const copyPhoneBtn = document.getElementById('copyPhoneBtn');
const sendCreditReqBtn = document.getElementById('sendCreditReqBtn');
const creditHistoryList = document.getElementById('creditHistoryList');

// النوافذ المنبثقة والإنعاش
const celebrationModal = document.getElementById('celebrationModal');
const closeCelebrationBtn = document.getElementById('closeCelebrationBtn');
const termsCheckbox = document.getElementById('termsCheckbox');

// ==========================================
// 2. المتغيرات العامة (State Management)
// ==========================================
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

// ==========================================
// 3. الدوال المساعدة (Helpers)
// ==========================================
function money(n) { return `${Number(n || 0).toLocaleString('ar-EG')} ج`; }

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

// ==========================================
// 4. إدارة القائمة الجانبية (Sidebar & Tabs)
// ==========================================
tabButtons?.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const targetTab = btn.getAttribute('data-tab');

    tabButtons.forEach(b => b.classList.remove('active'));
    tabSections.forEach(s => s.classList.add('hidden'));

    btn.classList.add('active');
    const activeSection = document.getElementById(`tab-${targetTab}`);
    if (activeSection) activeSection.classList.remove('hidden');

    // تحميل داتا خاصة بالتاب
    if (targetTab === 'pools') loadMoneypools();
    if (targetTab === 'credits') loadCreditHistory();
    if (targetTab === 'dashboard') updateDashboardStats();
  });
});

// ==========================================
// 5. نظام الكريدت ورصيد الحساب (Credits System)
// ==========================================
async function fetchUserCredits() {
  if (!currentUser) return;
  const { data, error } = await sb
    .from('savings_plans')
    .select('user_credits')
    .eq('user_id', currentUser.id)
    .limit(1)
    .maybeSingle();

  if (data && data.user_credits !== undefined) {
    userCredits = data.user_credits;
  } else {
    userCredits = 20; // الافتراضي للحساب الجديد
  }

  if (userCreditsDisplay) userCreditsDisplay.textContent = `${userCredits} كريدت`;
}

async function deductCredits(amount, reason = '') {
  if (userCredits < amount) {
    alert(`عفواً! رصيدك غير كافٍ. تحتاج إلى ${amount} كريدت لتنفيذ هذه العملية. يمكنك الشحن من تاب "شراء الكريدت".`);
    return false;
  }

  const newCredits = userCredits - amount;
  const { error } = await sb
    .from('savings_plans')
    .update({ user_credits: newCredits })
    .eq('user_id', currentUser.id);

  if (error) {
    console.error('فشل خصم الكريدت:', error.message);
    return false;
  }

  userCredits = newCredits;
  if (userCreditsDisplay) userCreditsDisplay.textContent = `${userCredits} كريدت`;
  return true;
}

// ==========================================
// 6. خوارزمية تقسيم مبالغ التحويش
// ==========================================
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

// ==========================================
// 7. عرض الجداول وتحديث الواجهة (Render Engine)
// ==========================================
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

  if (items.length > 0) {
    let currentQuote = MOTIVATIONAL_QUOTES[0];
    if (percent >= 100) currentQuote = MOTIVATIONAL_QUOTES[100];
    else if (percent >= 75) currentQuote = MOTIVATIONAL_QUOTES[75];
    else if (percent >= 50) currentQuote = MOTIVATIONAL_QUOTES[50];
    else if (percent >= 25) currentQuote = MOTIVATIONAL_QUOTES[25];

    setMessage(planMessage, currentQuote, true);
  }
}

function updateDashboardStats() {
  let totalSavedSum = 0;
  let maxTarget = 0;

  allPlans.forEach(p => {
    totalSavedSum += Number(p.current_amount || 0);
    if (Number(p.target_amount) > maxTarget) maxTarget = Number(p.target_amount);
  });

  if (totalSavedStat) totalSavedStat.textContent = money(totalSavedSum);
  if (activePlansStat) activePlansStat.textContent = allPlans.length.toString();
  if (highestPlanStat) highestPlanStat.textContent = money(maxTarget);
  if (streakDisplay) streakDisplay.textContent = `🔥 ${userStreak} يوم متتالي`;
}

// ==========================================
// 8. تحميل وإنشاء جداول التحويش (Plans Logic)
// ==========================================
async function loadAllPlans() {
  const { data: plans, error } = await sb
    .from('savings_plans')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) { setMessage(planMessage, error.message); return; }

  allPlans = plans || [];
  updateDashboardStats();

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

  // 1. الخطة الأولى مجانية، والخطة الإضافية بـ 30 كريدت
  if (allPlans.length >= 1) {
    const confirmDeduct = confirm('الخطة الأولى مجانية! إنشاء خطة إضافية جديدة يستهلك 30 كريدت. هل تريد المتابعة؟');
    if (!confirmDeduct) return;

    const success = await deductCredits(30, 'إنشاء خطة تحويشة جديدة');
    if (!success) return;
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

  const userInputTitle = prompt('اكتب اسم التحويشة (مثلاً: موبايل جديد / سفرية العيد):');
  const finalTitle = userInputTitle && userInputTitle.trim() !== '' ? userInputTitle.trim() : `تحويشة ${amount} ج`;

  const { data: plan, error } = await sb
    .from('savings_plans')
    .insert({ 
      user_id: currentUser.id, 
      title: finalTitle,
      target_amount: amount, 
      current_amount: 0,
      user_credits: userCredits
    })
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
  updateDashboardStats();
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
  setMessage(planMessage, 'تم حذف التحويشة بنجاح! 🚀', true);
};

// ==========================================
// 9. وضع المعاينة والطباعة (Print & Preview)
// ==========================================
document.getElementById('previewPrintBtn')?.addEventListener('click', () => {
  if (!currentPlan || !items.length) {
    alert('اختر خطة تحويشة قائمة أولاً لتظهر لك المعاينة.');
    return;
  }

  const previewContent = document.getElementById('printPreviewContent');
  if (!previewContent) return;

  previewContent.innerHTML = `
    <div style="text-align:center; padding: 20px; font-family: sans-serif;">
      <h2>جدول تحويشتي - ${currentPlan.title}</h2>
      <p>الهدف الإجمالي: <strong>${money(currentPlan.target_amount)}</strong> | خانات: <strong>${items.length}</strong></p>
      <hr style="margin: 15px 0; border: 0.5px solid #ccc;" />
      <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
        ${items.map(it => `
          <div style="border: 1px solid #000; padding: 10px; border-radius: 6px; width: 70px; text-align: center;">
            <strong>${it.denomination} ج</strong>
            <br/><small>${it.checked ? '[✓]' : '[  ]'}</small>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  printPreviewModal?.classList.remove('hidden');
});

closePrintPreviewBtn?.addEventListener('click', () => printPreviewModal?.classList.add('hidden'));

confirmPrintBtn?.addEventListener('click', async () => {
  const ok = confirm('الطباعة تستهلك 10 كريدتس. هل تود الاستمرار وتوليد الملف؟');
  if (!ok) return;

  const success = await deductCredits(10, 'طباعة جدول التحويشة');
  if (!success) return;

  printPreviewModal?.classList.add('hidden');
  window.print();
});

// ==========================================
// 10. نظام الجمعيات التوثيقي (Moneypools Logic)
// ==========================================
async function loadMoneypools() {
  if (!currentUser) return;
  setMessage(poolMessage, '');

  const { data: pools, error } = await sb
    .from('moneypools')
    .select(`
      *,
      moneypool_members (*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    setMessage(poolMessage, 'حدث خطأ أثناء تحميل الجمعيات: ' + error.message);
    return;
  }

  currentPools = pools || [];
  renderMoneypools();
}

function renderMoneypools() {
  if (!poolsList) return;
  poolsList.innerHTML = '';

  if (!currentPools.length) {
    poolsList.innerHTML = '<p class="empty-text">لا توجد جمعيات قائمة حالياً. أنشئ جمعيتك الأولى وانقل المعاملات لمستوى رسمي ومحمي!</p>';
    return;
  }

  currentPools.forEach(pool => {
    const isOwner = pool.owner_id === currentUser.id;
    const card = document.createElement('div');
    card.className = 'pool-card';
    card.style.cssText = `
      background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px; padding: 16px; margin-bottom: 16px;
    `;

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="color:#facc15; margin:0;">${pool.title} ${isOwner ? '<span style="font-size:0.7rem; background:#3b82f6; color:#fff; padding:2px 6px; border-radius:4px;">صاحب الجمعية</span>' : ''}</h3>
        <span style="color:#86efac; font-weight:bold;">${money(pool.installment_amount)} / ${pool.cycle_period}</span>
      </div>
      <p style="color:#94a3b8; font-size:0.85rem; margin: 8px 0;">عدد الأعضاء: ${pool.moneypool_members?.length || 0} عضو</p>
      <button onclick="openPoolDetails('${pool.id}')" class="primary-btn" style="width:100%; margin-top:10px;">عرض التفاصيل والدفع والتوثيق 📜</button>
    `;
    poolsList.appendChild(card);
  });
}

createPoolBtn?.addEventListener('click', async () => {
  const title = prompt('ادخل اسم الجمعية (مثال: جمعية الأصحاب / جمعية العيلة):');
  if (!title) return;

  const amount = prompt('ادخل مبلغ القسط لكل عضو (مثال: 500):');
  if (!amount || isNaN(amount)) return;

  const nationalId = prompt('ادخل رقمك القومي المكون من 14 رقم (للتوثيق والالتزام القانوني):');
  if (!nationalId || nationalId.length !== 14) {
    alert('الرقم القومي يجب أن يتكون من 14 رقم بالضبط!');
    return;
  }

  const period = prompt('اختر دورة الدفع (أسبوع / أسبوعين / شهر):', 'شهر');

  const { data: pool, error } = await sb
    .from('moneypools')
    .insert({
      owner_id: currentUser.id,
      owner_national_id: nationalId,
      title: title,
      installment_amount: Number(amount),
      cycle_period: period || 'شهر'
    })
    .select()
    .single();

  if (error) return alert('حدث خطأ أثناء إدراج الجمعية: ' + error.message);

  // إدراج صاحب الجمعية كعضو أول تلقائياً
  await sb.from('moneypool_members').insert({
    pool_id: pool.id,
    user_id: currentUser.id,
    username: currentUser.email.split('@')[0],
    national_id: nationalId,
    payout_method: 'نقداً / محفظة',
    payout_number_or_account: 'حساب الأدمن',
    role: 'editor'
  });

  alert('تم إنشاء الجمعية التوثيقية بنجاح! يمكنك الآن إضافة الأصدقاء عن طريق اسم المستخدم (Username).');
  loadMoneypools();
});

window.openPoolDetails = async function(poolId) {
  const pool = currentPools.find(p => p.id === poolId);
  if (!pool) return;

  const isOwner = pool.owner_id === currentUser.id;
  const modalContent = document.getElementById('poolModalDetailsContent');
  if (!modalContent) return;

  modalContent.innerHTML = `
    <div style="padding: 10px; font-family: sans-serif;">
      <h2>تفاصيل جمعية: ${pool.title}</h2>
      <p style="color:#94a3b8;">مبلغ القسط: <strong>${money(pool.installment_amount)}</strong> (${pool.cycle_period})</p>
      
      ${isOwner ? `
        <div style="background: rgba(59,130,246,0.1); padding:10px; border-radius:8px; margin-bottom:15px;">
          <h4>إضافة عضو جديد للجمعية 👤</h4>
          <input type="text" id="addMemberUsername" placeholder="اسم المستخدم (Username)" style="padding:6px; margin-bottom:6px; width:100%;"/>
          <input type="text" id="addMemberNationalId" placeholder="الرقم القومي للعضو (14 رقم)" style="padding:6px; margin-bottom:6px; width:100%;"/>
          <input type="text" id="addMemberPayoutMethod" placeholder="طريقة الاستلام (فودافون كاش / بنك...)" style="padding:6px; margin-bottom:6px; width:100%;"/>
          <input type="text" id="addMemberPayoutAccount" placeholder="رقم المحفظة / الحساب للاستلام" style="padding:6px; margin-bottom:6px; width:100%;"/>
          <button onclick="addMemberToPool('${pool.id}')" style="background:#22c55e; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">إضافة العضو رسمياً</button>
        </div>
      ` : ''}

      <h3>جدول الأعضاء والدفع والتوثيق 📋</h3>
      <div style="overflow-x:auto;">
        <table style="width:100%; text-align:right; border-collapse:collapse; margin-top:10px; font-size:0.85rem;">
          <thead>
            <tr style="background:#334155; color:#fff;">
              <th style="padding:8px;">العضو</th>
              <th style="padding:8px;">الرقم القومي</th>
              <th style="padding:8px;">حالة دفع اليوم</th>
              <th style="padding:8px;">حالة الاستلام</th>
              <th style="padding:8px;">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${(pool.moneypool_members || []).map(m => `
              <tr style="border-bottom: 1px solid #475569;">
                <td style="padding:8px;">${m.username}</td>
                <td style="padding:8px;">${m.national_id}</td>
                <td style="padding:8px;">
                  ${m.payout_status ? 'تم القبض 👑' : 'منتظر دور الاستلام'}
                </td>
                <td style="padding:8px;">
                  ${m.payout_confirmed_by_member ? 'مؤكد وموثق ✅' : 'لم يستلم بعد'}
                </td>
                <td style="padding:8px;">
                  ${m.user_id === currentUser.id ? `
                    <button onclick="memberPayInstallment('${pool.id}', '${m.id}')" style="background:#3b82f6; color:#fff; border:none; padding:4px 8px; border-radius:4px;">سداد وإرفاق إثبات 📤</button>
                  ` : ''}
                  ${isOwner && !m.payout_status ? `
                    <button onclick="ownerHandoverPool('${pool.id}', '${m.id}')" style="background:#eab308; color:#fff; border:none; padding:4px 8px; border-radius:4px;">تسليم المبلغ 💰</button>
                  ` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <button onclick="exportPoolPDF('${pool.id}')" style="background:#0284c7; color:#fff; border:none; padding:10px 15px; border-radius:6px; width:100%; margin-top:15px; cursor:pointer;">تصدير تقرير PDF توثيقي للمقاضاة والإثبات 🖨️</button>
    </div>
  `;

  poolDetailsModal?.classList.remove('hidden');
};

window.addMemberToPool = async function(poolId) {
  const username = document.getElementById('addMemberUsername')?.value.trim();
  const nationalId = document.getElementById('addMemberNationalId')?.value.trim();
  const method = document.getElementById('addMemberPayoutMethod')?.value.trim();
  const account = document.getElementById('addMemberPayoutAccount')?.value.trim();

  if (!username || !nationalId || nationalId.length !== 14 || !method || !account) {
    alert('يرجى ملء جميع الحانات وتأكيد أن الرقم القومي مكون من 14 رقم!');
    return;
  }

  const { error } = await sb.from('moneypool_members').insert({
    pool_id: poolId,
    username: username,
    national_id: nationalId,
    payout_method: method,
    payout_number_or_account: account,
    role: 'viewer'
  });

  if (error) return alert('حدث خطأ في إضافة العضو: ' + error.message);

  alert('تم إضافة العضو بنجاح!');
  poolDetailsModal?.classList.add('hidden');
  loadMoneypools();
};

window.memberPayInstallment = async function(poolId, memberId) {
  const proofUrl = prompt('يرجى وضع رابط سكرين شوت التحويل أو صورة الإثبات:');
  if (!proofUrl) return alert('إرفاق الإثبات إجباري لضمان حقك وحق الجمعية!');

  const { error } = await sb.from('moneypool_payments').insert({
    pool_id: poolId,
    member_id: memberId,
    payment_date: new Date().toISOString().split('T')[0],
    paid_by_member: true,
    payment_proof_url: proofUrl,
    confirmed_by_owner: false
  });

  if (error) return alert('حدث خطأ أثناء تسجيل الدفع: ' + error.message);
  alert('تم تسجيل عملية الدفع وإرفاق السكرين شوت! ينتظر الآن تأكيد صاحب الجمعية.');
};

window.ownerHandoverPool = async function(poolId, memberId) {
  const proofUrl = prompt('ضع رابط صورة إثبات تسليم المبلغ كاملاً للعضو (صورة الفلوس / تحويل المحفظة):');
  if (!proofUrl) return alert('إرفاق صورة الإثبات إجباري لتأكيد تسليم المبلغ!');

  const { error } = await sb.from('moneypool_members').update({
    payout_status: true,
    payout_proof_url: proofUrl
  }).eq('id', memberId);

  if (error) return alert('حدث خطأ: ' + error.message);
  alert('تم تسجيل تسليم الجمعية! سيطلب النظام الآن من العضو تأكيد الاستلام رسمياً.');
  poolDetailsModal?.classList.add('hidden');
  loadMoneypools();
};

window.exportPoolPDF = function(poolId) {
  alert('جاري إعداد وتجميع التقرير التوثيقي المكتمل للطباعة أو الحفظ بصيغة PDF...');
  window.print();
};

// ==========================================
// 11. تاب شراء الكريدت عبر We Pay
// ==========================================
copyPhoneBtn?.addEventListener('click', () => {
  navigator.clipboard.writeText('01558488193');
  alert('تم نسخ رقم We Pay بنجاح: 01558488193 📋');
});

sendCreditReqBtn?.addEventListener('click', async () => {
  const senderPhone = document.getElementById('wePaySenderPhone')?.value.trim();
  const selectedPackage = document.querySelector('input[name="creditPack"]:checked')?.value;

  if (!currentUser) return alert('يرجى تسجيل الدخول أولاً.');
  if (!senderPhone || senderPhone.length < 11) return alert('يرجى إدخال رقم موبايل صحيح مكون من 11 رقم.');

  const { error } = await sb
    .from('premium_requests')
    .insert({
      user_id: currentUser.id,
      user_email: currentUser.email,
      amount: Number(selectedPackage || 20),
      sender_phone: senderPhone,
      status: 'pending'
    });

  if (error) return alert('حدث خطأ أثناء إرسال الطلب: ' + error.message);

  alert('تم إرسال طلب الشحن بنجاح! سيتم مراجعة التحويل وإضافة الكريدت لحسابك فور التأكد.');
  loadCreditHistory();
});

async function loadCreditHistory() {
  if (!currentUser || !creditHistoryList) return;

  const { data, error } = await sb
    .from('premium_requests')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    creditHistoryList.innerHTML = `<p class="error-text">خطأ أثناء التحميل: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    creditHistoryList.innerHTML = '<p class="empty-text">لا توجد طلبات شحن كريدت سابقة.</p>';
    return;
  }

  creditHistoryList.innerHTML = data.map(req => {
    let statusText = 'قيد المراجعة ⏳';
    let statusClass = 'pending';
    if (req.status === 'approved') {
      statusText = 'مُفعل وتم إضافة الكريدت ✓';
      statusClass = 'approved';
    }

    const dateStr = new Date(req.created_at).toLocaleDateString('ar-EG');
    return `
      <div class="history-item" style="background:rgba(30,41,59,0.5); padding:10px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between;">
        <div>
          <strong>طلب شحن بقيمة ${req.amount} ج.م</strong>
          <br/><small style="color:#94a3b8;">من رقم: ${req.sender_phone} بتاريخ (${dateStr})</small>
        </div>
        <span class="status-tag ${statusClass}">${statusText}</span>
      </div>
    `;
  }).join('');
}

// ==========================================
// 12. إدارة تسجيل الدخول وتوثيق الشروط
// ==========================================
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
    if (termsCheckbox && !termsCheckbox.checked) {
      return setMessage(authMessage, 'يجب الموافقة على الشروط والأحكام وبنود التوثيق القانوني وإنشاء الكريدت لتسجيل الحساب!');
    }

    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) return setMessage(authMessage, error.message);

    if (data?.user && data?.user?.identities?.length === 0) {
      return setMessage(authMessage, 'هذا البريد الإلكتروني مُسجل بالفعل! جرب تسجيل الدخول.');
    }

    const { error: signInErr } = await sb.auth.signInWithPassword({ email, password });
    if (signInErr) {
      setMessage(authMessage, 'تم إنشاء الحساب ومعك 20 كريدت هدايا! تفقد بريدك لتأكيده.', true);
    } else {
      setMessage(authMessage, 'تم إنشاء الحساب وحصولك على 20 كريدت مجانية! 🚀', true);
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

document.getElementById('authForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const submitter = e.submitter;
  const mode = submitter && submitter.dataset && submitter.dataset.mode ? submitter.dataset.mode : 'login';
  login(mode);
});

document.getElementById('logoutBtn')?.addEventListener('click', () => sb.auth.signOut());
document.getElementById('generateBtn')?.addEventListener('click', createPlan);
closeCelebrationBtn?.addEventListener('click', () => celebrationModal?.classList.add('hidden'));

// ==========================================
// 13. مراقبة حالة الجلسة والتطبيق
// ==========================================
async function showLoggedIn(user) {
  currentUser = user;
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  userArea.classList.remove('hidden');
  if (userEmail) userEmail.textContent = user.email || 'مستخدم';
  
  await fetchUserCredits();
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
