// cloudfunctions/trainingRecord/index.js
// 训练记录 CRUD
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
        return await addRecord(openid, event.data)
      case 'update':
        return await updateRecord(openid, event.id, event.data)
      case 'delete':
        return await deleteRecord(openid, event.id)
      case 'detail':
        return await getDetail(openid, event.id)
      case 'list':
        return await listRecords(openid, event)
      default:
        return { success: false, errMsg: `未知操作: ${action}` }
    }
  } catch (err) {
    console.error('trainingRecord 异常:', err)
    return { success: false, errMsg: err.message || '操作失败' }
  }
}

/** 添加训练记录 */
async function addRecord(openid, data) {
  if (!data) return { success: false, errMsg: '缺少数据' }

  const { date, trainingType, exercises, duration, notes } = data

  if (!date) return { success: false, errMsg: '缺少训练日期' }
  if (!trainingType) return { success: false, errMsg: '缺少训练类型' }
  if (!exercises || exercises.length === 0) return { success: false, errMsg: '至少需要一个训练动作' }

  const record = {
    _openid: openid,
    date,
    trainingType,
    exercises: exercises.map(ex => ({
      name: ex.name || '',
      bodyPart: ex.bodyPart || '',
      sets: (ex.sets || []).map(s => ({
        weight: s.weight || 0,
        reps: s.reps || 0,
        rest: s.rest || 60
      }))
    })),
    duration: duration || 0,
    notes: notes || '',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const res = await db.collection('training_records').add({ data: record })

  // 更新用户训练统计
  await db.collection('users')
    .where({ _openid: openid })
    .update({
      data: {
        trainingCount: _.inc(1),
        totalDuration: _.inc(record.duration)
      }
    })

  return {
    success: true,
    data: { _id: res._id, ...record, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() }
  }
}

/** 更新训练记录 */
async function updateRecord(openid, id, data) {
  if (!id) return { success: false, errMsg: '缺少记录 ID' }

  const record = await db.collection('training_records').doc(id).get()
  if (!record.data || record.data._openid !== openid) {
    return { success: false, errMsg: '记录不存在或无权操作' }
  }

  const oldDuration = record.data.duration || 0
  const updateData = { ...data, updatedAt: new Date() }

  // 不允许修改 _openid
  delete updateData._openid
  delete updateData._id

  await db.collection('training_records').doc(id).update({ data: updateData })

  // 如果时长有变化，更新用户统计
  if (data.duration !== undefined && data.duration !== oldDuration) {
    const diff = data.duration - oldDuration
    await db.collection('users')
      .where({ _openid: openid })
      .update({ data: { totalDuration: _.inc(diff) } })
  }

  return { success: true, data: { _id: id, ...updateData } }
}

/** 删除训练记录 */
async function deleteRecord(openid, id) {
  if (!id) return { success: false, errMsg: '缺少记录 ID' }

  const record = await db.collection('training_records').doc(id).get()
  if (!record.data || record.data._openid !== openid) {
    return { success: false, errMsg: '记录不存在或无权操作' }
  }

  await db.collection('training_records').doc(id).remove()

  // 更新用户训练统计
  const duration = record.data.duration || 0
  await db.collection('users')
    .where({ _openid: openid })
    .update({
      data: {
        trainingCount: _.inc(-1),
        totalDuration: _.inc(-duration)
      }
    })

  return { success: true, data: { _id: id } }
}

/** 获取单条记录 */
async function getDetail(openid, id) {
  if (!id) return { success: false, errMsg: '缺少记录 ID' }

  const res = await db.collection('training_records').doc(id).get()
  if (!res.data || res.data._openid !== openid) {
    return { success: false, errMsg: '记录不存在' }
  }

  return {
    success: true,
    data: {
      ...res.data,
      createdAt: fmtDate(res.data.createdAt),
      updatedAt: fmtDate(res.data.updatedAt)
    }
  }
}

/** 列表查询 */
async function listRecords(openid, opts) {
  const { date, startDate, endDate, page = 1, pageSize = 20 } = opts || {}
  const skip = (page - 1) * pageSize

  const condition = { _openid: openid }

  if (date) {
    condition.date = date
  } else if (startDate && endDate) {
    condition.date = _.gte(startDate).and(_.lte(endDate))
  }

  const [listRes, countRes] = await Promise.all([
    db.collection('training_records')
      .where(condition)
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get(),
    db.collection('training_records')
      .where(condition)
      .count()
  ])

  return {
    success: true,
    data: {
      list: listRes.data.map(r => ({
        ...r,
        createdAt: fmtDate(r.createdAt),
        updatedAt: fmtDate(r.updatedAt)
      })),
      total: countRes.total,
      page,
      pageSize
    }
  }
}

function fmtDate(val) {
  if (val instanceof Date) return val.toISOString()
  if (typeof val === 'string') return val
  return ''
}
