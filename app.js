/* =========================================================
   تحويشتي - Tahweesha
   MASTER EDITION
   Supabase + Multi Plans + Tabs + Credits + Moneypools
   ========================================================= */

const SUPABASE_URL = "https://iupgijqisikfsikgsjfg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_fCADiUYIL0cs2c2QpcynEw_qmMc-qJ3";

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

/* =========================================================
   1. DOM
   ========================================================= */

const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const userArea = document.getElementById("userArea");

const userEmail = document.getElementById("userEmail");
const userCreditsDisplay = document.getElementById("userCreditsDisplay");
const streakDisplay = document.getElementById("streakDisplay");

const authMessage = document.getElementById("authMessage");
const planMessage = document.getElementById("planMessage");
const poolMessage = document.getElementById("poolMessage");

const sidebarLinks = document.querySelectorAll(".sidebar-link");
const bottomLinks = document.querySelectorAll(".bottom-nav-link");
const allTabButtons = document.querySelectorAll(
  ".sidebar-link, .bottom-nav-link"
);

const tabSections = document.querySelectorAll(".tab-content");
const bottomNav = document.getElementById("bottomNav");

const grid = document.getElementById("grid");
const emptyState = document.getElementById("emptyState");

const remainingEl = document.getElementById("remaining");
const targetTotalEl = document.getElementById("targetTotal");

const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");
const progressPercent = document.getElementById("progressPercent");

const targetInput = document.getElementById("targetAmount");
const boxesSelect = document.getElementById("boxesCount");
const plansList = document.getElementById("plansList");

const totalSavedStat = document.getElementById("totalSavedStat");
const activePlansStat = document.getElementById("activePlansStat");
const highestPlanStat = document.getElementById("highestPlanStat");

const poolsList = document.getElementById("poolsList");
const createPoolBtn = document.getElementById("createPoolBtn");

const poolDetailsModal = document.getElementById("poolDetailsModal");
const poolModalDetailsContent = document.getElementById(
  "poolModalDetailsContent"
);

const printPreviewModal = document.getElementById("printPreviewModal");
const printPreviewContent = document.getElementById("printPreviewContent");

const confirmPrintBtn = document.getElementById("confirmPrintBtn");
const closePrintPreviewBtn = document.getElementById(
  "closePrintPreviewBtn"
);

const copyPhoneBtn = document.getElementById("copyPhoneBtn");
const sendCreditReqBtn = document.getElementById("sendCreditReqBtn");
const creditHistoryList = document.getElementById("creditHistoryList");

const celebrationModal = document.getElementById("celebrationModal");
const closeCelebrationBtn = document.getElementById(
  "closeCelebrationBtn"
);

const termsCheckbox = document.getElementById("termsCheckbox");
const authForm = document.getElementById("authForm");
const logoutBtn = document.getElementById("logoutBtn");
const generateBtn = document.getElementById("generateBtn");

/* =========================================================
   2. STATE
   ========================================================= */

let currentUser = null;
let currentPlan = null;

let allPlans = [];
let items = [];

let userCredits = 20;
let userStreak = 0;

let celebrationShown = false;
let currentPools = [];

let activeTab = "dashboard";
let tabLoading = false;

const MOTIVATIONAL_QUOTES = {
  0: "بداية الألف ميل تبدأ بخطوة واحدة! يلا نبدأ تحويش 🚀",
  25: "عاش يا بطل! قطعنا ربع الطريق بامتياز 💪",
  50: "وصلنا لنص الطريق! المجهود باين والمستقبل يلمع 🌟",
  75: "قربنا جداً من خط النهاية! عشت يا وحش 🎯",
  100: "ألف مبروك! حققت الهدف وجمعت تحويشتك كاملاً 👑🎉"
};

/* =========================================================
   3. HELPERS
   ========================================================= */

function money(value) {
  return `${Number(value || 0).toLocaleString("ar-EG")} ج`;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setMessage(element, text, success = false) {
  if (!element) return;

  element.textContent = text || "";

  if (!text) {
    element.style.color = "";
    return;
  }

  element.style.color = success ? "#86efac" : "#f87171";
}

function shuffle(array) {
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function setButtonLoading(button, loading, loadingText = "جاري التحميل...") {
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText;
    button.style.opacity = "0.65";
    button.style.pointerEvents = "none";
  } else {
    button.disabled = false;
    button.textContent =
      button.dataset.originalText || button.textContent;
    button.style.opacity = "";
    button.style.pointerEvents = "";
  }
}

/* =========================================================
   4. TAB SYSTEM
   ========================================================= */

function getSavedTab() {
  try {
    const saved = localStorage.getItem("tahweesha_active_tab");

    const allowedTabs = [
      "dashboard",
      "saving",
      "pools",
      "credits"
    ];

    return allowedTabs.includes(saved) ? saved : "dashboard";
  } catch {
    return "dashboard";
  }
}

function saveActiveTab(tab) {
  try {
    localStorage.setItem("tahweesha_active_tab", tab);
  } catch {
    // تجاهل الخطأ لو LocalStorage غير متاح
  }
}

async function switchTab(tab, save = true) {
  const allowedTabs = [
    "dashboard",
    "saving",
    "pools",
    "credits"
  ];

  if (!allowedTabs.includes(tab)) {
    tab = "dashboard";
  }

  activeTab = tab;

  if (save) {
    saveActiveTab(tab);
  }

  /* إزالة Active من كل الأزرار */
  allTabButtons.forEach((button) => {
    const buttonTab = button.dataset.tab;
    const isActive = buttonTab === tab;

    button.classList.toggle("active", isActive);

    button.setAttribute(
      "aria-selected",
      isActive ? "true" : "false"
    );

    if (isActive) {
      button.setAttribute("tabindex", "0");
    } else {
      button.setAttribute("tabindex", "-1");
    }
  });

  /* إخفاء كل الصفحات */
  tabSections.forEach((section) => {
    const sectionTab = section.id.replace("tab-", "");

    section.classList.toggle(
      "hidden",
      sectionTab !== tab
    );

    section.setAttribute(
      "aria-hidden",
      sectionTab === tab ? "false" : "true"
    );
  });

  /* إظهار Bottom Nav فقط داخل التطبيق */
  if (bottomNav) {
    bottomNav.classList.remove("hidden");
  }

  /* تحميل بيانات التاب */
  if (currentUser) {
    if (tab === "dashboard") {
      updateDashboardStats();
    }

    if (tab === "saving") {
      if (currentPlan) {
        render();
      } else {
        await loadAllPlans();
      }
    }

    if (tab === "pools") {
      await loadMoneypools();
    }

    if (tab === "credits") {
      await loadCreditHistory();
    }
  }
}

/* ربط Sidebar + Mobile Bottom Nav */
allTabButtons.forEach((button) => {
  button.addEventListener("click", async (event) => {
    event.preventDefault();

    const tab = button.dataset.tab;

    if (!tab || tabLoading) return;

    tabLoading = true;

    try {
      await switchTab(tab);
    } finally {
      tabLoading = false;
    }
  });
});

/* =========================================================
   5. CREDITS
   ========================================================= */

async function fetchUserCredits() {
  if (!currentUser) return;

  /*
     نحاول الحصول على الكريدت من أول خطة.
     لو لا توجد خطة، نستخدم 20 كريدت.
  */

  const { data, error } = await sb
    .from("savings_plans")
    .select("user_credits")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!error && data && data.user_credits !== null) {
    userCredits = Number(data.user_credits);
  } else {
    userCredits = 20;
  }

  updateCreditsUI();
}

function updateCreditsUI() {
  if (userCreditsDisplay) {
    userCreditsDisplay.textContent = `${userCredits} كريدت`;
  }
}

async function deductCredits(amount, reason = "") {
  if (!currentUser) {
    alert("يجب تسجيل الدخول أولاً.");
    return false;
  }

  amount = Number(amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return false;
  }

  if (userCredits < amount) {
    alert(
      `رصيدك غير كافٍ.\n\nتحتاج ${amount} كريدت.\nرصيدك الحالي ${userCredits} كريدت.`
    );

    return false;
  }

  const newCredits = userCredits - amount;

  /*
     تحديث كل خطط المستخدم حتى يظل الرصيد متزامناً
     مع النظام الحالي.
  */

  const { error } = await sb
    .from("savings_plans")
    .update({
      user_credits: newCredits
    })
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Credit deduction error:", error);

    alert(
      "حدث خطأ أثناء خصم الكريدت. لم يتم الخصم."
    );

    return false;
  }

  userCredits = newCredits;
  updateCreditsUI();

  console.log(
    `Credits deducted: ${amount}`,
    reason
  );

  return true;
}

/* =========================================================
   6. SAVING COMBINATION
   ========================================================= */

function makeCombination(total, targetBoxes) {
  total = Number(total);
  targetBoxes = Number(targetBoxes);

  if (!Number.isInteger(total)) return null;

  if (total < targetBoxes * 20) {
    return null;
  }

  let denoms = [20, 50, 100, 200, 250];

  if (total > 10000) {
    denoms.push(300, 500);
  }

  let counts = {
    20: Math.floor(targetBoxes * 0.3),
    50: Math.floor(targetBoxes * 0.2),
    100: Math.floor(targetBoxes * 0.2),
    200: Math.floor(targetBoxes * 0.15),
    250: Math.floor(targetBoxes * 0.15)
  };

  if (total > 10000) {
    counts[300] = Math.floor(targetBoxes * 0.05);
    counts[500] = Math.floor(targetBoxes * 0.05);

    counts[20] = Math.floor(targetBoxes * 0.25);
    counts[50] = Math.floor(targetBoxes * 0.15);
  }

  let count = Object.values(counts)
    .reduce((a, b) => a + b, 0);

  while (count < targetBoxes) {
    counts[20]++;
    count++;
  }

  let result = [];

  for (const [denom, amount] of Object.entries(counts)) {
    for (let i = 0; i < amount; i++) {
      result.push(Number(denom));
    }
  }

  let currentSum = result.reduce(
    (sum, value) => sum + value,
    0
  );

  let diff = total - currentSum;

  let safety = 0;

  while (diff !== 0 && safety < 10000) {
    safety++;

    let changed = false;

    for (let i = 0; i < result.length; i++) {
      const current = result[i];

      if (diff > 0) {
        const next = denoms.find(
          (d) =>
            d > current &&
            d - current <= diff
        );

        if (next) {
          diff -= next - current;
          result[i] = next;
          changed = true;
          break;
        }
      }

      if (diff < 0) {
        const previous = [...denoms]
          .reverse()
          .find(
            (d) =>
              d < current &&
              current - d <= Math.abs(diff)
          );

        if (previous) {
          diff += current - previous;
          result[i] = previous;
          changed = true;
          break;
        }
      }
    }

    if (!changed) break;
  }

  if (diff !== 0) {
    return null;
  }

  return shuffle(result);
}

/* =========================================================
   7. RENDER
   ========================================================= */

function render() {
  if (!grid) return;

  grid.innerHTML = "";

  renderPlansHeader();

  if (!items.length) {
    emptyState?.classList.remove("hidden");
    progressWrap?.classList.add("hidden");

    updateTotals();
    return;
  }

  emptyState?.classList.add("hidden");
  progressWrap?.classList.remove("hidden");

  items.forEach((item) => {
    const card = document.createElement("button");

    card.type = "button";

    card.className =
      "saving-card" +
      (item.checked ? " checked" : "");

    card.dataset.id = item.id;

    card.innerHTML = `
      <div class="denom">
        ${Number(item.denomination).toLocaleString("ar-EG")}
        <small> جنيه</small>
      </div>

      <div class="check-text">
        ${
          item.checked
            ? "تم التحويش ✓"
            : "اضغط للتعليم ✓"
        }
      </div>
    `;

    card.addEventListener("click", () => {
      toggleItem(item.id);
    });

    grid.appendChild(card);
  });

  updateTotals();
}

/* =========================================================
   8. PLANS HEADER
   ========================================================= */

function renderPlansHeader() {
  if (!plansList) return;

  plansList.innerHTML = "";

  if (!allPlans.length) {
    return;
  }

  allPlans.forEach((plan, index) => {
    const card = document.createElement("div");

    const selected =
      currentPlan?.id === plan.id;

    const saved = Number(
      plan.current_amount || 0
    );

    const target = Number(
      plan.target_amount || 1
    );

    const percent = Math.min(
      100,
      Math.round((saved / target) * 100)
    );

    card.className =
      `plan-selector-card ${selected ? "selected" : ""}`;

    card.innerHTML = `
      <div class="plan-selector-top">

        <div class="plan-selector-info">
          <span class="plan-selector-title">
            🎯 ${escapeHTML(
              plan.title || `تحويشة #${index + 1}`
            )}
          </span>

          <strong>
            ${money(plan.target_amount)}
          </strong>
        </div>

        <div class="plan-selector-actions">

          ${
            !selected
              ? `
                <button
                  type="button"
                  class="plan-open-btn"
                  data-plan-id="${escapeHTML(plan.id)}"
                >
                  فتح 🔓
                </button>
              `
              : `
                <span class="plan-active-badge">
                  نشط الآن ✨
                </span>
              `
          }

          <button
            type="button"
            class="plan-delete-btn"
            data-delete-plan="${escapeHTML(plan.id)}"
          >
            🗑️
          </button>

        </div>

      </div>

      <div class="plan-progress-info">
        <span>
          تم تحويش: ${money(saved)}
        </span>

        <span>
          ${percent}%
        </span>
      </div>

      <div class="plan-progress">
        <div
          class="plan-progress-bar"
          style="width:${percent}%"
        ></div>
      </div>
    `;

    plansList.appendChild(card);
  });

  /* Open buttons */
  plansList
    .querySelectorAll(".plan-open-btn")
    .forEach((button) => {
      button.addEventListener("click", () => {
        switchPlan(button.dataset.planId);
      });
    });

  /* Delete buttons */
  plansList
    .querySelectorAll("[data-delete-plan]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        deletePlan(button.dataset.deletePlan);
      });
    });
}

/* =========================================================
   9. TOTALS
   ========================================================= */

function updateTotals() {
  const target = Number(
    currentPlan?.target_amount || 0
  );

  const saved = items
    .filter((item) => item.checked)
    .reduce(
      (sum, item) =>
        sum + Number(item.denomination),
      0
    );

  const remaining = Math.max(
    0,
    target - saved
  );

  const percent = target
    ? Math.min(
        100,
        Math.round((saved / target) * 100)
      )
    : 0;

  if (remainingEl) {
    remainingEl.textContent = money(remaining);
  }

  if (targetTotalEl) {
    targetTotalEl.textContent = money(target);
  }

  if (progressPercent) {
    progressPercent.textContent =
      `${percent}%`;
  }

  if (progressBar) {
    progressBar.style.width =
      `${percent}%`;
  }

  if (percent >= 100) {
    progressBar?.classList.add(
      "completed-gold"
    );

    if (
      !celebrationShown &&
      items.length > 0
    ) {
      celebrationModal?.classList.remove(
        "hidden"
      );

      celebrationShown = true;
    }
  } else {
    progressBar?.classList.remove(
      "completed-gold"
    );

    celebrationShown = false;
  }

  let quote =
    MOTIVATIONAL_QUOTES[0];

  if (percent >= 100) {
    quote = MOTIVATIONAL_QUOTES[100];
  } else if (percent >= 75) {
    quote = MOTIVATIONAL_QUOTES[75];
  } else if (percent >= 50) {
    quote = MOTIVATIONAL_QUOTES[50];
  } else if (percent >= 25) {
    quote = MOTIVATIONAL_QUOTES[25];
  }

  if (items.length) {
    setMessage(
      planMessage,
      quote,
      true
    );
  }
}

/* =========================================================
   10. DASHBOARD
   ========================================================= */

function updateDashboardStats() {
  let totalSaved = 0;
  let totalTarget = 0;
  let highestTarget = 0;

  allPlans.forEach((plan) => {
    totalSaved += Number(
      plan.current_amount || 0
    );

    totalTarget += Number(
      plan.target_amount || 0
    );

    highestTarget = Math.max(
      highestTarget,
      Number(plan.target_amount || 0)
    );
  });

  const percent =
    totalTarget > 0
      ? Math.min(
          100,
          Math.round(
            (totalSaved / totalTarget) * 100
          )
        )
      : 0;

  if (totalSavedStat) {
    totalSavedStat.textContent =
      money(totalSaved);
  }

  if (activePlansStat) {
    activePlansStat.textContent =
      String(allPlans.length);
  }

  if (highestPlanStat) {
    highestPlanStat.textContent =
      money(highestTarget);
  }

  if (streakDisplay) {
    streakDisplay.textContent =
      `🔥 ${userStreak} يوم`;
  }

  const totalSavedBar =
    document.getElementById(
      "totalSavedBar"
    );

  const totalSavedPercent =
    document.getElementById(
      "totalSavedPercent"
    );

  if (totalSavedBar) {
    totalSavedBar.style.width =
      `${percent}%`;
  }

  if (totalSavedPercent) {
    totalSavedPercent.textContent =
      `${percent}% من إجمالي الأهداف`;
  }
}

/* =========================================================
   11. LOAD PLANS
   ========================================================= */

async function loadAllPlans() {
  if (!currentUser) return;

  const { data, error } = await sb
    .from("savings_plans")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    console.error(error);

    setMessage(
      planMessage,
      "حدث خطأ أثناء تحميل التحويشات: " +
        error.message
    );

    return;
  }

  allPlans = data || [];

  if (!allPlans.length) {
    currentPlan = null;
    items = [];

    render();
    updateDashboardStats();

    return;
  }

  if (
    !currentPlan ||
    !allPlans.some(
      (plan) =>
        plan.id === currentPlan.id
    )
  ) {
    currentPlan = allPlans[0];
  } else {
    currentPlan =
      allPlans.find(
        (plan) =>
          plan.id === currentPlan.id
      ) || allPlans[0];
  }

  updateDashboardStats();

  await loadPlanItems(
    currentPlan.id
  );
}

async function loadPlanItems(planId) {
  if (!currentUser) return;

  const { data, error } = await sb
    .from("savings_items")
    .select("*")
    .eq("plan_id", planId)
    .eq("user_id", currentUser.id)
    .order("position", {
      ascending: true
    });

  if (error) {
    setMessage(
      planMessage,
      "حدث خطأ أثناء تحميل الخانات: " +
        error.message
    );

    return;
  }

  items = data || [];

  celebrationShown = false;

  render();
}

/* =========================================================
   12. SWITCH PLAN
   ========================================================= */

window.switchPlan = async function(planId) {
  const plan = allPlans.find(
    (item) =>
      String(item.id) ===
      String(planId)
  );

  if (!plan) return;

  currentPlan = plan;

  await loadPlanItems(plan.id);

  await switchTab(
    "saving",
    false
  );
};

/* =========================================================
   13. CREATE PLAN
   ========================================================= */

async function createPlan() {
  if (!currentUser) {
    alert("سجل الدخول أولاً.");
    return;
  }

  setMessage(planMessage, "");

  const amount = Number(
    targetInput?.value
  );

  const boxesCount = Number(
    boxesSelect?.value || 100
  );

  if (
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    setMessage(
      planMessage,
      "اكتب مبلغاً صحيحاً."
    );

    return;
  }

  if (
    amount <
    boxesCount * 20
  ) {
    setMessage(
      planMessage,
      `المبلغ يجب أن يكون ${money(
        boxesCount * 20
      )} على الأقل لعدد ${boxesCount} خانة.`
    );

    return;
  }

  /* تأكد من إمكانية التقسيم قبل الخصم */
  const combo =
    makeCombination(
      amount,
      boxesCount
    );

  if (!combo) {
    setMessage(
      planMessage,
      "تعذر تقسيم المبلغ على الخانات المحددة. جرّب مبلغاً آخر."
    );

    return;
  }

  /* تحديد الاسم */
  const titleInput = prompt(
    "اكتب اسم التحويشة:",
    `تحويشة ${amount} ج`
  );

  const finalTitle =
    titleInput?.trim() ||
    `تحويشة ${amount} ج`;

  let creditDeducted = false;

  /* الخطة الأولى مجانية */
  if (allPlans.length >= 1) {
    const accepted = confirm(
      "الخطة الأولى مجانية.\n\n" +
      "إنشاء خطة إضافية سيخصم 30 كريدت.\n\n" +
      "هل تريد الاستمرار؟"
    );

    if (!accepted) return;

    const success =
      await deductCredits(
        30,
        "إنشاء خطة إضافية"
      );

    if (!success) return;

    creditDeducted = true;
  }

  setButtonLoading(
    generateBtn,
    true,
    "جاري إنشاء الخطة..."
  );

  try {
    const { data: plan, error } =
      await sb
        .from("savings_plans")
        .insert({
          user_id: currentUser.id,
          title: finalTitle,
          target_amount: amount,
          current_amount: 0,
          user_credits: userCredits
        })
        .select()
        .single();

    if (error) {
      /*
         لو تم خصم الكريدت ثم فشل الإنشاء،
         نبلغ المستخدم ولا نحاول عمل Refund
         من الواجهة مباشرة.
      */

      console.error(error);

      if (creditDeducted) {
        alert(
          "تم خصم الكريدت لكن حدث خطأ أثناء إنشاء الخطة. راجع قاعدة البيانات أو نظام الإدارة."
        );
      }

      setMessage(
        planMessage,
        error.message
      );

      return;
    }

    const rows = combo.map(
      (denomination, position) => ({
        plan_id: plan.id,
        user_id: currentUser.id,
        denomination,
        position,
        checked: false
      })
    );

    const { error: itemError } =
      await sb
        .from("savings_items")
        .insert(rows);

    if (itemError) {
      console.error(itemError);

      setMessage(
        planMessage,
        "تم إنشاء الخطة لكن حدث خطأ أثناء إنشاء الخانات: " +
          itemError.message
      );

      return;
    }

    currentPlan = plan;

    await loadAllPlans();

    setMessage(
      planMessage,
      `تم إنشاء "${finalTitle}" بنجاح ✨`,
      true
    );

    if (targetInput) {
      targetInput.value = "";
    }

    await switchTab(
      "saving",
      false
    );
  } finally {
    setButtonLoading(
      generateBtn,
      false
    );
  }
}

/* =========================================================
   14. TOGGLE SAVING ITEM
   ========================================================= */

async function toggleItem(id) {
  if (!currentUser || !currentPlan) {
    return;
  }

  const item = items.find(
    (x) => String(x.id) === String(id)
  );

  if (!item) return;

  const oldValue = item.checked;
  const newValue = !oldValue;

  item.checked = newValue;

  /* Optimistic UI */
  render();

  const { error } = await sb
    .from("savings_items")
    .update({
      checked: newValue
    })
    .eq("id", id)
    .eq("user_id", currentUser.id);

  if (error) {
    item.checked = oldValue;

    render();

    setMessage(
      planMessage,
      "تعذر حفظ التغيير: " +
        error.message
    );

    return;
  }

  const saved = items
    .filter((x) => x.checked)
    .reduce(
      (sum, x) =>
        sum + Number(x.denomination),
      0
    );

  const { error: planError } =
    await sb
      .from("savings_plans")
      .update({
        current_amount: saved
      })
      .eq(
        "id",
        currentPlan.id
      )
      .eq(
        "user_id",
        currentUser.id
      );

  if (planError) {
    console.error(
      "Plan update error:",
      planError
    );
  }

  currentPlan.current_amount =
    saved;

  const index =
    allPlans.findIndex(
      (p) =>
        p.id === currentPlan.id
    );

  if (index !== -1) {
    allPlans[index].current_amount =
      saved;
  }

  updateDashboardStats();
}

/* =========================================================
   15. DELETE PLAN
   ========================================================= */

window.deletePlan = async function(planId) {
  if (!currentUser) return;

  const plan =
    allPlans.find(
      (p) =>
        String(p.id) ===
        String(planId)
    );

  if (!plan) return;

  const confirmed = confirm(
    `هل أنت متأكد من حذف "${plan.title}"؟\n\nلا يمكن التراجع عن العملية.`
  );

  if (!confirmed) return;

  const { error } = await sb
    .from("savings_plans")
    .delete()
    .eq("id", planId)
    .eq("user_id", currentUser.id);

  if (error) {
    alert(
      "حدث خطأ أثناء الحذف:\n" +
        error.message
    );

    return;
  }

  if (
    currentPlan &&
    String(currentPlan.id) ===
      String(planId)
  ) {
    currentPlan = null;
    items = [];
  }

  await loadAllPlans();

  setMessage(
    planMessage,
    "تم حذف التحويشة بنجاح.",
    true
  );
};

/* =========================================================
   16. PRINT PREVIEW
   ========================================================= */

document
  .getElementById("previewPrintBtn")
  ?.addEventListener("click", () => {
    if (
      !currentPlan ||
      !items.length
    ) {
      alert(
        "اختر خطة تحويشة أولاً."
      );

      return;
    }

    if (!printPreviewContent) {
      return;
    }

    printPreviewContent.innerHTML = `
      <div class="print-preview-inner">

        <h2>
          جدول تحويشتي
        </h2>

        <h3>
          ${escapeHTML(
            currentPlan.title
          )}
        </h3>

        <p>
          الهدف:
          <strong>
            ${money(
              currentPlan.target_amount
            )}
          </strong>
        </p>

        <p>
          عدد الخانات:
          <strong>
            ${items.length}
          </strong>
        </p>

        <div class="print-grid">
          ${items
            .map(
              (item) => `
                <div class="print-box">
                  <strong>
                    ${Number(
                      item.denomination
                    ).toLocaleString(
                      "ar-EG"
                    )} ج
                  </strong>

                  <small>
                    ${
                      item.checked
                        ? "✓ تم التحويش"
                        : "☐ لم يتم"
                    }
                  </small>
                </div>
              `
            )
            .join("")}
        </div>

      </div>
    `;

    printPreviewModal?.classList.remove(
      "hidden"
    );
  });

closePrintPreviewBtn?.addEventListener(
  "click",
  () => {
    printPreviewModal?.classList.add(
      "hidden"
    );
  }
);

confirmPrintBtn?.addEventListener(
  "click",
  async () => {
    if (!currentPlan) return;

    const accepted = confirm(
      "الطباعة تستهلك 10 كريدت.\nهل تريد الاستمرار؟"
    );

    if (!accepted) return;

    const success =
      await deductCredits(
        10,
        "طباعة جدول التحويشة"
      );

    if (!success) return;

    printPreviewModal?.classList.add(
      "hidden"
    );

    setTimeout(() => {
      window.print();
    }, 100);
  }
);

/* =========================================================
   17. MONEYPOOLS
   ========================================================= */

async function loadMoneypools() {
  if (!currentUser || !poolsList) {
    return;
  }

  poolsList.innerHTML = `
    <p class="empty-text">
      جاري تحميل الجمعيات...
    </p>
  `;

  const { data, error } = await sb
    .from("moneypools")
    .select(`
      *,
      moneypool_members (*)
    `)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    poolsList.innerHTML = "";

    setMessage(
      poolMessage,
      "حدث خطأ أثناء تحميل الجمعيات: " +
        error.message
    );

    return;
  }

  currentPools = data || [];

  renderMoneypools();
}

function renderMoneypools() {
  if (!poolsList) return;

  poolsList.innerHTML = "";

  if (!currentPools.length) {
    poolsList.innerHTML = `
      <p class="empty-text">
        لا توجد جمعيات قائمة حالياً.
      </p>
    `;

    return;
  }

  currentPools.forEach((pool) => {
    const card =
      document.createElement(
        "div"
      );

    card.className =
      "pool-card";

    const isOwner =
      pool.owner_id ===
      currentUser.id;

    const membersCount =
      pool.moneypool_members
        ?.length || 0;

    card.innerHTML = `
      <div class="pool-card-top">

        <div>
          <h3>
            📜 ${escapeHTML(
              pool.title
            )}
          </h3>

          ${
            isOwner
              ? `
                <span class="owner-badge">
                  صاحب الجمعية
                </span>
              `
              : ""
          }
        </div>

        <strong>
          ${money(
            pool.installment_amount
          )}
          /
          ${escapeHTML(
            pool.cycle_period
          )}
        </strong>

      </div>

      <p>
        👥 عدد الأعضاء:
        <strong>
          ${membersCount}
        </strong>
      </p>

      <button
        type="button"
        class="pool-open-btn"
        data-pool-id="${escapeHTML(
          pool.id
        )}"
      >
        عرض التفاصيل ✨
      </button>
    `;

    poolsList.appendChild(card);
  });

  poolsList
    .querySelectorAll(
      "[data-pool-id]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openPoolDetails(
            button.dataset.poolId
          );
        }
      );
    });
}

/* =========================================================
   18. CREATE POOL
   ========================================================= */

createPoolBtn?.addEventListener(
  "click",
  async () => {
    if (!currentUser) {
      alert(
        "يجب تسجيل الدخول أولاً."
      );
      return;
    }

    const title =
      prompt(
        "اسم الجمعية:"
      )?.trim();

    if (!title) return;

    const amountInput =
      prompt(
        "مبلغ القسط لكل عضو:"
      );
