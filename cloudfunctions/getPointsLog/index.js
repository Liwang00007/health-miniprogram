// cloudfunctions/getPointsLog/index.js
// 获取积分变动记录 — 从 check_ins 和 points_log 联合查询
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) return { success: false, errMsg: '未获取到用户身份' }

  const { page = 1, pageSize = 50 } = event || {}

  try {
    // 1. 查询签到积分记录 (check_ins)
    const checkInRes = await db.collection('check_ins')
      .where({ _openid: openid })
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get()

    // 格式化签到的积分日志
    const checkInLogs = (checkInRes.data || []).map(record => ({
      _id: record._id,
      type: 'daily_checkin',
      amount: record.pointsEarned || 0,
      description: record.consecutiveDays >= 7
        ? `连续签到 ${record.consecutiveDays} 天（含额外奖励）`
        : `每日签到`,
      balance: 0, // 精确余额需从 points_log 获取，这里用 0 占位
      createdAt: fmtDate(record.createdAt),
      source: 'check_ins',
    }))

    // 2. 查询通用积分日志 (points_log，如果存在)
    let pointsLogs = []
    try {
      const pointsRes = await db.collection('points_log')
        .where({ _openid: openid })
        .orderBy('createdAt', 'desc')
        .limit(200)
        .get()
      pointsLogs = (pointsRes.data || []).map(record => ({
        ...record,
        createdAt: fmtDate(record.createdAt),
        source: 'points_log',
      }))
    } catch (e) {
      // points_log 集合可能还不存在，忽略
      console.log('points_log 查询跳过:', e.message)
    }

    // 3. 合并并按时间降序排列
    const allLogs = [...checkInLogs, ...pointsLogs]
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime()
        const timeB = new Date(b.createdAt).getTime()
        return timeB - timeA
      })

    // 分页
    const total = allLogs.length
    const start = (page - 1) * pageSize
    const pagedLogs = allLogs.slice(start, start + pageSize)

    return {
      success: true,
      data: {
        list: pagedLogs,
        total,
        page,
        pageSize,
      }
    }
  } catch (err) {
    console.error('getPointsLog 异常:', err)
    return { success: false, errMsg: err.message || '查询积分日志失败' }
  }
}

function fmtDate(val) {
  if (val instanceof Date) return val.toISOString()
  if (typeof val === 'string') return val
  return ''
}
