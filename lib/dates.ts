export function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysSince(dateString?: string) {
  if (!dateString) return Number.POSITIVE_INFINITY;
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return Number.POSITIVE_INFINITY;
  const date = new Date(year, month - 1, day);
  const diff = Date.now() - date.getTime();
  return Math.floor(diff / (24 * 3600 * 1000));
}
