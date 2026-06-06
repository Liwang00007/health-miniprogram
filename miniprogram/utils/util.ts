/**
 * FitPlan 工具函数集
 */

/* ============================================
   格式化
   ============================================ */

/** 补零 */
const formatNumber = (n: number): string => {
  const s = n.toString()
  return s[1] ? s : '0' + s
}

/** 格式化时间：YYYY/MM/DD HH:mm:ss */
export const formatTime = (date: Date): string => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return (
    [year, month, day].map(formatNumber).join('/') +
    ' ' +
    [hour, minute, second].map(formatNumber).join(':')
  )
}

/** 格式化日期：YYYY-MM-DD */
export const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return [year, month, day].map(formatNumber).join('-')
}

/** 格式化日期：MM-DD */
export const formatShortDate = (date: Date): string => {
  const month = date.getMonth() + 1
  const day = date.getDate()
  return [month, day].map(formatNumber).join('-')
}

/** 获取今日日期字符串 YYYY-MM-DD */
export const getTodayStr = (): string => {
  return formatDate(new Date())
}

/** 获取星期几文字 */
export const getWeekday = (date: Date): string => {
  const days = ['日', '一', '二', '三', '四', '五', '六']
  return '周' + days[date.getDay()]
}

/** 相对时间：刚刚 / X分钟前 / X小时前 / X天前 */
export const formatRelative = (date: Date): string => {
  const now = Date.now()
  const diff = now - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return formatDate(date)
}

/** 格式化训练时长（分钟 -> Xh Xmin） */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

/** 格式化千位数字（如 1850 -> 1,850） */
export const formatNumberWithComma = (n: number): string => {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/* ============================================
   防抖与节流
   ============================================ */

/** 防抖 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timer: number | null = null
  return function (this: any, ...args: Parameters<T>) {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay) as unknown as number
  }
}

/** 节流 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let last = 0
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn.apply(this, args)
    }
  }
}

/* ============================================
   本地存储封装（带错误处理 + JSON 自动序列化）
   ============================================ */

export function getStorage<T = any>(key: string, defaultValue?: T): T | undefined {
  try {
    const raw = wx.getStorageSync(key)
    if (raw === '' || raw === undefined || raw === null) return defaultValue
    try {
      return JSON.parse(raw) as T
    } catch {
      return raw as unknown as T
    }
  } catch (e) {
    console.warn(`[Storage] 读取 ${key} 失败:`, e)
    return defaultValue
  }
}

export function setStorage(key: string, value: any): boolean {
  try {
    const data = typeof value === 'string' ? value : JSON.stringify(value)
    wx.setStorageSync(key, data)
    return true
  } catch (e) {
    console.warn(`[Storage] 写入 ${key} 失败:`, e)
    return false
  }
}

export function removeStorage(key: string): boolean {
  try {
    wx.removeStorageSync(key)
    return true
  } catch (e) {
    console.warn(`[Storage] 删除 ${key} 失败:`, e)
    return false
  }
}

/** 清除所有本地数据（退出登录用） */
export function clearAllStorage(): boolean {
  try {
    wx.clearStorageSync()
    return true
  } catch (e) {
    console.warn('[Storage] 清除全部失败:', e)
    return false
  }
}

/* ============================================
   Toast 封装
   ============================================ */

export function showToast(title: string, icon: 'success' | 'error' | 'none' = 'none', duration: number = 2000): void {
  wx.showToast({ title, icon, duration })
}

export function showSuccessToast(title: string = '操作成功'): void {
  showToast(title, 'success')
}

export function showErrorToast(title: string = '操作失败'): void {
  showToast(title, 'error')
}

export function showLoading(title: string = '加载中…'): void {
  wx.showLoading({ title, mask: true })
}

export function hideLoading(): void {
  wx.hideLoading()
}

/* ============================================
   网络状态
   ============================================ */

/** 获取当前网络类型 */
export function getNetworkType(): Promise<'wifi' | '2g' | '3g' | '4g' | '5g' | 'unknown' | 'none'> {
  return new Promise((resolve) => {
    wx.getNetworkType({
      success(res) {
        resolve(res.networkType)
      },
      fail() {
        resolve('unknown')
      }
    })
  })
}

/** 判断是否有网络连接 */
export async function isNetworkAvailable(): Promise<boolean> {
  const type = await getNetworkType()
  return type !== 'none' && type !== 'unknown'
}

/* ============================================
   通用工具
   ============================================ */

/** 简易深拷贝 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch {
    return obj
  }
}

/** 生成唯一 ID */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/** 截断文字 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '…'
}

/** 判断是否为空对象 */
export function isEmpty(obj: any): boolean {
  if (obj === null || obj === undefined) return true
  if (typeof obj === 'string') return obj.trim() === ''
  if (Array.isArray(obj)) return obj.length === 0
  if (typeof obj === 'object') return Object.keys(obj).length === 0
  return false
}

/** 计算 BMI */
export function calcBMI(weightKg: number, heightCm: number): number {
  const h = heightCm / 100
  return Math.round((weightKg / (h * h)) * 10) / 10
}

/** 估算每日基础代谢（Mifflin-St Jeor 公式） */
export function calcBMR(weightKg: number, heightCm: number, age: number, gender: 'male' | 'female'): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(gender === 'male' ? base + 5 : base - 161)
}
