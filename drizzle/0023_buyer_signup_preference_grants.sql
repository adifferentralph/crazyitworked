-- Buyer signup metadata is synchronized only after an authenticated session exists.
-- RLS still limits these column updates to the owning buyer profile.
GRANT UPDATE (marketing_opt_in, marketing_opted_in_at, marketing_unsubscribed_at)
ON TABLE public.buyer_profiles TO authenticated;