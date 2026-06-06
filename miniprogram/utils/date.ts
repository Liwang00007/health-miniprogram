// utils/date.ts

/** 格式化 Date -> 'YYYY-MM-DD' */
export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 格式化 Date -> 'HH:mm' */
export function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

/** 获取今天的 'YYYY-MM-DD' */
export function getToday(): string {
  return formatDate(new Date())
}

/** 获取 N 天前的 'YYYY-MM-DD' */
export function getDateBefore(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return formatDate(d)
}

/** 解析 'YYYY-MM-DD' -> Date */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 判断两个日期字符串是否为同一天 */
export function isSameDay(d1: string, d2: string): boolean {
  return d1 === d2
}

/** 获取连续打卡天数（从今天往前数连续有记录的天数） */
export function calcStreakDays(checkinDates: string[]): number {
  if (!checkinDates.length) return 0
  const sorted = [...new Set(checkinDates)].sort().reverse()
  let streak = 0
  const today = getToday()
  const cursor = new Date()
  for (const d of sorted) {
    const expected = formatDate(cursor)
    if (d === expected || d === today) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}
