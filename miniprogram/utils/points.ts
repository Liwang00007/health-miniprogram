// utils/points.ts

/** 积分规则常量 */
export const POINTS_RULES = {
  NEW_USER_GIFT: 10,              // 新用户注册赠送
  AI_TRAINING_PLAN: 3,            // AI 训练计划消耗
  AI_DIET_PLAN: 2,                // AI 饮食计划消耗
  DAILY_CHECKIN: 1,               // 每日签到
  STREAK_7_DAYS: 3,               // 连续打卡 7 天奖励
  GOAL_COMPLETED: 2,              // 完成训练目标
  OCR_FOOD_RECOGNITION: 1,        // 拍照识别消耗
}

/** 积分变动类型 */
export type PointsChangeType = 'new_user_gift' | 'daily_checkin' | 'streak_bonus'
  | 'goal_completed' | 'spend_ai_training' | 'spend_ai_diet' | 'spend_ocr' | 'refund'

/** 积分变动日志 */
export interface PointsLog {
  userId: string
  type: PointsChangeType
  amount: number  // 正数=获得，负数=消耗
  balance: number // 变动后余额
  description: string
  createdAt: string
}

/** 检查积分是否足够 */
export function hasEnoughPoints(current: number, required: number): boolean {
  return current >= required
}
