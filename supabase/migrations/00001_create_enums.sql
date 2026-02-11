-- Enums
CREATE TYPE user_role AS ENUM ('super_admin', 'company_admin');
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE subscription_plan AS ENUM ('free_trial', 'monthly', 'yearly');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'past_due');
CREATE TYPE payment_provider AS ENUM ('toss', 'stripe');
CREATE TYPE notification_type AS ENUM ('new_report', 'status_change', 'new_comment', 'subscription_expiry', 'system');
CREATE TYPE notification_channel AS ENUM ('email', 'in_app', 'both');
CREATE TYPE author_type AS ENUM ('reporter', 'company_admin', 'super_admin');
