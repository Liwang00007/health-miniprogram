// cloudfunctions/userLogin/index.js
// 用户登录/注册云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { code } = event

  // 获取用户 openId（云函数中可直接获取）
  const openid = wxContext.OPENID

  if (!openid) {
    return {
      success: false,
      errMsg: '未能获取用户 openId，请检查云函数是否部署'
    }
  }

  try {
    // 查询用户是否已存在
    const userQuery = await db.collection('users')
      .where({
        _openid: openid
      })
      .get()

    let userInfo
    let isNewUser = false

    if (userQuery.data.length === 0) {
      // 新用户：创建用户记录
      const newUser = {
        _openid: openid,
        nickName: '',
        avatarUrl: '',
        points: 10,           // 新用户赠送 10 积分
        trainingCount: 0,
        totalDuration: 0,
        streakDays: 0,
        createdAt: new Date(),
        lastLoginAt: new Date()
      }

      const addResult = await db.collection('users').add({
        data: newUser
      })

      userInfo = {
        ...newUser,
        _id: addResult._id,
        createdAt: newUser.createdAt.toISOString(),
        lastLoginAt: newUser.lastLoginAt.toISOString(),
        isNewUser: true
      }
      isNewUser = true

      console.log('新用户注册成功:', openid)
    } else {
      // 已有用户：更新最后登录时间
      const existingUser = userQuery.data[0]

      await db.collection('users')
        .doc(existingUser._id)
        .update({
          data: {
            lastLoginAt: new Date()
          }
        })

      userInfo = {
        ...existingUser,
        lastLoginAt: new Date().toISOString(),
        createdAt: existingUser.createdAt instanceof Date
          ? existingUser.createdAt.toISOString()
          : existingUser.createdAt,
        isNewUser: false
      }

      console.log('用户登录成功:', openid, existingUser.nickName)
    }

    // 返回用户信息（移除敏感字段）
    return {
      success: true,
      data: {
        _openid: openid,
        _id: userInfo._id,
        nickName: userInfo.nickName || '',
        avatarUrl: userInfo.avatarUrl || '',
        points: userInfo.points,
        trainingCount: userInfo.trainingCount || 0,
        totalDuration: userInfo.totalDuration || 0,
        streakDays: userInfo.streakDays || 0,
        createdAt: userInfo.createdAt,
        lastLoginAt: userInfo.lastLoginAt,
        isNewUser: userInfo.isNewUser
      }
    }
  } catch (err) {
    console.error('用户登录云函数异常:', err)
    return {
      success: false,
      errMsg: err.message || '登录失败，请稍后重试'
    }
  }
}
