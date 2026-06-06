// cloudfunctions/userLogin/index.js
// 用户登录/注册 + 个人信息更新 + 积分管理
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, errMsg: '未能获取用户 openId' }
  }

  const { action, data } = event

  try {
    switch (action) {
      case 'login':
        return await handleLogin(openid)
      case 'updateProfile':
        return await updateProfile(openid, data)
      case 'getProfile':
        return await getProfile(openid)
      case 'getPoints':
        return await getPoints(openid)
      default:
        // 兼容旧版无 action 调用（默认登录）
        return await handleLogin(openid)
    }
  } catch (err) {
    console.error('userLogin 异常:', err)
    return { success: false, errMsg: err.message || '操作失败' }
  }
}

/** 用户登录/注册 */
async function handleLogin(openid) {
  const userQuery = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (userQuery.data.length === 0) {
    // 新用户注册
    const newUser = {
      _openid: openid,
      nickName: '',
      avatarUrl: '',
      points: 10,
      totalPoints: 10,
      trainingCount: 0,
      totalDuration: 0,
      streakDays: 0,
      maxStreakDays: 0,
      createdAt: new Date(),
      lastLoginAt: new Date()
    }

    const addResult = await db.collection('users').add({ data: newUser })

    console.log('新用户注册:', openid)
    return {
      success: true,
      data: {
        _id: addResult._id,
        _openid: openid,
        nickName: '',
        avatarUrl: '',
        points: 10,
        totalPoints: 10,
        trainingCount: 0,
        totalDuration: 0,
        streakDays: 0,
        maxStreakDays: 0,
        createdAt: newUser.createdAt.toISOString(),
        lastLoginAt: newUser.lastLoginAt.toISOString(),
        isNewUser: true
      }
    }
  }

  // 老用户：更新最后登录时间
  const user = userQuery.data[0]
  await db.collection('users').doc(user._id).update({
    data: { lastLoginAt: new Date() }
  })

  console.log('用户登录:', openid)
  return {
    success: true,
    data: {
      _id: user._id,
      _openid: openid,
      nickName: user.nickName || '',
      avatarUrl: user.avatarUrl || '',
      points: user.points,
      totalPoints: user.totalPoints || 0,
      trainingCount: user.trainingCount || 0,
      totalDuration: user.totalDuration || 0,
      streakDays: user.streakDays || 0,
      maxStreakDays: user.maxStreakDays || 0,
      createdAt: fmtDate(user.createdAt),
      lastLoginAt: new Date().toISOString(),
      isNewUser: false
    }
  }
}

/** 更新用户个人信息 */
async function updateProfile(openid, data) {
  if (!data || Object.keys(data).length === 0) {
    return { success: false, errMsg: '没有需要更新的数据' }
  }

  const allowedFields = ['nickName', 'avatarUrl']
  const updateData = {}
  for (const key of allowedFields) {
    if (data[key] !== undefined) {
      updateData[key] = data[key]
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { success: false, errMsg: '无可更新的字段' }
  }

  await db.collection('users')
    .where({ _openid: openid })
    .update({ data: updateData })

  return { success: true, data: updateData }
}

/** 获取用户信息 */
async function getProfile(openid) {
  const res = await db.collection('users')
    .where({ _openid: openid })
    .get()

  if (res.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }

  const user = res.data[0]
  return {
    success: true,
    data: {
      _id: user._id,
      _openid: openid,
      nickName: user.nickName || '',
      avatarUrl: user.avatarUrl || '',
      points: user.points,
      totalPoints: user.totalPoints || 0,
      trainingCount: user.trainingCount || 0,
      totalDuration: user.totalDuration || 0,
      streakDays: user.streakDays || 0,
      maxStreakDays: user.maxStreakDays || 0,
      createdAt: fmtDate(user.createdAt),
      lastLoginAt: fmtDate(user.lastLoginAt)
    }
  }
}

/** 获取积分明细 */
async function getPoints(openid) {
  const res = await db.collection('users')
    .where({ _openid: openid })
    .field({ points: true, totalPoints: true })
    .get()

  if (res.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }

  return {
    success: true,
    data: {
      points: res.data[0].points,
      totalPoints: res.data[0].totalPoints
    }
  }
}

/** 安全格式化日期 */
function fmtDate(val) {
  if (val instanceof Date) return val.toISOString()
  if (typeof val === 'string') return val
  return ''
}
