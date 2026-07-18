import { loadUser } from '../utils/storage.js';
import { ROLES, ROUTES } from '../utils/constants.js';

export function requireRole(...allowedRoles) {
  const user = loadUser();
  if (!user || !allowedRoles.includes(user.role)) {
    window.location.href = ROUTES.LOGIN;
    return false;
  }
  return true;
}

export function isAdmin()    { return loadUser()?.role === ROLES.ADMIN; }
export function isEmployee() { return loadUser()?.role === ROLES.EMPLOYEE; }
export function isCustomer() { return loadUser()?.role === ROLES.CUSTOMER; }
