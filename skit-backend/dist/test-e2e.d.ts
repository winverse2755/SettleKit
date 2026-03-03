/**
 * End-to-end test for the SettleKit backend
 *
 * Tests the full flow:
 * 1. POST /trigger - Create a settlement
 * 2. POST /webhook - Simulate CRE risk report (APPROVED)
 * 3. GET /settlement/:id - Verify execution and get explorer URL
 */
import "dotenv/config";
