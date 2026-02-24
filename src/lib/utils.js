import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function sanitizeNumeric(val) {
  if (val === '' || val === null || val === undefined) return null;
  const str = String(val).trim();
  // Handle ranges like "110-120" -> take first number
  if (str.includes('-')) {
      const parts = str.split('-');
      const first = parseFloat(parts[0]);
      return isNaN(first) ? null : first;
  }
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

export function sanitizeStatus(val) {
  if (!val) return 'active';
  const str = String(val).toLowerCase().trim();
  // Check for common variations or just enforce allowed values
  if (str === 'active' || str === 'inactive') return str;
  // Map common variations if necessary, otherwise default to active
  if (str === 'true' || str === 'yes') return 'active';
  if (str === 'false' || str === 'no') return 'inactive';
  return 'active'; 
}