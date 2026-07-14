const TIME_FORMAT: Record<string, string> = {
  MI: 'YYYY-MM-DD HH시 mm분',
  HH: 'YYYY-MM-DD HH시',
  DD: 'YYYY-MM-DD',
  MM: 'YYYY-MM',
  YY: 'YYYY',
};

export const getTimeFormat = (unit?: string) => TIME_FORMAT[unit ?? ''] ?? 'YYYY-MM-DD';
