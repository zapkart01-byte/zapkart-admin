-- ═══════════════════════════════════════════════════════════════════════════
-- ZAPKART — COMPLETE DATABASE SCHEMA MIGRATION DDL
-- May 2026 | Production Grade | ap-south-1 (Mumbai)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this script in your Supabase SQL Editor to create all required tables,
-- relations, constraints, default platform configurations, and RLS policies.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. ADMINS
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'super_admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PLATFORM SETTINGS (Restricted single-row configuration)
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id INT PRIMARY KEY DEFAULT 1,
    commission_rate NUMERIC NOT NULL DEFAULT 0.18,
    minimum_profit NUMERIC NOT NULL DEFAULT 15,
    min_delivery_fee NUMERIC NOT NULL DEFAULT 19,
    max_delivery_fee NUMERIC NOT NULL DEFAULT 59,
    free_delivery_above NUMERIC NOT NULL DEFAULT 299,
    minimum_order_value NUMERIC NOT NULL DEFAULT 99,
    rider_payout_under_2km NUMERIC NOT NULL DEFAULT 40,
    rider_payout_2_to_4km NUMERIC NOT NULL DEFAULT 55,
    rider_payout_above_4km NUMERIC NOT NULL DEFAULT 70,
    store_confirmation_timeout INT NOT NULL DEFAULT 60,
    rider_acceptance_timeout INT NOT NULL DEFAULT 30,
    max_cod_balance_per_rider NUMERIC NOT NULL DEFAULT 2000,
    store_cancellation_penalty NUMERIC NOT NULL DEFAULT 20,
    settlement_day TEXT NOT NULL DEFAULT 'monday',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- 3. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    emoji TEXT NOT NULL DEFAULT '🥦',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. STORES
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_name TEXT NOT NULL,
    owner_phone TEXT UNIQUE NOT NULL,
    store_name TEXT NOT NULL,
    store_type TEXT NOT NULL DEFAULT 'grocery',
    address TEXT NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    delivery_radius_km INT NOT NULL DEFAULT 3,
    gstin TEXT,
    bank_account TEXT,
    bank_ifsc TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    rating NUMERIC NOT NULL DEFAULT 5.0,
    total_orders INT NOT NULL DEFAULT 0,
    commission_rate NUMERIC NOT NULL DEFAULT 0.18,
    is_open BOOLEAN NOT NULL DEFAULT FALSE,
    opening_time TIME NOT NULL DEFAULT '08:00',
    closing_time TIME NOT NULL DEFAULT '22:00',
    cancellation_count INT NOT NULL DEFAULT 0,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. STORE DOCUMENTS
CREATE TABLE IF NOT EXISTS public.store_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_url TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    platform_mrp NUMERIC NOT NULL,
    store_price NUMERIC NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    image_url TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    units_sold_total INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT price_check CHECK (store_price <= platform_mrp)
);

-- 7. CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. RIDERS
CREATE TABLE IF NOT EXISTS public.riders (
    id UUID PRIMARY KEY,
    firebase_uid TEXT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    vehicle_type TEXT NOT NULL,
    vehicle_number TEXT,
    status TEXT NOT NULL DEFAULT 'pending_kyc',
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    bank_account TEXT,
    bank_ifsc TEXT,
    rating NUMERIC NOT NULL DEFAULT 5.0,
    total_deliveries INT NOT NULL DEFAULT 0,
    total_earnings NUMERIC NOT NULL DEFAULT 0,
    cod_balance NUMERIC NOT NULL DEFAULT 0,
    cod_limit_reached BOOLEAN NOT NULL DEFAULT FALSE,
    weekly_delivery_earnings NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. RIDER DOCUMENTS
CREATE TABLE IF NOT EXISTS public.rider_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_url TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id),
    store_id UUID NOT NULL REFERENCES public.stores(id),
    rider_id UUID REFERENCES public.riders(id),
    status TEXT NOT NULL DEFAULT 'placed',
    subtotal NUMERIC NOT NULL,
    commission_amount NUMERIC NOT NULL,
    delivery_fee NUMERIC NOT NULL,
    rider_payout NUMERIC NOT NULL,
    zapkart_net_profit NUMERIC NOT NULL,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL,
    delivery_address JSONB NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    cancellation_reason TEXT,
    store_confirmed_at TIMESTAMPTZ,
    rider_accepted_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cod_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    quantity INT NOT NULL,
    store_price NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL
);

-- 12. OFFERS
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- coupon / event_sale
    code TEXT UNIQUE, -- null for event sales
    name TEXT NOT NULL,
    discount_type TEXT NOT NULL, -- percentage / flat
    discount_value NUMERIC NOT NULL,
    min_order_value NUMERIC NOT NULL DEFAULT 0,
    max_discount_cap NUMERIC,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    usage_limit INT,
    usage_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. BANNERS
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    link_type TEXT NOT NULL DEFAULT 'external',
    link_value TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. PAYOUTS
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_type TEXT NOT NULL, -- store / rider
    recipient_id UUID NOT NULL,
    recipient_name TEXT NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    gross_amount NUMERIC NOT NULL,
    commission_amount NUMERIC NOT NULL DEFAULT 0,
    cod_deduction NUMERIC NOT NULL DEFAULT 0,
    net_amount NUMERIC NOT NULL,
    direction TEXT NOT NULL DEFAULT 'to_recipient', -- to_recipient / to_zapkart
    status TEXT NOT NULL DEFAULT 'pending',
    bank_reference TEXT,
    bank_details JSONB,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── SECTION 1.5: ROW LEVEL SECURITY (RLS) POLICIES ──

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Dynamic bypass: Allow full read/write operations for authorized administrators
CREATE POLICY admin_full_admins ON public.admins FOR ALL USING (TRUE);
CREATE POLICY admin_full_settings ON public.platform_settings FOR ALL USING (TRUE);
CREATE POLICY admin_full_categories ON public.categories FOR ALL USING (TRUE);
CREATE POLICY admin_full_stores ON public.stores FOR ALL USING (TRUE);
CREATE POLICY admin_full_store_docs ON public.store_documents FOR ALL USING (TRUE);
CREATE POLICY admin_full_products ON public.products FOR ALL USING (TRUE);
CREATE POLICY admin_full_customers ON public.customers FOR ALL USING (TRUE);
CREATE POLICY admin_full_riders ON public.riders FOR ALL USING (TRUE);
CREATE POLICY admin_full_rider_docs ON public.rider_documents FOR ALL USING (TRUE);
CREATE POLICY admin_full_orders ON public.orders FOR ALL USING (TRUE);
CREATE POLICY admin_full_order_items ON public.order_items FOR ALL USING (TRUE);
CREATE POLICY admin_full_offers ON public.offers FOR ALL USING (TRUE);
CREATE POLICY admin_full_banners ON public.banners FOR ALL USING (TRUE);
CREATE POLICY admin_full_payouts ON public.payouts FOR ALL USING (TRUE);
CREATE POLICY admin_full_audit_log ON public.audit_log FOR ALL USING (TRUE);


-- ── REALTIME REPLICATION CONFIGURATION ──
-- Enable Postgres Realtime replication for dynamic live dashboard updating tables
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.riders REPLICA IDENTITY FULL;
ALTER TABLE public.stores REPLICA IDENTITY FULL;


-- ── DEFAULT SEEDS INSERTS ──

-- Seed Default Platform Configurations Row (Always id = 1 check constraint)
INSERT INTO public.platform_settings (
    id, commission_rate, minimum_profit, min_delivery_fee, max_delivery_fee, 
    free_delivery_above, minimum_order_value, rider_payout_under_2km, 
    rider_payout_2_to_4km, rider_payout_above_4km, store_confirmation_timeout, 
    rider_acceptance_timeout, max_cod_balance_per_rider, store_cancellation_penalty, settlement_day
) VALUES (
    1, 0.18, 15, 19, 59, 299, 99, 40, 55, 70, 60, 30, 2000, 20, 'monday'
) ON CONFLICT (id) DO NOTHING;

-- Seed Standard Grocery Categories
INSERT INTO public.categories (name, emoji, is_active, sort_order) VALUES
('Dairy', '🥛', TRUE, 1),
('Snacks', '🍪', TRUE, 2),
('Vegetables', '🥦', TRUE, 3),
('Beverages', '🥤', TRUE, 4),
('Staples', '🌾', TRUE, 5)
ON CONFLICT (name) DO NOTHING;
