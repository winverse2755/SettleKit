/**
 * SettleKit Backend Server
 *
 * Provides three endpoints:
 * - POST /trigger - Triggers a new settlement via CRE workflow
 * - POST /webhook - Receives risk reports from CRE workflow
 * - GET /settlement/:id - Retrieves settlement status and details
 */
import "dotenv/config";
