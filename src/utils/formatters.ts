/**
 * Format delay duration into a human-readable string
 */
export function formatDelayDuration(duration?: string): string {
  switch (duration) {
    case 'less_than_3':
      return 'Weniger als 3 Stunden';
    case '3_to_4':
      return '3-4 Stunden';
    case 'more_than_4':
      return 'Mehr als 4 Stunden';
    default:
      return 'Unbekannte Dauer';
  }
}

/**
 * Format cancellation notice period into a human-readable string
 */
export function formatCancellationNotice(notice?: string): string {
  switch (notice) {
    case 'less_than_7_days':
      return 'Weniger als 7 Tage';
    case '7_to_14_days':
      return '7-14 Tage';
    case 'more_than_14_days':
      return 'Mehr als 14 Tage';
    default:
      return 'Unbekannte Vorlaufzeit';
  }
}
