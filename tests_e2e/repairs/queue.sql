BEGIN;
SET LOCAL ROLE app_rw;
SELECT set_config('app.tenant_id', :'tenant', true) AS ignored \gset
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM repairs ORDER BY created_at DESC, id DESC LIMIT 50;
ROLLBACK;
