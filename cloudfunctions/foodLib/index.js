// cloudfunctions/foodLib/index.js
// 食物库管理：查询、搜索、添加自定义食物、初始化内置食物
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 内置 50 种常见食物（每100g 营养数据）
const BUILTIN_FOODS = [
  // 主食类 (8)
  { name: '白米饭', calories: 116, protein: 2.6, carbs: 25.9, fat: 0.3, unit: 'g', category: '主食' },
  { name: '全麦面包', calories: 247, protein: 13, carbs: 41, fat: 3.4, unit: 'g', category: '主食' },
  { name: '燕麦片', calories: 367, protein: 13.5, carbs: 66.3, fat: 6.7, unit: 'g', category: '主食' },
  { name: '红薯', calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1, unit: 'g', category: '主食' },
  { name: '玉米', calories: 112, protein: 4, carbs: 22.8, fat: 1.2, unit: 'g', category: '主食' },
  { name: '面条（煮）', calories: 110, protein: 3.5, carbs: 22, fat: 0.5, unit: 'g', category: '主食' },
  { name: '糙米饭', calories: 123, protein: 2.7, carbs: 25.1, fat: 0.9, unit: 'g', category: '主食' },
  { name: '小米粥', calories: 46, protein: 1.4, carbs: 8.4, fat: 0.7, unit: 'g', category: '主食' },

  // 肉类 (8)
  { name: '鸡胸肉', calories: 133, protein: 31, carbs: 0, fat: 1.2, unit: 'g', category: '肉类' },
  { name: '猪瘦肉', calories: 143, protein: 20.3, carbs: 1.5, fat: 6.2, unit: 'g', category: '肉类' },
  { name: '牛肉（瘦）', calories: 125, protein: 22.3, carbs: 0.2, fat: 4.2, unit: 'g', category: '肉类' },
  { name: '鸡腿肉', calories: 181, protein: 16, carbs: 0, fat: 13, unit: 'g', category: '肉类' },
  { name: '猪排骨', calories: 264, protein: 18.3, carbs: 0, fat: 20.4, unit: 'g', category: '肉类' },
  { name: '牛腩', calories: 202, protein: 17.1, carbs: 0, fat: 15.1, unit: 'g', category: '肉类' },
  { name: '羊肉', calories: 203, protein: 19, carbs: 0, fat: 14.1, unit: 'g', category: '肉类' },
  { name: '鸭肉', calories: 240, protein: 15.5, carbs: 0.1, fat: 19.7, unit: 'g', category: '肉类' },

  // 蛋奶类 (6)
  { name: '鸡蛋（煮）', calories: 144, protein: 13.3, carbs: 1.5, fat: 9.5, unit: 'g', category: '蛋奶' },
  { name: '鸡蛋白', calories: 48, protein: 11.6, carbs: 0.7, fat: 0.1, unit: 'g', category: '蛋奶' },
  { name: '全脂牛奶', calories: 61, protein: 3, carbs: 4.7, fat: 3.2, unit: 'ml', category: '蛋奶' },
  { name: '脱脂牛奶', calories: 35, protein: 3.4, carbs: 5, fat: 0.3, unit: 'ml', category: '蛋奶' },
  { name: '酸奶（原味）', calories: 72, protein: 2.5, carbs: 9.3, fat: 2.7, unit: 'g', category: '蛋奶' },
  { name: '希腊酸奶', calories: 97, protein: 9, carbs: 4, fat: 5, unit: 'g', category: '蛋奶' },

  // 水产类 (5)
  { name: '三文鱼', calories: 208, protein: 20.4, carbs: 0, fat: 13.4, unit: 'g', category: '水产' },
  { name: '虾仁', calories: 99, protein: 20.6, carbs: 0.2, fat: 1.2, unit: 'g', category: '水产' },
  { name: '金枪鱼（罐头水浸）', calories: 113, protein: 26, carbs: 0, fat: 1.1, unit: 'g', category: '水产' },
  { name: '鲈鱼', calories: 105, protein: 18.6, carbs: 0, fat: 3.4, unit: 'g', category: '水产' },
  { name: '鳕鱼', calories: 82, protein: 17.8, carbs: 0, fat: 0.7, unit: 'g', category: '水产' },

  // 蔬菜类 (8)
  { name: '西兰花', calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, unit: 'g', category: '蔬菜' },
  { name: '菠菜', calories: 23, protein: 2.9, carbs: 2.8, fat: 0.4, unit: 'g', category: '蔬菜' },
  { name: '番茄', calories: 18, protein: 0.9, carbs: 3.5, fat: 0.2, unit: 'g', category: '蔬菜' },
  { name: '黄瓜', calories: 16, protein: 0.7, carbs: 2.9, fat: 0.1, unit: 'g', category: '蔬菜' },
  { name: '胡萝卜', calories: 41, protein: 1.0, carbs: 9.0, fat: 0.2, unit: 'g', category: '蔬菜' },
  { name: '生菜', calories: 15, protein: 1.2, carbs: 2.5, fat: 0.2, unit: 'g', category: '蔬菜' },
  { name: '青椒', calories: 20, protein: 0.9, carbs: 4.6, fat: 0.2, unit: 'g', category: '蔬菜' },
  { name: '芹菜', calories: 16, protein: 0.8, carbs: 3.4, fat: 0.1, unit: 'g', category: '蔬菜' },

  // 水果类 (6)
  { name: '苹果', calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, unit: 'g', category: '水果' },
  { name: '香蕉', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, unit: 'g', category: '水果' },
  { name: '橙子', calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1, unit: 'g', category: '水果' },
  { name: '蓝莓', calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3, unit: 'g', category: '水果' },
  { name: '西瓜', calories: 30, protein: 0.6, carbs: 7.6, fat: 0.2, unit: 'g', category: '水果' },
  { name: '葡萄', calories: 69, protein: 0.7, carbs: 17.2, fat: 0.2, unit: 'g', category: '水果' },

  // 坚果/零食/饮品 (9)
  { name: '核桃', calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2, unit: 'g', category: '坚果' },
  { name: '杏仁', calories: 579, protein: 21.2, carbs: 19.7, fat: 49.9, unit: 'g', category: '坚果' },
  { name: '花生', calories: 567, protein: 25.8, carbs: 16.1, fat: 49.2, unit: 'g', category: '坚果' },
  { name: '蛋白粉（乳清）', calories: 400, protein: 80, carbs: 10, fat: 3, unit: 'g', category: '补剂' },
  { name: '黑巧克力', calories: 546, protein: 7.8, carbs: 46, fat: 36, unit: 'g', category: '零食' },
  { name: '橄榄油', calories: 884, protein: 0, carbs: 0, fat: 100, unit: 'ml', category: '油脂' },
  { name: '蜂蜜', calories: 304, protein: 0.3, carbs: 82.4, fat: 0, unit: 'g', category: '调味' },
  { name: '豆浆（无糖）', calories: 31, protein: 3, carbs: 0.7, fat: 1.6, unit: 'ml', category: '饮品' },
  { name: '咖啡（黑）', calories: 2, protein: 0.1, carbs: 0, fat: 0, unit: 'ml', category: '饮品' },
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
        return await listFoods(event)
      case 'search':
        return await searchFoods(event)
      case 'addCustom':
        return await addCustom(openid, event.data)
      case 'deleteCustom':
        return await deleteCustom(openid, event.id)
      default:
        return { success: false, errMsg: `未知操作: ${action}` }
    }
  } catch (err) {
    console.error('foodLib 异常:', err)
    return { success: false, errMsg: err.message || '操作失败' }
  }
}

/** 初始化内置食物库 */
async function initBuiltin() {
  const existRes = await db.collection('foods')
    .where({ isCustom: false })
    .count()

  if (existRes.total > 0) {
    return { success: true, data: { message: '食物库已初始化', count: existRes.total } }
  }

  const tasks = BUILTIN_FOODS.map(f => ({
    ...f,
    isCustom: false,
    _openid: '',
    createdAt: new Date()
  }))

  for (let i = 0; i < tasks.length; i += 20) {
    const batch = tasks.slice(i, i + 20)
    await Promise.all(batch.map(t => db.collection('foods').add({ data: t })))
  }

  return { success: true, data: { message: '食物库初始化完成', count: tasks.length } }
}

/** 列表查询（按分类筛选） */
async function listFoods(opts) {
  const { category, page = 1, pageSize = 50 } = opts || {}
  const skip = (page - 1) * pageSize

  const condition = { isCustom: false }
  if (category) {
    condition.category = category
  }

  const [listRes, countRes] = await Promise.all([
    db.collection('foods')
      .where(condition)
      .orderBy('name', 'asc')
      .skip(skip)
      .limit(pageSize)
      .get(),
    db.collection('foods').where(condition).count()
  ])

  return {
    success: true,
    data: { list: listRes.data, total: countRes.total, page, pageSize }
  }
}

/** 模糊搜索食物 */
async function searchFoods(opts) {
  const { keyword, page = 1, pageSize = 20 } = opts || {}
  if (!keyword) return { success: false, errMsg: '请输入搜索关键词' }

  const skip = (page - 1) * pageSize

  const condition = {
    name: db.RegExp({ regexp: keyword, options: 'i' })
  }

  const [listRes, countRes] = await Promise.all([
    db.collection('foods')
      .where(condition)
      .orderBy('name', 'asc')
      .skip(skip)
      .limit(pageSize)
      .get(),
    db.collection('foods').where(condition).count()
  ])

  return {
    success: true,
    data: { list: listRes.data, total: countRes.total, page, pageSize }
  }
}

/** 添加自定义食物 */
async function addCustom(openid, data) {
  if (!data || !data.name) return { success: false, errMsg: '缺少食物名称' }

  const food = {
    name: data.name,
    calories: Number(data.calories) || 0,
    protein: Number(data.protein) || 0,
    carbs: Number(data.carbs) || 0,
    fat: Number(data.fat) || 0,
    unit: data.unit || 'g',
    category: data.category || '自定义',
    isCustom: true,
    _openid: openid,
    createdAt: new Date()
  }

  const res = await db.collection('foods').add({ data: food })

  return { success: true, data: { _id: res._id, ...food, createdAt: food.createdAt.toISOString() } }
}

/** 删除自定义食物 */
async function deleteCustom(openid, id) {
  if (!id) return { success: false, errMsg: '缺少食物 ID' }

  const food = await db.collection('foods').doc(id).get()
  if (!food.data || food.data._openid !== openid || !food.data.isCustom) {
    return { success: false, errMsg: '该食物不存在或无法删除' }
  }

  await db.collection('foods').doc(id).remove()

  return { success: true, data: { _id: id } }
}
