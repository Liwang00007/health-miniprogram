// cloudfunctions/statistics/index.js
// 数据统计：训练统计、饮食统计、周报生成、CSV 数据导出
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, errMsg: '未登录' }
  }

  const { action } = event

  try {
    switch (action) {
      case 'trainingStats':
        return await trainingStats(openid, event)
      case 'dietStats':
        return await dietStats(openid, event)
      case 'weeklyReport':
        return await weeklyReport(openid)
      case 'exportCSV':
        return await exportCSV(openid, event)
      case 'overview':
        return await overview(openid)
      default:
        return { success: false, errMsg: `未知操作: ${action}` }
    }
  } catch (err) {
    console.error('statistics 异常:', err)
    return { success: false, errMsg: err.message || '操作失败' }
  }
}

/**
 * 训练统计
 * 返回：总次数、总时长、训练类型分布、肌群分布、日均时长、周/月趋势
 */
async function trainingStats(openid, opts) {
  const { startDate, endDate } = opts || {}

  const condition: any = { _openid: openid }
  if (startDate && endDate) {
    condition.date = _.gte(startDate).and(_.lte(endDate))
  }

  const records = await db.collection('training_records')
    .where(condition)
    .orderBy('date', 'asc')
    .get()

  const list = records.data
  const totalCount = list.length
  const totalDuration = list.reduce((sum, r) => sum + (r.duration || 0), 0)

  // 训练类型分布
  const typeDist: Record<string, number> = {}
  // 肌群分布
  const muscleDist: Record<string, number> = {}
  // 按日期分组
  const dailyMap: Record<string, { count: number; duration: number }> = {}

  list.forEach(r => {
    // 类型统计
    const t = r.trainingType || '其他'
    typeDist[t] = (typeDist[t] || 0) + 1

    // 肌群统计
    if (r.exercises) {
      r.exercises.forEach((ex: any) => {
        const bp = ex.bodyPart || '其他'
        muscleDist[bp] = (muscleDist[bp] || 0) + 1
      })
    }

    // 每日统计
    if (!dailyMap[r.date]) {
      dailyMap[r.date] = { count: 0, duration: 0 }
    }
    dailyMap[r.date].count++
    dailyMap[r.date].duration += (r.duration || 0)
  })

  const dates = Object.keys(dailyMap).sort()
  const totalDays = dates.length || 1
  const dailyAvgDuration = Math.round(totalDuration / totalDays)
  const dailyAvgCount = Math.round((totalCount / totalDays) * 10) / 10

  // 趋势数据（最近 30 天）
  const trend = dates.slice(-30).map(date => ({
    date,
    count: dailyMap[date].count,
    duration: dailyMap[date].duration
  }))

  return {
    success: true,
    data: {
      totalCount,
      totalDuration,
      totalDays,
      dailyAvgDuration,
      dailyAvgCount,
      typeDistribution: typeDist,
      muscleDistribution: muscleDist,
      trend
    }
  }
}

/**
 * 饮食统计
 * 返回：总记录数、日均热量、餐别分布、热量趋势
 */
async function dietStats(openid, opts) {
  const { startDate, endDate } = opts || {}

  const condition: any = { _openid: openid }
  if (startDate && endDate) {
    condition.date = _.gte(startDate).and(_.lte(endDate))
  }

  const records = await db.collection('diet_records')
    .where(condition)
    .orderBy('date', 'asc')
    .get()

  const list = records.data

  // 餐别分布
  const mealDist: Record<string, number> = {}
  // 每日热量
  const dailyCalories: Record<string, number> = {}

  list.forEach(r => {
    const mt = r.mealType || '其他'
    mealDist[mt] = (mealDist[mt] || 0) + 1

    if (!dailyCalories[r.date]) dailyCalories[r.date] = 0
    dailyCalories[r.date] += r.totalCalories || 0
  })

  const dates = Object.keys(dailyCalories).sort()
  const totalDays = dates.length || 1
  const totalCalories = Object.values(dailyCalories).reduce((a, b) => a + b, 0)
  const avgDailyCalories = Math.round(totalCalories / totalDays)

  // 热量趋势（最近 30 天）
  const trend = dates.slice(-30).map(date => ({
    date,
    calories: dailyCalories[date]
  }))

  return {
    success: true,
    data: {
      totalRecords: list.length,
      totalDays,
      totalCalories,
      avgDailyCalories,
      mealDistribution: mealDist,
      trend
    }
  }
}

/**
 * 周报生成
 * 返回：本周训练概览 + 饮食概览 + 环比上周 + 周报摘要
 */
async function weeklyReport(openid) {
  const { thisWeekStart, thisWeekEnd, lastWeekStart, lastWeekEnd } = getWeekRange()

  // 本周数据
  const [thisWeekTraining, thisWeekDiet] = await Promise.all([
    getRecordsInRange('training_records', openid, thisWeekStart, thisWeekEnd),
    getRecordsInRange('diet_records', openid, thisWeekStart, thisWeekEnd)
  ])

  // 上周数据（环比）
  const [lastWeekTraining, lastWeekDiet] = await Promise.all([
    getRecordsInRange('training_records', openid, lastWeekStart, lastWeekEnd),
    getRecordsInRange('diet_records', openid, lastWeekStart, lastWeekEnd)
  ])

  // 训练统计
  const thisTrainCount = thisWeekTraining.length
  const thisTrainDuration = thisWeekTraining.reduce((s, r) => s + (r.duration || 0), 0)
  const lastTrainCount = lastWeekTraining.length
  const lastTrainDuration = lastWeekTraining.reduce((s, r) => s + (r.duration || 0), 0)

  // 饮食统计
  const thisDietRecords = thisWeekDiet.length
  const thisDietCalories = thisWeekDiet.reduce((s, r) => s + (r.totalCalories || 0), 0)
  const lastDietRecords = lastWeekDiet.length
  const lastDietCalories = lastWeekDiet.reduce((s, r) => s + (r.totalCalories || 0), 0)

  // 肌群分布
  const muscleMap: Record<string, number> = {}
  thisWeekTraining.forEach(r => {
    if (r.exercises) {
      r.exercises.forEach((ex: any) => {
        const bp = ex.bodyPart || '其他'
        muscleMap[bp] = (muscleMap[bp] || 0) + 1
      })
    }
  })

  // 环比变化
  const trainCountChange = calcChange(lastTrainCount, thisTrainCount)
  const trainDurationChange = calcChange(lastTrainDuration, thisTrainDuration)
  const dietRecordsChange = calcChange(lastDietRecords, thisDietRecords)
  const dietCaloriesChange = calcChange(lastDietCalories, thisDietCalories)

  // 本周训练天数
  const trainDays = new Set(thisWeekTraining.map(r => r.date)).size

  // 生成摘要
  let summary = ''
  if (thisTrainCount === 0) {
    summary = '本周暂无训练记录，快开始锻炼吧！'
  } else {
    summary = `本周训练 ${trainDays} 天，共 ${thisTrainCount} 次，累计 ${Math.round(thisTrainDuration / 60)} 分钟`
    if (trainCountChange > 0) {
      summary += `，较上周 +${trainCountChange} 次`
    }
    summary += '。'
    if (thisDietCalories > 0) {
      summary += `日均摄入约 ${Math.round(thisDietCalories / 7)} 千卡。`
    }
  }

  return {
    success: true,
    data: {
      weekRange: { start: thisWeekStart, end: thisWeekEnd },
      training: {
        count: thisTrainCount,
        duration: thisTrainDuration,
        trainDays,
        countChange: trainCountChange,
        durationChange: trainDurationChange,
        muscleDistribution: muscleMap
      },
      diet: {
        records: thisDietRecords,
        totalCalories: thisDietCalories,
        avgDailyCalories: thisDietRecords > 0 ? Math.round(thisDietCalories / 7) : 0,
        recordsChange: dietRecordsChange,
        caloriesChange: dietCaloriesChange
      },
      summary
    }
  }
}

/**
 * 综合概览（首页今日概览卡片用）
 */
async function overview(openid) {
  const today = getTodayStr()

  const [todayTraining, todayDiet, userRes] = await Promise.all([
    db.collection('training_records')
      .where({ _openid: openid, date: today })
      .get(),
    db.collection('diet_records')
      .where({ _openid: openid, date: today })
      .get(),
    db.collection('users')
      .where({ _openid: openid })
      .field({ points: true, streakDays: true, trainingCount: true, totalDuration: true })
      .get()
  ])

  const todayTrainCount = todayTraining.data.length
  const todayTrainDuration = todayTraining.data.reduce((s, r) => s + (r.duration || 0), 0)
  const todayCalories = todayDiet.data.reduce((s, r) => s + (r.totalCalories || 0), 0)

  // 活跃目标进度
  const activeGoal = await db.collection('goals')
    .where({ _openid: openid, status: 'active' })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  const goalProgress = activeGoal.data.length > 0 ? activeGoal.data[0].progress : null

  return {
    success: true,
    data: {
      date: today,
      todayTraining: { count: todayTrainCount, duration: todayTrainDuration },
      todayDiet: { records: todayDiet.data.length, totalCalories: todayCalories },
      goalProgress,
      user: userRes.data.length > 0 ? {
        points: userRes.data[0].points,
        streakDays: userRes.data[0].streakDays,
        totalTrainingCount: userRes.data[0].trainingCount,
        totalDuration: userRes.data[0].totalDuration
      } : null
    }
  }
}

/**
 * CSV 数据导出
 * 返回 CSV 文本内容（客户端可保存为文件）
 */
async function exportCSV(openid, opts) {
  const { type, startDate, endDate } = opts || {}
  if (!type) return { success: false, errMsg: '请指定导出类型: training | diet' }

  const condition: any = { _openid: openid }
  if (startDate && endDate) {
    condition.date = _.gte(startDate).and(_.lte(endDate))
  }

  let csvContent = ''
  const BOM = '﻿' // UTF-8 BOM for Excel

  if (type === 'training') {
    const res = await db.collection('training_records')
      .where(condition)
      .orderBy('date', 'desc')
      .get()

    csvContent = BOM + '日期,训练类型,动作,组数,重量(kg),次数,休息间隔(秒),总时长(秒),备注\n'

    res.data.forEach(r => {
      if (r.exercises && r.exercises.length > 0) {
        r.exercises.forEach((ex: any) => {
          if (ex.sets && ex.sets.length > 0) {
            ex.sets.forEach((s: any) => {
              csvContent += `${r.date},${r.trainingType},${ex.name},${ex.sets.indexOf(s) + 1},${s.weight || 0},${s.reps || 0},${s.rest || '-'},${r.duration || 0},"${(r.notes || '').replace(/"/g, '""')}"\n`
            })
          } else {
            csvContent += `${r.date},${r.trainingType},${ex.name},-,-,-,-,${r.duration || 0},"${(r.notes || '').replace(/"/g, '""')}"\n`
          }
        })
      } else {
        csvContent += `${r.date},${r.trainingType},-,-,-,-,-,${r.duration || 0},"${(r.notes || '').replace(/"/g, '""')}"\n`
      }
    })
  } else if (type === 'diet') {
    const res = await db.collection('diet_records')
      .where(condition)
      .orderBy('date', 'desc')
      .get()

    csvContent = BOM + '日期,餐别,食物名称,分量(g),热量(kcal),蛋白质(g),碳水(g),脂肪(g),总热量(kcal),备注\n'

    res.data.forEach(r => {
      if (r.foods && r.foods.length > 0) {
        r.foods.forEach((f: any) => {
          csvContent += `${r.date},${r.mealType},${f.name},${f.weight || 0},${f.calories || 0},${f.protein || 0},${f.carbs || 0},${f.fat || 0},${r.totalCalories || 0},"${(r.notes || '').replace(/"/g, '""')}"\n`
        })
      }
    })
  }

  return {
    success: true,
    data: {
      type,
      csv: csvContent,
      filename: `FitPlan_${type}_${startDate || 'all'}_${endDate || 'all'}.csv`
    }
  }
}

/** 帮助函数：获取日期范围内的记录 */
async function getRecordsInRange(collection, openid, startDate, endDate) {
  const res = await db.collection(collection)
    .where({
      _openid: openid,
      date: _.gte(startDate).and(_.lte(endDate))
    })
    .get()
  return res.data
}

/** 计算周范围（本周一 ~ 本周日 + 上周一 ~ 上周日） */
function getWeekRange() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() + mondayOffset)
  thisMonday.setHours(0, 0, 0, 0)

  const thisSunday = new Date(thisMonday)
  thisSunday.setDate(thisMonday.getDate() + 6)
  thisSunday.setHours(23, 59, 59, 999)

  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(thisMonday.getDate() - 7)

  const lastSunday = new Date(thisSunday)
  lastSunday.setDate(thisSunday.getDate() - 7)

  return {
    thisWeekStart: fmtDateOnly(thisMonday),
    thisWeekEnd: fmtDateOnly(thisSunday),
    lastWeekStart: fmtDateOnly(lastMonday),
    lastWeekEnd: fmtDateOnly(lastSunday)
  }
}

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDateOnly(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function calcChange(oldVal, newVal) {
  if (oldVal === 0 && newVal === 0) return 0
  if (oldVal === 0) return newVal
  return Math.round(((newVal - oldVal) / oldVal) * 100)
}

function fmtDate(val) {
  if (val instanceof Date) return val.toISOString()
  if (typeof val === 'string') return val
  return ''
}
