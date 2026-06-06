// cloudfunctions/uploadImage/index.js
// 图片上传保存云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return {
      success: false,
      errMsg: '未登录，请先登录'
    }
  }

  const {
    fileID,         // 云存储文件 ID（由客户端 wx.cloud.uploadFile 返回）
    fileName,       // 原始文件名
    fileType,       // 文件类型，如 image/jpeg
    size,           // 文件大小 (bytes)
    category,       // 分类：avatar / food / training
    description     // 描述（可选）
  } = event

  // 参数校验
  if (!fileID) {
    return {
      success: false,
      errMsg: '缺少 fileID 参数'
    }
  }

  try {
    // 在 images 集合创建记录
    const imageRecord = {
      _openid: openid,
      fileID: fileID,
      fileName: fileName || 'unknown',
      fileType: fileType || 'image/jpeg',
      size: size || 0,
      category: category || 'general',
      description: description || '',
      uploadedAt: new Date()
    }

    const addResult = await db.collection('images').add({
      data: imageRecord
    })

    console.log('图片记录保存成功:', addResult._id, '用户:', openid)

    return {
      success: true,
      data: {
        imageId: addResult._id,
        fileID: fileID,
        uploadedAt: imageRecord.uploadedAt.toISOString()
      }
    }
  } catch (err) {
    console.error('图片保存云函数异常:', err)
    return {
      success: false,
      errMsg: err.message || '图片保存失败，请稍后重试'
    }
  }
}
