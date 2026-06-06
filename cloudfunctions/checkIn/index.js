// cloudfunctions/checkIn/index.js
// 每日签到：签到 + 连续打卡奖励 + 签到状态查询
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 签到积分规则
const CHECKIN_POINTS = 1        // 每日签到基础积分
const STREAK_7_BONUS = 3       // 连续 7 天额外奖励
const STREAK_30_BONUS = 10      // 连续 30 天额外奖励

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, errMsg: '未登录' }
  }

  const { action } = event

  try {
    switch (action) {
      case 'checkIn':
        return await doCheckIn(openid)
      case 'getStatus':
        return await getCheckInStatus(openid)
      case 'getHistory':
        return await getCheckInHistory(openid, event)
      default:
        return { success: false, errMsg: `未知操作: ${action}` }
    }
  } catch (err) {
    console.error('checkIn 异常:', err)
    return { success: false, errMsg: err.message || '操作失败' }
  }
}

/** 执行签到 */
async function doCheckIn(openid) {
  const today = getTodayStr()

  // 检查今日是否已签到
  const todayCheck = await db.collection('check_ins')
    .where({ _openid: openid, date: today })
    .get()

  if (todayCheck.data.length > 0) {
    return {
      success: true,
      data: {
        alreadyChecked: true,
        date: today,
        message: '今日已签到',
        checkIn: {
          ...todayCheck.data[0],
          createdAt: fmtDate(todayCheck.data[0].createdAt)
        }
      }
    }
  }

  // 获取上一次签到记录
  const lastCheck = await db.collection('check_ins')
    .where({ _openid: openid })
    .orderBy('date', 'desc')
    .limit(1)
    .get()

  let consecutiveDays = 1
  const yesterday = getYesterdayStr()

  if (lastCheck.data.length > 0) {
    const lastDate = lastCheck.data[0].date
    if (lastDate === yesterday) {
      // 连续签到
      consecutiveDays = (lastCheck.data[0].consecutiveDays || 0) + 1
    } else if (lastDate === today) {
      // 已签到（上面应该已经拦截了，这里是兜底）
      return { success: true, data: { alreadyChecked: true, date: today, message: '今日已签到' } }
    } else {
      // 断签，重新计数
      consecutiveDays = 1
    }
  }

  // 计算积分奖励
  let pointsEarned = CHECKIN_POINTS

  // 每连续 7 天额外奖励
  if (consecutiveDays > 0 && consecutiveDays % 7 === 0) {
    pointsEarned += STREAK_7_BONUS
  }

  // 每连续 30 天额外奖励
  if (consecutiveDays > 0 && consecutiveDays % 30 === 0) {
    pointsEarned += STREAK_30_BONUS
  }

  // 写入签到记录
  const now = new Date()
  const checkInRecord = {
    _openid: openid,
    date: today,
    consecutiveDays,
    pointsEarned,
    createdAt: now
  }

  const res = await db.collection('check_ins').add({ data: checkInRecord })

  // 写入积分日志 (points_log)
  const pointsLogEntry = {
    _openid: openid,
    type: consecutiveDays >= 7 ? 'streak_bonus' : 'daily_checkin',
    amount: pointsEarned,
    description: consecutiveDays >= 7
      ? `连续签到 ${consecutiveDays} 天 +${pointsEarned} 积分`
      : `每日签到 +${pointsEarned} 积分`,
    createdAt: now
  }
  try {
    await db.collection('points_log').add({ data: pointsLogEntry })
  } catch (e) {
    console.log('points_log 写入失败（集合可能不存在）:', e.message)
  }

  // 更新用户积分与连续打卡天数
  await db.collection('users')
    .where({ _openid: openid })
    .update({
      data: {
        points: _.inc(pointsEarned),
        totalPoints: _.inc(pointsEarned),
        streakDays: consecutiveDays,
        maxStreakDays: _.max([consecutiveDays])
      }
    })

  // 构建奖励文案
  let message = `签到成功！+${pointsEarned} 积分`
  if (consecutiveDays % 30 === 0) {
    message = `连续签到 ${consecutiveDays} 天！+${pointsEarned} 积分（含连续30天奖励）`
  } else if (consecutiveDays % 7 === 0) {
    message = `连续签到 ${consecutiveDays} 天！+${pointsEarned} 积分（含连续7天奖励）`
  }

  return {
    success: true,
    data: {
      alreadyChecked: false,
      checkIn: {
        _id: res._id,
        date: today,
        consecutiveDays,
        pointsEarned,
        createdAt: checkInRecord.createdAt.toISOString()
      },
      message
    }
  }
}

/** 查询今日签到状态 */
async function getCheckInStatus(openid) {
  const today = getTodayStr()

  const todayCheck = await db.collection('check_ins')
    .where({ _openid: openid, date: today })
    .get()

  // 获取用户连续天数
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .field({ streakDays: true, points: true })
    .get()

  const streakDays = userRes.data.length > 0 ? (userRes.data[0].streakDays || 0) : 0

  return {
    success: true,
    data: {
      checkedToday: todayCheck.data.length > 0,
      streakDays,
      todayCheckIn: todayCheck.data.length > 0
        ? { ...todayCheck.data[0], createdAt: fmtDate(todayCheck.data[0].createdAt) }
        : null
    }
  }
}

/** 获取签到历史 */
async function getCheckInHistory(openid, opts) {
  const { year, month, page = 1, pageSize = 31 } = opts || {}

  const condition: any = { _openid: openid }

  if (year && month) {
    // 按年月筛选
    const m = String(month).padStart(2, '0')
    condition.date = db.RegExp({ regexp: `^${year}-${m}-`, options: '' })
  }

  const skip = (page - 1) * pageSize

  const [listRes, countRes] = await Promise.all([
    db.collection('check_ins')
      .where(condition)
      .orderBy('date', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get(),
    db.collection('check_ins').where(condition).count()
  ])

  return {
    success: true,
    data: {
      list: listRes.data.map(c => ({
        ...c,
        createdAt: fmtDate(c.createdAt)
      })),
      total: countRes.total,
      page,
      pageSize
    }
  }
}

/** 获取今日日期字符串 YYYY-MM-DD */
function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 获取昨日日期字符串 */
function getYesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDate(val) {
  if (val instanceof Date) return val.toISOString()
  if (typeof val === 'string') return val
  return ''
}
