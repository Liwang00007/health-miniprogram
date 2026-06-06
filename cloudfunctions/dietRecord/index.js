// cloudfunctions/dietRecord/index.js
// 饮食记录 CRUD
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
    console.error('dietRecord 异常:', err)
    return { success: false, errMsg: err.message || '操作失败' }
  }
}

/** 添加饮食记录 */
async function addRecord(openid, data) {
  if (!data) return { success: false, errMsg: '缺少数据' }

  const { date, mealType, foods, notes } = data

  if (!date) return { success: false, errMsg: '缺少记录日期' }
  if (!mealType) return { success: false, errMsg: '缺少餐别（早/中/晚/加餐）' }
  if (!foods || foods.length === 0) return { success: false, errMsg: '至少需要一种食物' }

  // 计算总热量
  const totalCalories = foods.reduce((sum, f) => {
    const cal = (f.calories || 0) * (f.weight || 0) / 100
    return sum + Math.round(cal)
  }, 0)

  const record = {
    _openid: openid,
    date,
    mealType,
    foods: foods.map(f => ({
      name: f.name || '',
      weight: f.weight || 0,
      calories: f.calories || 0,
      protein: f.protein || 0,
      carbs: f.carbs || 0,
      fat: f.fat || 0
    })),
    totalCalories,
    notes: notes || '',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const res = await db.collection('diet_records').add({ data: record })

  return {
    success: true,
    data: { _id: res._id, ...record, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() }
  }
}

/** 更新饮食记录 */
async function updateRecord(openid, id, data) {
  if (!id) return { success: false, errMsg: '缺少记录 ID' }

  const record = await db.collection('diet_records').doc(id).get()
  if (!record.data || record.data._openid !== openid) {
    return { success: false, errMsg: '记录不存在或无权操作' }
  }

  const updateData = { ...data, updatedAt: new Date() }

  // 如果修改了食物列表，重新计算总热量
  if (data.foods) {
    updateData.totalCalories = data.foods.reduce((sum, f) => {
      const cal = (f.calories || 0) * (f.weight || 0) / 100
      return sum + Math.round(cal)
    }, 0)
  }

  delete updateData._openid
  delete updateData._id

  await db.collection('diet_records').doc(id).update({ data: updateData })

  return { success: true, data: { _id: id, ...updateData } }
}

/** 删除饮食记录 */
async function deleteRecord(openid, id) {
  if (!id) return { success: false, errMsg: '缺少记录 ID' }

  const record = await db.collection('diet_records').doc(id).get()
  if (!record.data || record.data._openid !== openid) {
    return { success: false, errMsg: '记录不存在或无权操作' }
  }

  await db.collection('diet_records').doc(id).remove()

  return { success: true, data: { _id: id } }
}

/** 获取单条记录 */
async function getDetail(openid, id) {
  if (!id) return { success: false, errMsg: '缺少记录 ID' }

  const res = await db.collection('diet_records').doc(id).get()
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

/** 列表查询（按日期或日期范围，可按餐别筛选） */
async function listRecords(openid, opts) {
  const { date, startDate, endDate, mealType, page = 1, pageSize = 20 } = opts || {}
  const skip = (page - 1) * pageSize

  const condition = { _openid: openid }

  if (date) {
    condition.date = date
  } else if (startDate && endDate) {
    condition.date = _.gte(startDate).and(_.lte(endDate))
  }

  if (mealType) {
    condition.mealType = mealType
  }

  const [listRes, countRes] = await Promise.all([
    db.collection('diet_records')
      .where(condition)
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get(),
    db.collection('diet_records')
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
