# Repair requests for a residential building

1. A signed-in resident submits “Vòi nước rò” for room A-101 and sees the same ID and open status in a new browser session.
2. A building manager sees the pending ticket, resolves it, and the resident sees the resolved state in a separate session.
3. A resident of another building cannot read or update the ticket. A resident cannot invoke the manager action.
4. Hardening records the resolution timestamp and refuses a second resolution with HTTP 409.
5. Optimization preserves the most recent 50 tickets in a stable order. PostgreSQL should use the tenant queue index without a sort on the sampled queue. Timing is recorded without a fixed latency threshold.
