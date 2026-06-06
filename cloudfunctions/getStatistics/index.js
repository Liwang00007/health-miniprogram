// cloudfunctions/getStatistics/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) return { success: false, errMsg: '未获取到用户身份' }

  const { startDate, endDate } = event

  try {
    // 聚合训练数据
    const trainingRecords = await db.collection('training_records')
      .where({
        _openid: openid,
        recordDate: db.command.gte(startDate).and(db.command.lte(endDate)),
      }).get()

    const dietRecords = await db.collection('diet_records')
      .where({
        _openid: openid,
        recordDate: db.command.gte(startDate).and(db.command.lte(endDate)),
      }).get()

    // 统计数据
    let totalTrainingMinutes = 0
    let totalTrainingCount = trainingRecords.data.length
    const bodyPartCount = {}

    trainingRecords.data.forEach((r) => {
      totalTrainingMinutes += r.duration || 0
      if (r.exercises) {
        r.exercises.forEach((ex) => {
          const part = ex.bodyPart || '其他'
          bodyPartCount[part] = (bodyPartCount[part] || 0) + 1
        })
      }
    })

    let totalCaloriesIntake = 0
    let totalProtein = 0
    dietRecords.data.forEach((r) => {
      totalCaloriesIntake += r.calories || 0
      totalProtein += r.protein || 0
    })

    // 活跃天数（训练 + 饮食记录日期取并集）
    const allDates = new Set()
    trainingRecords.data.forEach((r) => {
      if (r.recordDate) allDates.add(r.recordDate)
    })
    dietRecords.data.forEach((r) => {
      if (r.recordDate) allDates.add(r.recordDate)
    })

    return {
      success: true,
      data: {
        totalTrainingCount,
        totalTrainingMinutes,
        totalCaloriesIntake,
        totalProtein,
        bodyPartDistribution: bodyPartCount,
        recordDays: allDates.size,
      },
    }
  } catch (err) {
    return { success: false, errMsg: err.message }
  }
}
