-- Rate & Review checkpoint 1 follow-up: the original migration granted
-- select/insert on reviewer_accounts but not update/delete, and reviews
-- was missing delete too - found while cleaning up test data (the admin
-- REST client got a permission-denied deleting a row it should be able to
-- manage as service_role).
grant update, delete on public.reviewer_accounts to service_role;
grant delete on public.reviews to service_role;
