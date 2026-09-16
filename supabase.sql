-- ==========================================
-- تحويشتي Database Setup (Updated & Enhanced)
-- Run this entire script in Supabase SQL Editor.
-- ==========================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. جدول خطط التحويش (saving_plans)
CREATE TABLE IF NOT EXISTS public.saving_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_amount INTEGER NOT NULL CHECK (target_amount >= 20),
  edit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- التأكد من وجود عمود edit_count في حال كان الجدول مضافاً سابقاً
ALTER TABLE public.saving_plans ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- 2. جدول خانات التحويش (saving_items)
CREATE TABLE IF NOT EXISTS public.saving_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.saving_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  denomination INTEGER NOT NULL CHECK (denomination IN (20, 50, 100, 200, 250, 300, 500)),
  position INTEGER NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. جدول اشتراكات المستخدمين الحالية (User Subscriptions)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول طلبات الترقية والاشتراكات (premium_requests)
CREATE TABLE IF NOT EXISTS public.premium_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  sender_phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- الفهارس لتحسين سرعة الاستعلامات (Indexes)
CREATE INDEX IF NOT EXISTS saving_plans_user_id_idx ON public.saving_plans(user_id);
CREATE INDEX IF NOT EXISTS saving_items_plan_id_idx ON public.saving_items(plan_id);
CREATE INDEX IF NOT EXISTS saving_items_user_id_idx ON public.saving_items(user_id);
CREATE INDEX IF NOT EXISTS premium_requests_user_id_idx ON public.premium_requests(user_id);

-- تفعيل الحماية الحيوية (Row Level Security)
ALTER TABLE public.saving_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_requests ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- سياسات الأمان الشاملة (RLS Policies)
-- ==========================================

-- سياسات جدول saving_plans
DROP POLICY IF EXISTS "plans_select_own" ON public.saving_plans;
CREATE POLICY "plans_select_own" ON public.saving_plans FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "plans_insert_own" ON public.saving_plans;
CREATE POLICY "plans_insert_own" ON public.saving_plans FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "plans_update_own" ON public.saving_plans;
CREATE POLICY "plans_update_own" ON public.saving_plans FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "plans_delete_own" ON public.saving_plans;
CREATE POLICY "plans_delete_own" ON public.saving_plans FOR DELETE USING (auth.uid() = user_id);

-- سياسات جدول saving_items
DROP POLICY IF EXISTS "items_select_own" ON public.saving_items;
CREATE POLICY "items_select_own" ON public.saving_items FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "items_insert_own" ON public.saving_items;
CREATE POLICY "items_insert_own" ON public.saving_items FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "items_update_own" ON public.saving_items;
CREATE POLICY "items_update_own" ON public.saving_items FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "items_delete_own" ON public.saving_items;
CREATE POLICY "items_delete_own" ON public.saving_items FOR DELETE USING (auth.uid() = user_id);

-- سياسات جدول user_subscriptions
DROP POLICY IF EXISTS "sub_select_own" ON public.user_subscriptions;
CREATE POLICY "sub_select_own" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);

-- سياسات جدول premium_requests
DROP POLICY IF EXISTS "premium_select_own" ON public.premium_requests;
CREATE POLICY "premium_select_own" ON public.premium_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "premium_insert_own" ON public.premium_requests;
CREATE POLICY "premium_insert_own" ON public.premium_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- دوال وتأثيرات أوتوماتيكية (Triggers & Functions)
-- ==========================================

-- دالة لإنشاء سجل اشتراك مجاني تلقائياً لكل مستخدم جديد يسجل بالبرنامج
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, is_premium)
  VALUES (NEW.id, FALSE)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger لتشغيل الدالة فور تسجيل حساب جديد
DROP TRIGGER IF EXISTS on_auth_user_created_sub ON auth.users;
CREATE TRIGGER on_auth_user_created_sub
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();
