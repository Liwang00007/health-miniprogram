/**
 * 训练记录数据 CRUD 层
 *
 * 基于 wx.Storage 的本地持久化训练记录管理
 *
 * 使用方式：
 *   import { saveTrainingRecord, getTrainingRecords, getTrainingRecordById, deleteTrainingRecord } from '../../utils/training-store'
 */

import { generateId, getStorage, setStorage, getTodayStr } from './util'

/* ============================================
   类型定义
   ============================================ */

/** 组记录 */
export interface SetRecord {
  setNumber: number      // 组序号（1-based）
  weight: number         // 重量(kg)
  reps: number           // 次数
  restSeconds: number    // 休息间隔(秒)
}

/** 训练动作 */
export interface Exercise {
  id: string             // 唯一 ID
  name: string           // 动作名称
  icon: string           // emoji 图标
  bodyPart: string       // 目标部位
  sets: SetRecord[]      // 组记录
}

/** 训练记录 */
export interface TrainingRecord {
  id: string             // 唯一 ID
  date: string           // YYYY-MM-DD
  type: string           // 力量训练 / 有氧 / HIIT / 拉伸 / 自定义
  exercises: Exercise[]  // 训练动作列表
  duration: number       // 训练时长（分钟）
  notes: string          // 备注
  createdAt: number      // 创建时间戳
  updatedAt: number      // 更新时间戳
}

/** 训练统计数据 */
export interface TrainingStats {
  totalCount: number     // 训练次数
  totalDuration: number  // 总时长（分钟）
  totalVolume: number    // 总容量（kg）Σ 重量×次数
}

/* ============================================
   存储键
   ============================================ */

const STORAGE_KEY = 'training_records'

/* ============================================
   内部方法
   ============================================ */

/** 读取全部训练记录 */
function readAll(): TrainingRecord[] {
  return getStorage<TrainingRecord[]>(STORAGE_KEY, []) || []
}

/** 写入全部训练记录 */
function writeAll(records: TrainingRecord[]): boolean {
  return setStorage(STORAGE_KEY, records)
}

/* ============================================
   CRUD 接口
   ============================================ */

/**
 * 按日期查询训练记录（降序：最新在前）
 * @param date 可选，YYYY-MM-DD 格式；不传则返回全部
 */
export function getTrainingRecords(date?: string): TrainingRecord[] {
  const all = readAll()
  if (!date) {
    // 按创建时间降序
    return all.sort((a, b) => b.createdAt - a.createdAt)
  }
  return all
    .filter(r => r.date === date)
    .sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * 根据 ID 获取单条记录
 */
export function getTrainingRecordById(id: string): TrainingRecord | null {
  const all = readAll()
  return all.find(r => r.id === id) || null
}

/**
 * 保存训练记录（创建或更新）
 * - 无 id 或 id 不存在 → 创建
 * - id 已存在 → 更新
 * @returns 是否保存成功
 */
export function saveTrainingRecord(record: Partial<TrainingRecord> & { exercises: Exercise[] }): boolean {
  const all = readAll()
  const now = Date.now()

  // 更新已有记录
  if (record.id) {
    const idx = all.findIndex(r => r.id === record.id)
    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        ...record,
        updatedAt: now,
      } as TrainingRecord
      return writeAll(all)
    }
  }

  // 新建记录
  const newRecord: TrainingRecord = {
    id: record.id || generateId(),
    date: record.date || getTodayStr(),
    type: record.type || '力量训练',
    exercises: record.exercises || [],
    duration: record.duration || 0,
    notes: record.notes || '',
    createdAt: now,
    updatedAt: now,
  }

  all.push(newRecord)
  return writeAll(all)
}

/**
 * 删除训练记录
 * @param id 记录 ID
 * @returns 是否删除成功
 */
export function deleteTrainingRecord(id: string): boolean {
  const all = readAll()
  const idx = all.findIndex(r => r.id === id)
  if (idx === -1) return false

  all.splice(idx, 1)
  return writeAll(all)
}

/**
 * 获取训练统计数据
 * @param date 可选，指定日期；不传则计算全部
 */
export function getTrainingStats(date?: string): TrainingStats {
  const records = getTrainingRecords(date)

  let totalDuration = 0
  let totalVolume = 0

  records.forEach(record => {
    totalDuration += record.duration || 0
    record.exercises.forEach(exercise => {
      exercise.sets.forEach(set => {
        totalVolume += (set.weight || 0) * (set.reps || 0)
      })
    })
  })

  return {
    totalCount: records.length,
    totalDuration,
    totalVolume,
  }
}

/**
 * 获取当天训练统计
 */
export function getTodayStats(): TrainingStats {
  return getTrainingStats(getTodayStr())
}

/**
 * 创建空的组记录
 */
export function createEmptySet(setNumber: number): SetRecord {
  return {
    setNumber,
    weight: 0,
    reps: 0,
    restSeconds: 60,
  }
}

/**
 * 创建空的训练动作
 */
export function createEmptyExercise(): Exercise {
  return {
    id: generateId(),
    name: '',
    icon: '🏋️',
    bodyPart: '',
    sets: [createEmptySet(1)],
  }
}
