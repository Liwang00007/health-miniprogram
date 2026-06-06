// cloudfunctions/goalManager/index.js
// 训练目标管理：CRUD + 进度更新 + 完成奖励
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
      case 'add':
        return await addGoal(openid, event.data)
      case 'update':
        return await updateGoal(openid, event.id, event.data)
      case 'delete':
        return await deleteGoal(openid, event.id)
      case 'detail':
        return await getDetail(openid, event.id)
      case 'list':
        return await listGoals(openid, event)
      case 'updateProgress':
        return await updateProgress(openid, event.id, event.progress)
      case 'complete':
        return await completeGoal(openid, event.id)
      default:
        return { success: false, errMsg: `未知操作: ${action}` }
    }
  } catch (err) {
    console.error('goalManager 异常:', err)
    return { success: false, errMsg: err.message || '操作失败' }
  }
}

/** 添加目标 */
async function addGoal(openid, data) {
  if (!data) return { success: false, errMsg: '缺少数据' }

  const { title, goalType, targetWeight, targetBodyFat, description, startDate, endDate } = data

  if (!title) return { success: false, errMsg: '请输入目标标题' }
  if (!goalType) return { success: false, errMsg: '请选择目标类型' }

  const goal = {
    _openid: openid,
    title,
    goalType: goalType || '其他',
    targetWeight: targetWeight || 0,
    targetBodyFat: targetBodyFat || 0,
    description: description || '',
    startDate: startDate || new Date().toISOString().slice(0, 10),
    endDate: endDate || '',
    progress: 0,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const res = await db.collection('goals').add({ data: goal })

  return {
    success: true,
    data: { _id: res._id, ...goal, createdAt: goal.createdAt.toISOString(), updatedAt: goal.updatedAt.toISOString() }
  }
}

/** 更新目标 */
async function updateGoal(openid, id, data) {
  if (!id) return { success: false, errMsg: '缺少目标 ID' }

  const goal = await db.collection('goals').doc(id).get()
  if (!goal.data || goal.data._openid !== openid) {
    return { success: false, errMsg: '目标不存在或无权操作' }
  }

  const updateData = { ...data, updatedAt: new Date() }
  delete updateData._openid
  delete updateData._id

  await db.collection('goals').doc(id).update({ data: updateData })

  return { success: true, data: { _id: id, ...updateData } }
}

/** 删除目标 */
async function deleteGoal(openid, id) {
  if (!id) return { success: false, errMsg: '缺少目标 ID' }

  const goal = await db.collection('goals').doc(id).get()
  if (!goal.data || goal.data._openid !== openid) {
    return { success: false, errMsg: '目标不存在或无权操作' }
  }

  await db.collection('goals').doc(id).remove()

  return { success: true, data: { _id: id } }
}

/** 获取目标详情 */
async function getDetail(openid, id) {
  if (!id) return { success: false, errMsg: '缺少目标 ID' }

  const res = await db.collection('goals').doc(id).get()
  if (!res.data || res.data._openid !== openid) {
    return { success: false, errMsg: '目标不存在' }
  }

  return {
    success: true,
    data: { ...res.data, createdAt: fmtDate(res.data.createdAt), updatedAt: fmtDate(res.data.updatedAt) }
  }
}

/** 查询目标列表 */
async function listGoals(openid, opts) {
  const { status, page = 1, pageSize = 10 } = opts || {}
  const skip = (page - 1) * pageSize

  const condition = { _openid: openid }
  if (status) condition.status = status

  const [listRes, countRes] = await Promise.all([
    db.collection('goals')
      .where(condition)
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get(),
    db.collection('goals').where(condition).count()
  ])

  return {
    success: true,
    data: {
      list: listRes.data.map(g => ({ ...g, createdAt: fmtDate(g.createdAt), updatedAt: fmtDate(g.updatedAt) })),
      total: countRes.total, page, pageSize
    }
  }
}

/** 更新目标进度 */
async function updateProgress(openid, id, progress) {
  if (!id) return { success: false, errMsg: '缺少目标 ID' }
  if (progress === undefined || progress === null) return { success: false, errMsg: '缺少进度值' }

  const p = Math.max(0, Math.min(100, Number(progress)))

  const goal = await db.collection('goals').doc(id).get()
  if (!goal.data || goal.data._openid !== openid) {
    return { success: false, errMsg: '目标不存在或无权操作' }
  }

  const updateData = {
    progress: p,
    status: p >= 100 ? 'completed' : 'active',
    updatedAt: new Date()
  }

  await db.collection('goals').doc(id).update({ data: updateData })

  // 目标完成时自动发放积分
  if (p >= 100 && goal.data.status !== 'completed') {
    await db.collection('users')
      .where({ _openid: openid })
      .update({
        data: {
          points: _.inc(2),
          totalPoints: _.inc(2)
        }
      })

    return {
      success: true,
      data: { _id: id, ...updateData, pointsAwarded: 2, message: '目标完成！+2 积分' }
    }
  }

  return { success: true, data: { _id: id, ...updateData } }
}

/** 手动标记完成 */
async function completeGoal(openid, id) {
  return await updateProgress(openid, id, 100)
}

function fmtDate(val) {
  if (val instanceof Date) return val.toISOString()
  if (typeof val === 'string') return val
  return ''
}
