import API from '../api/axios';

/**
 * Log a failed action to the audit trail.
 * Call this in any catch block where a red Toast is shown.
 * 
 * @param {string} action - What failed, e.g. "Failed to create policy 'XYZ'"
 * @param {string} module - Module name, e.g. "Policy", "Auth", "Settings"
 */
export async function logFailure(action, module = 'System') {
  try {
    await API.post('audit-logs/', { action, module, status: 'Failed' });
  } catch {
    // Silently fail — don't break the app if audit logging itself fails
  }
}
