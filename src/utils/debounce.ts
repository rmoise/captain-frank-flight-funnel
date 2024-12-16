import type { DebouncedFunction } from '@/types/components';

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): DebouncedFunction<T> {
  let timeout: NodeJS.Timeout;

  const debounced = function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  } as DebouncedFunction<T>;

  debounced.cancel = function () {
    clearTimeout(timeout);
  };

  return debounced;
}