// cloudfunctions/planManager/index.js
// 计划管理：AI 训练计划 + AI 饮食计划 — 生成、CRUD、积分消耗
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 积分消耗配置
const POINTS_COST = {
  training: 3,
  diet: 2
}

// 训练计划模板动作库
const EXERCISE_POOL = {
  '胸': ['杠铃卧推', '哑铃卧推', '上斜杠铃卧推', '哑铃飞鸟', '绳索夹胸'],
  '背': ['引体向上', '杠铃划船', '高位下拉', '坐姿划船', '单手哑铃划船'],
  '腿': ['杠铃深蹲', '腿举', '罗马尼亚硬拉', '腿弯举', '保加利亚分腿蹲'],
  '肩': ['杠铃推举', '哑铃侧平举', '哑铃前平举', '俯身飞鸟', '面拉'],
  '臂': ['杠铃弯举', '哑铃集中弯举', '绳索下压', '过头臂屈伸', '锤式弯举', '窄距卧推'],
  '核心': ['平板支撑', '卷腹', '俄罗斯转体', '悬挂举腿', '死虫式']
}

// 饮食方案模板（每日总热量约 2000-2500kcal，根据目标调整）
const DIET_TEMPLATES = {
  '增肌': {
    factor: 1.2,
    meals: [
      { mealType: '早', foods: [
        { name: '全麦面包', weight: 100 }, { name: '鸡蛋（煮）', weight: 150 },
        { name: '全脂牛奶', weight: 250 }, { name: '香蕉', weight: 120 }
      ]},
      { mealType: '中', foods: [
        { name: '白米饭', weight: 300 }, { name: '鸡胸肉', weight: 200 },
        { name: '西兰花', weight: 150 }, { name: '橄榄油', weight: 10 }
      ]},
      { mealType: '晚', foods: [
        { name: '糙米饭', weight: 250 }, { name: '三文鱼', weight: 180 },
        { name: '菠菜', weight: 150 }
      ]},
      { mealType: '加餐', foods: [
        { name: '希腊酸奶', weight: 200 }, { name: '核桃', weight: 30 },
        { name: '蛋白粉（乳清）', weight: 30 }
      ]}
    ]
  },
  '减脂': {
    factor: 0.7,
    meals: [
      { mealType: '早', foods: [
        { name: '燕麦片', weight: 60 }, { name: '鸡蛋白', weight: 150 },
        { name: '脱脂牛奶', weight: 250 }, { name: '苹果', weight: 150 }
      ]},
      { mealType: '中', foods: [
        { name: '糙米饭', weight: 150 }, { name: '虾仁', weight: 180 },
        { name: '西兰花', weight: 200 }, { name: '番茄', weight: 100 }
      ]},
      { mealType: '晚', foods: [
        { name: '红薯', weight: 150 }, { name: '鸡胸肉', weight: 150 },
        { name: '生菜', weight: 200 }, { name: '黄瓜', weight: 100 }
      ]},
      { mealType: '加餐', foods: [
        { name: '酸奶（原味）', weight: 150 }, { name: '蓝莓', weight: 80 }
      ]}
    ]
  },
  '维持': {
    factor: 0.95,
    meals: [
      { mealType: '早', foods: [
        { name: '全麦面包', weight: 80 }, { name: '鸡蛋（煮）', weight: 100 },
        { name: '全脂牛奶', weight: 200 }, { name: '香蕉', weight: 100 }
      ]},
      { mealType: '中', foods: [
        { name: '白米饭', weight: 250 }, { name: '牛肉（瘦）', weight: 150 },
        { name: '青椒', weight: 100 }, { name: '胡萝卜', weight: 80 }
      ]},
      { mealType: '晚', foods: [
        { name: '面条（煮）', weight: 200 }, { name: '鸡腿肉', weight: 150 },
        { name: '芹菜', weight: 150 }, { name: '番茄', weight: 100 }
      ]},
      { mealType: '加餐', foods: [
        { name: '酸奶（原味）', weight: 150 }, { name: '杏仁', weight: 20 }
      ]}
    ]
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, errMsg: '未登录' }
  }

  const { action } = event

  try {
    switch (action) {
      case 'generate':
        return await generatePlan(openid, event)
      case 'save':
        return await savePlan(openid, event)
      case 'list':
        return await listPlans(openid, event)
      case 'detail':
        return await getDetail(openid, event)
      case 'delete':
        return await deletePlan(openid, event)
      case 'updateStatus':
        return await updateStatus(openid, event)
      default:
        return { success: false, errMsg: `未知操作: ${action}` }
    }
  } catch (err) {
    console.error('planManager 异常:', err)
    return { success: false, errMsg: err.message || '操作失败' }
  }
}

/**
 * AI 计划生成（模板 + 随机化方案）
 * 参数：
 *   planType: 'training' | 'diet'
 *   params: 定制参数
 *   confirmCost: 用户确认消耗积分
 */
async function generatePlan(openid, event) {
  const { planType, params, confirmCost } = event
  if (!planType) return { success: false, errMsg: '缺少计划类型' }

  const cost = POINTS_COST[planType] || 3

  // 检查积分
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .field({ points: true })
    .get()

  if (userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }

  const currentPoints = userRes.data[0].points
  if (currentPoints < cost) {
    return {
      success: false,
      errMsg: `积分不足，需要 ${cost} 积分，当前 ${currentPoints} 积分`,
      code: 'INSUFFICIENT_POINTS'
    }
  }

  // 扣除积分（乐观扣除，失败时退还）
  await db.collection('users')
    .where({ _openid: openid })
    .update({ data: { points: _.inc(-cost) } })

  try {
    let planData
    if (planType === 'training') {
      planData = generateTrainingPlan(params)
    } else if (planType === 'diet') {
      planData = generateDietPlan(params)
    } else {
      throw new Error('不支持的计划类型')
    }

    return {
      success: true,
      data: {
        planType,
        params,
        pointsCost: cost,
        plan: planData,
        message: `已消耗 ${cost} 积分生成计划`
      }
    }
  } catch (err) {
    // 退还积分
    await db.collection('users')
      .where({ _openid: openid })
      .update({ data: { points: _.inc(cost) } })

    throw err
  }
}

/** 生成训练计划 */
function generateTrainingPlan(params) {
  const {
    targetMuscles = ['胸', '背', '腿'],
    days = 7,
    level = '新手',
    equipment = [],
    injury = ''
  } = params || {}

  // 根据水平确定训练量
  const levelConfig = {
    '新手': { exercisesPerDay: 4, setsPerExercise: 3, repsRange: [8, 12], weightFactor: 0.6 },
    '进阶': { exercisesPerDay: 5, setsPerExercise: 4, repsRange: [6, 10], weightFactor: 0.8 },
    '高阶': { exercisesPerDay: 6, setsPerExercise: 5, repsRange: [4, 8], weightFactor: 1.0 }
  }

  const config = levelConfig[level] || levelConfig['新手']

  const schedule = []
  const muscles = targetMuscles.length > 0 ? targetMuscles : Object.keys(EXERCISE_POOL)

  // 根据伤病情况排除风险动作
  const excludedMuscles = new Set()
  if (injury) {
    const injuryLower = injury.toLowerCase()
    if (injuryLower.includes('腰') || injuryLower.includes('背')) excludedMuscles.add('背')
    if (injuryLower.includes('膝') || injuryLower.includes('腿')) excludedMuscles.add('腿')
    if (injuryLower.includes('肩')) excludedMuscles.add('肩')
  }

  const safeMuscles = muscles.filter(m => !excludedMuscles.has(m))

  for (let day = 1; day <= days; day++) {
    // 循环分配肌群
    const dayMuscle = safeMuscles[(day - 1) % safeMuscles.length]

    // 每天加入核心训练
    const musclesToTrain = [dayMuscle]
    if (dayMuscle !== '核心') {
      musclesToTrain.push('核心')
    }

    const dayExercises = []
    let exerciseCount = 0

    for (const muscle of musclesToTrain) {
      const pool = EXERCISE_POOL[muscle] || []
      if (pool.length === 0) continue

      // 随机选取动作（每天每个肌群 1-3 个动作）
      const count = Math.min(config.exercisesPerDay - exerciseCount, pool.length, 3)

      // 伪随机选取（基于天数确保可复现）
      const shuffled = [...pool].sort(() => 0.5 - Math.sin(day * 7 + muscle.length))
      const selected = shuffled.slice(0, Math.max(1, count))

      selected.forEach(name => {
        const [minReps, maxReps] = config.repsRange
        const reps = minReps + Math.floor((day * 3 + name.length) % (maxReps - minReps + 1))
        dayExercises.push({
          name,
          bodyPart: muscle,
          sets: Array.from({ length: config.setsPerExercise }, (_, i) => ({
            weight: Math.round(config.weightFactor * (20 + i * 5 + muscle.length * 2)),
            reps,
            rest: level === '新手' ? 90 : level === '进阶' ? 75 : 60
          }))
        })
      })

      exerciseCount += selected.length
      if (exerciseCount >= config.exercisesPerDay) break
    }

    schedule.push({ day, exercises: dayExercises })
  }

  return {
    name: `${days}天${level}${targetMuscles.slice(0, 2).join('+')}训练计划`,
    schedule,
    config
  }
}

/** 生成饮食计划 */
function generateDietPlan(params) {
  const {
    goal = '增肌',
    dailyCalories = 2200,
    days = 7
  } = params || {}

  const template = DIET_TEMPLATES[goal] || DIET_TEMPLATES['维持']

  const schedule = []
  for (let day = 1; day <= days; day++) {
    // 每天微调变化（±10% 热量波动模拟真实饮食）
    const dayFactor = 0.9 + (Math.sin(day * 2.5) + 1) * 0.1

    const meals = template.meals.map(meal => ({
      mealType: meal.mealType,
      foods: meal.foods.map(f => ({
        name: f.name,
        weight: Math.round(f.weight * dayFactor),
        calories: 0 // 客户端可根据食物库查询并计算
      }))
    }))

    schedule.push({ day, meals })
  }

  return {
    name: `${days}天${goal}饮食计划`,
    schedule,
    dayFactor: template.factor
  }
}

/** 保存计划到数据库 */
async function savePlan(openid, event) {
  const { planType, data } = event
  if (!planType || !data) return { success: false, errMsg: '缺少计划类型或数据' }

  const collectionName = planType === 'training' ? 'training_plans' : 'diet_plans'
  const planData = {
    _openid: openid,
    type: data.type || 'AI',
    name: data.name || '',
    params: data.params || {},
    schedule: data.schedule || [],
    status: data.status || 'active',
    pointsCost: data.pointsCost || POINTS_COST[planType] || 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const res = await db.collection(collectionName).add({ data: planData })

  return {
    success: true,
    data: { _id: res._id, ...planData, createdAt: planData.createdAt.toISOString(), updatedAt: planData.updatedAt.toISOString() }
  }
}

/** 查询计划列表 */
async function listPlans(openid, event) {
  const { planType, status, page = 1, pageSize = 10 } = event || {}
  if (!planType) return { success: false, errMsg: '缺少计划类型' }

  const collectionName = planType === 'training' ? 'training_plans' : 'diet_plans'
  const skip = (page - 1) * pageSize

  const condition = { _openid: openid }
  if (status) condition.status = status

  const [listRes, countRes] = await Promise.all([
    db.collection(collectionName)
      .where(condition)
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get(),
    db.collection(collectionName).where(condition).count()
  ])

  return {
    success: true,
    data: {
      list: listRes.data.map(r => ({ ...r, createdAt: fmtDate(r.createdAt), updatedAt: fmtDate(r.updatedAt) })),
      total: countRes.total, page, pageSize
    }
  }
}

/** 获取计划详情 */
async function getDetail(openid, event) {
  const { planType, id } = event
  if (!planType || !id) return { success: false, errMsg: '缺少参数' }

  const collectionName = planType === 'training' ? 'training_plans' : 'diet_plans'

  const res = await db.collection(collectionName).doc(id).get()
  if (!res.data || res.data._openid !== openid) {
    return { success: false, errMsg: '计划不存在' }
  }

  return {
    success: true,
    data: { ...res.data, createdAt: fmtDate(res.data.createdAt), updatedAt: fmtDate(res.data.updatedAt) }
  }
}

/** 删除计划 */
async function deletePlan(openid, event) {
  const { planType, id } = event
  if (!planType || !id) return { success: false, errMsg: '缺少参数' }

  const collectionName = planType === 'training' ? 'training_plans' : 'diet_plans'

  const res = await db.collection(collectionName).doc(id).get()
  if (!res.data || res.data._openid !== openid) {
    return { success: false, errMsg: '计划不存在或无权操作' }
  }

  await db.collection(collectionName).doc(id).remove()

  return { success: true, data: { _id: id } }
}

/** 更新计划状态 */
async function updateStatus(openid, event) {
  const { planType, id, status } = event
  if (!planType || !id || !status) return { success: false, errMsg: '缺少参数' }

  const validStatuses = ['active', 'completed', 'archived']
  if (!validStatuses.includes(status)) {
    return { success: false, errMsg: '无效状态' }
  }

  const collectionName = planType === 'training' ? 'training_plans' : 'diet_plans'

  const res = await db.collection(collectionName).doc(id).get()
  if (!res.data || res.data._openid !== openid) {
    return { success: false, errMsg: '计划不存在或无权操作' }
  }

  await db.collection(collectionName).doc(id).update({
    data: { status, updatedAt: new Date() }
  })

  return { success: true, data: { _id: id, status } }
}

function fmtDate(val) {
  if (val instanceof Date) return val.toISOString()
  if (typeof val === 'string') return val
  return ''
}
