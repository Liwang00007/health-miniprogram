/**
 * 动作库数据
 *
 * 预设常用健身动作，按部位分类，供训练记录编辑页搜索/选择
 *
 * 使用方式：
 *   import { searchExercises, getExercisesByPart, getAllExercises } from '../../utils/exercise-db'
 */

/** 动作条目 */
export interface ExerciseInfo {
  name: string        // 动作名称
  icon: string        // emoji 图标
  bodyPart: string    // 目标部位
}

/** 部位分组 */
export interface BodyPartGroup {
  name: string        // 部位名称（中文）
  key: string         // 部位 key
  exercises: ExerciseInfo[]
}

/* ============================================
   动作库数据
   ============================================ */

const EXERCISES: ExerciseInfo[] = [
  /* ---- 胸部 ---- */
  { name: '杠铃卧推',     icon: '🏋️',  bodyPart: 'chest' },
  { name: '哑铃卧推',     icon: '🏋️',  bodyPart: 'chest' },
  { name: '上斜杠铃卧推',  icon: '🏋️',  bodyPart: 'chest' },
  { name: '下斜杠铃卧推',  icon: '🏋️',  bodyPart: 'chest' },
  { name: '哑铃飞鸟',     icon: '🏋️',  bodyPart: 'chest' },
  { name: '龙门架夹胸',    icon: '🏋️',  bodyPart: 'chest' },
  { name: '俯卧撑',       icon: '💪',  bodyPart: 'chest' },
  { name: '器械推胸',     icon: '🏋️',  bodyPart: 'chest' },

  /* ---- 背部 ---- */
  { name: '引体向上',     icon: '💪',  bodyPart: 'back' },
  { name: '杠铃划船',     icon: '🏋️',  bodyPart: 'back' },
  { name: '哑铃划船',     icon: '🏋️',  bodyPart: 'back' },
  { name: '高位下拉',     icon: '🏋️',  bodyPart: 'back' },
  { name: '坐姿划船',     icon: '🏋️',  bodyPart: 'back' },
  { name: '硬拉',         icon: '🏋️',  bodyPart: 'back' },
  { name: '山羊挺身',     icon: '🧘',  bodyPart: 'back' },

  /* ---- 腿部 ---- */
  { name: '杠铃深蹲',     icon: '🏋️',  bodyPart: 'legs' },
  { name: '哑铃深蹲',     icon: '🏋️',  bodyPart: 'legs' },
  { name: '腿举',         icon: '🏋️',  bodyPart: 'legs' },
  { name: '腿弯举',       icon: '🏋️',  bodyPart: 'legs' },
  { name: '腿屈伸',       icon: '🏋️',  bodyPart: 'legs' },
  { name: '罗马尼亚硬拉',  icon: '🏋️',  bodyPart: 'legs' },
  { name: '保加利亚分腿蹲', icon: '🏋️',  bodyPart: 'legs' },
  { name: '箭步蹲',       icon: '🏋️',  bodyPart: 'legs' },
  { name: '提踵',         icon: '🏋️',  bodyPart: 'legs' },

  /* ---- 肩部 ---- */
  { name: '杠铃推举',     icon: '🏋️',  bodyPart: 'shoulders' },
  { name: '哑铃推举',     icon: '🏋️',  bodyPart: 'shoulders' },
  { name: '侧平举',       icon: '🏋️',  bodyPart: 'shoulders' },
  { name: '前平举',       icon: '🏋️',  bodyPart: 'shoulders' },
  { name: '面拉',         icon: '🏋️',  bodyPart: 'shoulders' },
  { name: '直立划船',     icon: '🏋️',  bodyPart: 'shoulders' },

  /* ---- 手臂 ---- */
  { name: '杠铃弯举',     icon: '💪',  bodyPart: 'arms' },
  { name: '哑铃弯举',     icon: '💪',  bodyPart: 'arms' },
  { name: '锤式弯举',     icon: '💪',  bodyPart: 'arms' },
  { name: '双杠臂屈伸',    icon: '💪',  bodyPart: 'arms' },
  { name: '绳索下压',     icon: '💪',  bodyPart: 'arms' },
  { name: '窄距卧推',     icon: '🏋️',  bodyPart: 'arms' },

  /* ---- 核心 ---- */
  { name: '平板支撑',     icon: '🧘',  bodyPart: 'core' },
  { name: '卷腹',         icon: '🧘',  bodyPart: 'core' },
  { name: '仰卧举腿',     icon: '🧘',  bodyPart: 'core' },
  { name: '俄罗斯转体',    icon: '🧘',  bodyPart: 'core' },
  { name: '悬垂举腿',     icon: '💪',  bodyPart: 'core' },

  /* ---- 有氧 ---- */
  { name: '跑步',         icon: '🏃',  bodyPart: 'cardio' },
  { name: '椭圆机',       icon: '🏃',  bodyPart: 'cardio' },
  { name: '动感单车',     icon: '🚴',  bodyPart: 'cardio' },
  { name: '划船机',       icon: '🚣',  bodyPart: 'cardio' },
  { name: '跳绳',         icon: '🪢',  bodyPart: 'cardio' },
  { name: '游泳',         icon: '🏊',  bodyPart: 'cardio' },

  /* ---- 拉伸 ---- */
  { name: '全身拉伸',     icon: '🧘',  bodyPart: 'stretch' },
  { name: '泡沫轴放松',    icon: '🧘',  bodyPart: 'stretch' },
]

/* ============================================
   部位分组
   ============================================ */

const BODY_PARTS: BodyPartGroup[] = [
  { name: '胸部', key: 'chest',     exercises: [] },
  { name: '背部', key: 'back',      exercises: [] },
  { name: '腿部', key: 'legs',      exercises: [] },
  { name: '肩部', key: 'shoulders', exercises: [] },
  { name: '手臂', key: 'arms',      exercises: [] },
  { name: '核心', key: 'core',      exercises: [] },
  { name: '有氧', key: 'cardio',    exercises: [] },
  { name: '拉伸', key: 'stretch',   exercises: [] },
]

// 初始化分组数据
BODY_PARTS.forEach(group => {
  group.exercises = EXERCISES.filter(e => e.bodyPart === group.key)
})

/* ============================================
   查询接口
   ============================================ */

/** 获取所有部位分组（含动作列表） */
export function getAllBodyParts(): BodyPartGroup[] {
  return BODY_PARTS
}

/** 按部位 key 获取动作列表 */
export function getExercisesByPart(bodyPart: string): ExerciseInfo[] {
  const group = BODY_PARTS.find(g => g.key === bodyPart)
  return group ? group.exercises : []
}

/** 按关键字搜索动作 */
export function searchExercises(keyword: string): ExerciseInfo[] {
  if (!keyword || keyword.trim() === '') return EXERCISES.slice()
  const kw = keyword.trim().toLowerCase()
  return EXERCISES.filter(e =>
    e.name.toLowerCase().includes(kw) ||
    e.bodyPart.toLowerCase().includes(kw)
  )
}

/** 获取所有动作（扁平列表） */
export function getAllExercises(): ExerciseInfo[] {
  return EXERCISES.slice()
}

/** 按名称获取单个动作 */
export function getExerciseByName(name: string): ExerciseInfo | undefined {
  return EXERCISES.find(e => e.name === name)
}
