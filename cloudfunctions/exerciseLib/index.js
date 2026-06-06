// cloudfunctions/exerciseLib/index.js
// 动作库管理：查询、搜索、添加自定义动作、初始化内置动作
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 内置 40 个健身动作
const BUILTIN_EXERCISES = [
  // 胸部 (6)
  { name: '杠铃卧推', bodyPart: '胸', description: '经典胸部增肌动作，仰卧推举杠铃' },
  { name: '哑铃卧推', bodyPart: '胸', description: '哑铃卧推可增加活动范围' },
  { name: '上斜杠铃卧推', bodyPart: '胸', description: '针对上胸肌的卧推变式' },
  { name: '哑铃飞鸟', bodyPart: '胸', description: '孤立刺激胸肌的拉伸动作' },
  { name: '绳索夹胸', bodyPart: '胸', description: '龙门架绳索向内夹胸' },
  { name: '双杠臂屈伸', bodyPart: '胸', description: '自重训练，刺激下胸与三头' },

  // 背部 (7)
  { name: '引体向上', bodyPart: '背', description: '经典背部宽度训练动作' },
  { name: '杠铃划船', bodyPart: '背', description: '增加背部厚度的核心动作' },
  { name: '高位下拉', bodyPart: '背', description: '替代引体向上，训练背阔肌' },
  { name: '坐姿划船', bodyPart: '背', description: '绳索器械水平划船' },
  { name: '单手哑铃划船', bodyPart: '背', description: '单侧孤立背部训练' },
  { name: '硬拉', bodyPart: '背', description: '全身性复合动作，重点锻炼下背/臀/腘绳肌' },
  { name: '山羊挺身', bodyPart: '背', description: '竖脊肌孤立训练' },

  // 腿部 (7)
  { name: '杠铃深蹲', bodyPart: '腿', description: '力量训练之王，全面锻炼下肢' },
  { name: '腿举', bodyPart: '腿', description: '倒蹬机推举，大重量腿部训练' },
  { name: '罗马尼亚硬拉', bodyPart: '腿', description: '侧重腘绳肌与臀部' },
  { name: '腿弯举', bodyPart: '腿', description: '孤立训练腘绳肌' },
  { name: '腿屈伸', bodyPart: '腿', description: '孤立训练股四头肌' },
  { name: '保加利亚分腿蹲', bodyPart: '腿', description: '单腿训练，改善不平衡' },
  { name: '臀桥', bodyPart: '腿', description: '臀部激活与力量训练' },

  // 肩部 (6)
  { name: '杠铃推举', bodyPart: '肩', description: '站姿/坐姿过头推举' },
  { name: '哑铃侧平举', bodyPart: '肩', description: '孤立训练三角肌中束' },
  { name: '哑铃前平举', bodyPart: '肩', description: '孤立训练三角肌前束' },
  { name: '俯身飞鸟', bodyPart: '肩', description: '训练三角肌后束' },
  { name: '阿诺德推举', bodyPart: '肩', description: '旋转式哑铃推举，全面刺激三角肌' },
  { name: '面拉', bodyPart: '肩', description: '绳索面拉，改善肩部健康' },

  // 臂部 (6)
  { name: '杠铃弯举', bodyPart: '臂', description: '经典肱二头肌训练' },
  { name: '哑铃集中弯举', bodyPart: '臂', description: '孤立刺激肱二头肌顶峰' },
  { name: '锤式弯举', bodyPart: '臂', description: '训练肱肌与前臂' },
  { name: '窄距卧推', bodyPart: '臂', description: '肱三头肌复合训练' },
  { name: '绳索下压', bodyPart: '臂', description: '龙门架绳索三头下压' },
  { name: '过头臂屈伸', bodyPart: '臂', description: '哑铃过头三头孤立训练' },

  // 核心 (8)
  { name: '平板支撑', bodyPart: '核心', description: '静态核心耐力训练' },
  { name: '卷腹', bodyPart: '核心', description: '基础腹直肌训练' },
  { name: '俄罗斯转体', bodyPart: '核心', description: '训练腹斜肌与旋转稳定性' },
  { name: '悬挂举腿', bodyPart: '核心', description: '高级下腹训练' },
  { name: '死虫式', bodyPart: '核心', description: '核心稳定性与协调训练' },
  { name: '鸟狗式', bodyPart: '核心', description: '脊柱稳定性训练' },
  { name: 'V字收腹', bodyPart: '核心', description: '同时训练上下腹' },
  { name: '侧平板', bodyPart: '核心', description: '腹斜肌与侧向稳定性训练' },
]

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { action } = event

  try {
    switch (action) {
      case 'init':
        return await initBuiltin()
      case 'list':
        return await listExercises(event)
      case 'search':
        return await searchExercises(event)
      case 'addCustom':
        return await addCustom(openid, event.data)
      case 'deleteCustom':
        return await deleteCustom(openid, event.id)
      default:
        return { success: false, errMsg: `未知操作: ${action}` }
    }
  } catch (err) {
    console.error('exerciseLib 异常:', err)
    return { success: false, errMsg: err.message || '操作失败' }
  }
}

/** 初始化内置动作库（首次部署时调用） */
async function initBuiltin() {
  const existRes = await db.collection('exercises')
    .where({ isCustom: false })
    .count()

  if (existRes.total > 0) {
    return { success: true, data: { message: '动作库已初始化', count: existRes.total } }
  }

  const tasks = BUILTIN_EXERCISES.map(ex => ({
    ...ex,
    videoUrl: '',
    imageUrl: '',
    isCustom: false,
    _openid: '',
    createdAt: new Date()
  }))

  // 批量插入（云数据库单次最多插入 100 条）
  const results = []
  for (let i = 0; i < tasks.length; i += 20) {
    const batch = tasks.slice(i, i + 20)
    const promises = batch.map(t => db.collection('exercises').add({ data: t }))
    const batchResults = await Promise.all(promises)
    results.push(...batchResults)
  }

  return { success: true, data: { message: '动作库初始化完成', count: results.length } }
}

/** 列表查询（按部位筛选） */
async function listExercises(opts) {
  const { bodyPart, page = 1, pageSize = 50 } = opts || {}
  const skip = (page - 1) * pageSize

  const condition = { isCustom: false }
  if (bodyPart) {
    condition.bodyPart = bodyPart
  }

  const [listRes, countRes] = await Promise.all([
    db.collection('exercises')
      .where(condition)
      .orderBy('name', 'asc')
      .skip(skip)
      .limit(pageSize)
      .get(),
    db.collection('exercises').where(condition).count()
  ])

  return {
    success: true,
    data: {
      list: listRes.data,
      total: countRes.total,
      page,
      pageSize
    }
  }
}

/** 模糊搜索动作 */
async function searchExercises(opts) {
  const { keyword, page = 1, pageSize = 20 } = opts || {}
  if (!keyword) return { success: false, errMsg: '请输入搜索关键词' }

  const skip = (page - 1) * pageSize
  const pattern = new RegExp(keyword, 'i')

  // 搜索内置动作 + 自定义动作
  const condition = {
    name: db.RegExp({ regexp: keyword, options: 'i' })
  }

  const [listRes, countRes] = await Promise.all([
    db.collection('exercises')
      .where(condition)
      .orderBy('name', 'asc')
      .skip(skip)
      .limit(pageSize)
      .get(),
    db.collection('exercises').where(condition).count()
  ])

  return {
    success: true,
    data: { list: listRes.data, total: countRes.total, page, pageSize }
  }
}

/** 添加自定义动作 */
async function addCustom(openid, data) {
  if (!data || !data.name) return { success: false, errMsg: '缺少动作名称' }

  const exercise = {
    name: data.name,
    bodyPart: data.bodyPart || '自定义',
    description: data.description || '',
    videoUrl: data.videoUrl || '',
    imageUrl: data.imageUrl || '',
    isCustom: true,
    _openid: openid,
    createdAt: new Date()
  }

  const res = await db.collection('exercises').add({ data: exercise })

  return { success: true, data: { _id: res._id, ...exercise, createdAt: exercise.createdAt.toISOString() } }
}

/** 删除自定义动作 */
async function deleteCustom(openid, id) {
  if (!id) return { success: false, errMsg: '缺少动作 ID' }

  const exercise = await db.collection('exercises').doc(id).get()
  if (!exercise.data || exercise.data._openid !== openid || !exercise.data.isCustom) {
    return { success: false, errMsg: '该动作不存在或无法删除' }
  }

  await db.collection('exercises').doc(id).remove()

  return { success: true, data: { _id: id } }
}
