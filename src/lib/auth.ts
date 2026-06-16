import { getSharedSettings } from './db';

const STUDENT_COOKIE_NAME = 'cefr_student_auth';
const ADMIN_COOKIE_NAME = 'cefr_admin_auth';

export function checkStudentAuth(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Simple check for cookie
  const cookies = document.cookie.split(';');
  const hasAuth = cookies.some(item => item.trim().startsWith(`${STUDENT_COOKIE_NAME}=`));
  return hasAuth;
}

export function loginStudent(username: string, password: string): boolean {
  const settings = getSharedSettings();
  if (
    username.trim().toLowerCase() === settings.sharedUsername.toLowerCase() &&
    password === settings.sharedPasswordHash
  ) {
    // Set cookie for 30 days
    const date = new Date();
    date.setTime(date.getTime() + 30 * 24 * 60 * 60 * 1000);
    document.cookie = `${STUDENT_COOKIE_NAME}=true; path=/; expires=${date.toUTCString()}`;
    return true;
  }
  return false;
}

export function logoutStudent(): void {
  if (typeof window === 'undefined') return;
  document.cookie = `${STUDENT_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function checkAdminAuth(): boolean {
  if (typeof window === 'undefined') return false;
  
  const cookies = document.cookie.split(';');
  const hasAuth = cookies.some(item => item.trim().startsWith(`${ADMIN_COOKIE_NAME}=`));
  return hasAuth;
}

export function loginAdmin(password: string): boolean {
  // Hardcoded simple admin password for simplicity
  if (password === 'admincefr2026') {
    const date = new Date();
    date.setTime(date.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day
    document.cookie = `${ADMIN_COOKIE_NAME}=true; path=/; expires=${date.toUTCString()}`;
    return true;
  }
  return false;
}

export function logoutAdmin(): void {
  if (typeof window === 'undefined') return;
  document.cookie = `${ADMIN_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
