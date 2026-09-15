/* تحويشتي - Supabase setup
   Replace SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY with values from your Supabase project.
   Never put a Supabase secret/service_role key in this browser file.
*/
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

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

let currentUser = null;
let currentPlan = null;
let items = [];

function money(n){ return `${Number(n).toLocaleString('ar-EG')} ج`; }
function setMessage(el, text, ok=false){ el.textContent = text || ''; el.style.color = ok ? '#86efac' : ''; }

function randomShuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

// Finds a random exact combination using the requested denominations.
function makeCombination(total){
  const denoms = [250,200,100,50,20];
  if(total < 20 || !Number.isInteger(total)) return null;

  // DP stores several possible count-vectors, then randomly picks one.
  const ways = Array(total + 1).fill(null);
  ways[0] = [[]];
  for(let sum=20; sum<=total; sum+=10){
    const candidates=[];
    for(const d of denoms){
      if(sum-d >= 0 && ways[sum-d]){
        for(const counts of ways[sum-d].slice(0,8)){
          const next=[...counts,d];
          candidates.push(next);
        }
      }
    }
    if(candidates.length) ways[sum]=candidates.slice(0,20);
  }
  const candidates = ways[total];
  if(!candidates || !candidates.length) return null;
  const chosen = candidates[Math.floor(Math.random()*candidates.length)];
  return randomShuffle(chosen);
}

function render(){
  grid.innerHTML='';
  if(!items.length){ emptyState.classList.remove('hidden'); progressWrap.classList.add('hidden'); updateTotals(); return; }
  emptyState.classList.add('hidden'); progressWrap.classList.remove('hidden');
  items.forEach(item=>{
    const card=document.createElement('button');
    card.type='button';
    card.className='saving-card' + (item.checked ? ' checked' : '');
    card.innerHTML=`<div class="denom">${item.denomination.toLocaleString('ar-EG')}<small> جنيه</small></div><div class="check-text">${item.checked?'تم التحويش ✓':'اضغط للتعليم ✓'}</div>`;
    card.addEventListener('click',()=>toggleItem(item.id));
    grid.appendChild(card);
  });
  updateTotals();
}

function updateTotals(){
  const target=Number(currentPlan?.target_amount||0);
  const saved=items.filter(x=>x.checked).reduce((s,x)=>s+Number(x.denomination),0);
  const remaining=Math.max(0,target-saved);
  const percent=target?Math.min(100,Math.round(saved/target*100)):0;
  remainingEl.textContent=money(remaining);
  targetTotalEl.textContent=money(target);
  progressPercent.textContent=`${percent}%`;
  progressBar.style.width=`${percent}%`;
}

async function loadPlan(){
  const {data:plan,error:planError}=await sb.from('saving_plans').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(planError){setMessage(planMessage,planError.message);return;}
  currentPlan=plan;
  if(!plan){items=[];render();return;}
  const {data:rows,error}=await sb.from('saving_items').select('*').eq('plan_id',plan.id).order('position');
  if(error){setMessage(planMessage,error.message);return;}
  items=rows||[];
  targetInput.value=plan.target_amount;
  render();
}

async function createPlan(){
  setMessage(planMessage,'');
  const amount=Number(targetInput.value);
  if(!Number.isInteger(amount) || amount<20){setMessage(planMessage,'اكتب مبلغًا صحيحًا يبدأ من 20 جنيه.');return;}
  const combo=makeCombination(amount);
  if(!combo){setMessage(planMessage,'المبلغ ده لا يمكن تكوينه من فئات 20 و50 و100 و200 و250. جرّب مبلغًا آخر.');return;}

  const {data:oldPlans}=await sb.from('saving_plans').select('id').eq('user_id',currentUser.id);
  if(oldPlans?.length){
    const {error:delErr}=await sb.from('saving_plans').delete().eq('user_id',currentUser.id);
    if(delErr){setMessage(planMessage,delErr.message);return;}
  }

  const {data:plan,error}=await sb.from('saving_plans').insert({user_id:currentUser.id,target_amount:amount}).select().single();
  if(error){setMessage(planMessage,error.message);return;}
  const rows=combo.map((d,i)=>({plan_id:plan.id,user_id:currentUser.id,denomination:d,position:i,checked:false}));
  const {error:itemErr}=await sb.from('saving_items').insert(rows);
  if(itemErr){setMessage(planMessage,itemErr.message);return;}
  currentPlan=plan;items=rows.map((x,i)=>({...x,id:`temp-${i}`}));
  // Reload so every item gets its real database id.
  await loadPlan();
  setMessage(planMessage,'اتعملت الخطة بنجاح ✨',true);
}

async function toggleItem(id){
  const item=items.find(x=>x.id===id); if(!item) return;
  const next=!item.checked;
  item.checked=next; render();
  const {error}=await sb.from('saving_items').update({checked:next}).eq('id',id).eq('user_id',currentUser.id);
  if(error){item.checked=!next;render();setMessage(planMessage,error.message);}
}

async function login(mode){
  const email=document.getElementById('email').value.trim();
  const password=document.getElementById('password').value;
  setMessage(authMessage,'');
  if(mode==='signup'){
    const {error}=await sb.auth.signUp({email,password});
    if(error){setMessage(authMessage,error.message);return;}
    setMessage(authMessage,'تم إنشاء الحساب. لو طلب منك تأكيد البريد، افتح رسالة التأكيد ثم ارجع للموقع.',true);
  }else{
    const {error}=await sb.auth.signInWithPassword({email,password});
    if(error)setMessage(authMessage,error.message);
  }
}

document.getElementById('googleBtn').addEventListener('click',async()=>{
  const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});
  if(error)setMessage(authMessage,error.message);
});

document.getElementById('authForm').addEventListener('submit',e=>{e.preventDefault();login(e.submitter?.dataset.mode||'login');});
document.getElementById('logoutBtn').addEventListener('click',()=>sb.auth.signOut());
document.getElementById('generateBtn').addEventListener('click',createPlan);
targetInput.addEventListener('keydown',e=>{if(e.key==='Enter')createPlan();});

function showLoggedIn(user){
  currentUser=user;
  authView.classList.add('hidden');appView.classList.remove('hidden');userArea.classList.remove('hidden');
  userEmail.textContent=user.email||'حساب Google';
  loadPlan();
}
function showLoggedOut(){
  currentUser=null;currentPlan=null;items=[];authView.classList.remove('hidden');appView.classList.add('hidden');userArea.classList.add('hidden');
}

sb.auth.onAuthStateChange((_event,session)=>{
  if(session?.user) showLoggedIn(session.user); else showLoggedOut();
});

(async()=>{
  const {data:{session}}=await sb.auth.getSession();
  if(session?.user) showLoggedIn(session.user); else showLoggedOut();
})();
