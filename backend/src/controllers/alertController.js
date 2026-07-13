import { getAlerts } from '../services/alertService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listAlerts = asyncHandler(async (req, res) => {
  const alerts = await getAlerts();
  res.json(alerts);
});
