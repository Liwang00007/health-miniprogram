/**
 * pages/training/edit/edit.ts — 训练记录编辑页
 *
 * 支持创建 & 编辑两种模式：
 * - 无 id 参数 → 创建模式
 * - 有 id 参数 → 编辑模式，加载已有数据预填
 *
 * 核心功能：
 * - 日期、训练类型选择
 * - 多动作管理（添加/删除/从动作库选择）
 * - 组记录管理（添加/删除组）
 * - 计时器弹窗（正计时 → 回填训练时长）
 * - 表单校验
 */

import {
  TrainingRecord, Exercise, SetRecord,
  saveTrainingRecord, getTrainingRecordById,
  createEmptyExercise, createEmptySet,
} from '../../utils/training-store'
import { searchExercises, getAllBodyParts, ExerciseInfo } from '../../utils/exercise-db'
import { getTodayStr, showToast, showSuccessToast, generateId } from '../../utils/util'

/** 训练类型选项 */
const TRAINING_TYPES = ['力量训练', '有氧', 'HIIT', '拉伸', '自定义']

/** 校验错误 */
interface ValidationError {
  field: string    // 错误字段名
  message: string  // 错误提示
}

Component({
  data: {
    /* ---- 页面模式 ---- */
    isEdit: false,
    recordId: '',

    /* ---- 表单数据 ---- */
    date: getTodayStr(),
    type: '力量训练' as string,
    exercises: [] as Exercise[],
    duration: 0,
    durationDisplay: '00:00',
    notes: '',

    /* ---- 训练类型列表 ---- */
    trainingTypes: TRAINING_TYPES,

    /* ---- 动作库搜索 ---- */
    showExercisePicker: false,
    exerciseSearchKeyword: '',
    exerciseSearchResults: [] as ExerciseInfo[],
    bodyParts: [] as { name: string; key: string; exercises: ExerciseInfo[] }[],
    activeBodyPart: 'all',

    /* ---- 自定义动作输入 ---- */
    showCustomExercise: false,
    customExerciseName: '',

    /* ---- 计时器弹窗 ---- */
    showTimer: false,
    timerSeconds: 0,
    timerDisplay: '00:00',

    /* ---- 校验错误 ---- */
    errors: {} as Record<string, string>,
  },

  /* ============================================
     Lifecycle
     ============================================ */

  lifetimes: {
    attached() {
      // 初始化动作库分组
      this.setData({ bodyParts: getAllBodyParts() })

      // 获取页面参数
      const pages = getCurrentPages()
      const page = pages[pages.length - 1]
      const options = (page as any).options || {}

      if (options.id) {
        // 编辑模式
        const record = getTrainingRecordById(options.id)
        if (record) {
          this.setData({
            isEdit: true,
            recordId: record.id,
            date: record.date,
            type: record.type,
            exercises: record.exercises,
            duration: record.duration,
            durationDisplay: this._formatDuration(record.duration),
            notes: record.notes,
          })
        }
      }
    },
  },

  /* ============================================
     日期
     ============================================ */

  /** 日期选择器变更 */
  onDateChange(e: any) {
    this.setData({ date: e.detail.value })
    this._clearError('date')
  },

  /* ============================================
     训练类型
     ============================================ */

  /** 选择训练类型 */
  onTypeTap(e: any) {
    const type = e.currentTarget.dataset.type
    this.setData({ type })
    this._clearError('type')
  },

  /* ============================================
     动作管理
     ============================================ */

  /** 打开动作库选择弹窗 */
  onOpenExercisePicker() {
    this.setData({
      showExercisePicker: true,
      exerciseSearchKeyword: '',
      exerciseSearchResults: [],
      activeBodyPart: 'all',
    })
  },

  /** 关闭动作库弹窗 */
  onCloseExercisePicker() {
    this.setData({ showExercisePicker: false })
  },

  /** 搜索动作 */
  onExerciseSearch(e: any) {
    const keyword = e.detail.value
    this.setData({
      exerciseSearchKeyword: keyword,
      exerciseSearchResults: keyword ? searchExercises(keyword) : [],
    })
  },

  /** 按部位筛选 */
  onBodyPartTap(e: any) {
    this.setData({ activeBodyPart: e.currentTarget.dataset.key })
  },

  /** 从动作库选择动作 */
  onSelectExercise(e: any) {
    const { name, icon } = e.currentTarget.dataset
    this._addExercise(name, icon || '🏋️')
    this.setData({ showExercisePicker: false })
    this._clearError('exercises')
  },

  /** 切换自定义动作输入 */
  onToggleCustomExercise() {
    this.setData({
      showCustomExercise: !this.data.showCustomExercise,
      customExerciseName: '',
    })
  },

  /** 自定义动作名输入 */
  onCustomNameInput(e: any) {
    this.setData({ customExerciseName: e.detail.value })
  },

  /** 确认添加自定义动作 */
  onConfirmCustomExercise() {
    const name = this.data.customExerciseName.trim()
    if (!name) {
      showToast('请输入动作名称', 'none')
      return
    }
    this._addExercise(name, '🏋️')
    this.setData({
      showCustomExercise: false,
      customExerciseName: '',
      showExercisePicker: false,
    })
    this._clearError('exercises')
  },

  /** 删除动作 */
  onDeleteExercise(e: any) {
    const exerciseId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定删除该训练动作及其所有组记录？',
      confirmColor: '#FF4757',
      success: (res) => {
        if (res.confirm) {
          const exercises = this.data.exercises.filter((ex: Exercise) => ex.id !== exerciseId)
          this.setData({ exercises })
        }
      },
    })
  },

  /* ============================================
     组记录管理
     ============================================ */

  /** 添加一组 */
  onAddSet(e: any) {
    const exerciseId = e.currentTarget.dataset.id
    const exercises = this.data.exercises.map((ex: Exercise) => {
      if (ex.id === exerciseId) {
        const newSet = createEmptySet(ex.sets.length + 1)
        return { ...ex, sets: [...ex.sets, newSet] }
      }
      return ex
    })
    this.setData({ exercises })
  },

  /** 删除一组 */
  onDeleteSet(e: any) {
    const { exerciseId, index } = e.currentTarget.dataset
    const exercises = this.data.exercises.map((ex: Exercise) => {
      if (ex.id === exerciseId) {
        if (ex.sets.length <= 1) return ex // 至少保留一组
        const newSets = ex.sets.filter((_: SetRecord, i: number) => i !== index)
        // 重新编排序号
        return {
          ...ex,
          sets: newSets.map((s: SetRecord, i: number) => ({ ...s, setNumber: i + 1 })),
        }
      }
      return ex
    })
    this.setData({ exercises })
  },

  /** 重量输入 */
  onWeightInput(e: any) {
    const { exerciseId, index } = e.currentTarget.dataset
    const exercises = this.data.exercises.map((ex: Exercise) => {
      if (ex.id === exerciseId) {
        const sets = ex.sets.map((s: SetRecord, i: number) =>
          i === index ? { ...s, weight: parseFloat(e.detail.value) || 0 } : s
        )
        return { ...ex, sets }
      }
      return ex
    })
    this.setData({ exercises })
    this._clearError(`weight_${exerciseId}_${index}`)
  },

  /** 次数输入 */
  onRepsInput(e: any) {
    const { exerciseId, index } = e.currentTarget.dataset
    const exercises = this.data.exercises.map((ex: Exercise) => {
      if (ex.id === exerciseId) {
        const sets = ex.sets.map((s: SetRecord, i: number) =>
          i === index ? { ...s, reps: parseInt(e.detail.value) || 0 } : s
        )
        return { ...ex, sets }
      }
      return ex
    })
    this.setData({ exercises })
    this._clearError(`reps_${exerciseId}_${index}`)
  },

  /** 休息间隔输入 */
  onRestInput(e: any) {
    const { exerciseId, index } = e.currentTarget.dataset
    const exercises = this.data.exercises.map((ex: Exercise) => {
      if (ex.id === exerciseId) {
        const sets = ex.sets.map((s: SetRecord, i: number) =>
          i === index ? { ...s, restSeconds: parseInt(e.detail.value) || 0 } : s
        )
        return { ...ex, sets }
      }
      return ex
    })
    this.setData({ exercises })
  },

  /* ============================================
     计时器
     ============================================ */

  /** 打开计时器弹窗 */
  onOpenTimer() {
    this.setData({ showTimer: true, timerSeconds: 0, timerDisplay: '00:00' })
  },

  /** 关闭计时器弹窗 */
  onCloseTimer() {
    this.setData({ showTimer: false })
  },

  /** 计时器 tick 事件 */
  onTimerTick(e: any) {
    this.setData({
      timerSeconds: e.detail.seconds,
      timerDisplay: e.detail.display,
    })
  },

  /** 将计时器时间填入训练时长 */
  onApplyTimer() {
    const minutes = Math.ceil(this.data.timerSeconds / 60)
    this.setData({
      duration: minutes,
      durationDisplay: this._formatDuration(minutes),
      showTimer: false,
    })
  },

  /** 手动输入训练时长 */
  onDurationInput(e: any) {
    const duration = parseInt(e.detail.value) || 0
    this.setData({
      duration,
      durationDisplay: this._formatDuration(duration),
    })
  },

  /* ============================================
     备注
     ============================================ */

  onNotesInput(e: any) {
    this.setData({ notes: e.detail.value })
  },

  /* ============================================
     表单校验 & 保存
     ============================================ */

  /** 保存训练记录（本地 + 云端双写） */
  async onSave() {
    // 校验
    const errors = this._validate()
    if (errors.length > 0) {
      const errorMap: Record<string, string> = {}
      errors.forEach(e => { errorMap[e.field] = e.message })
      this.setData({ errors: errorMap })
      showToast(errors[0].message, 'none')
      return
    }

    wx.showLoading({ title: '保存中…', mask: true })

    // 构建记录
    const record: Partial<TrainingRecord> & { exercises: Exercise[] } = {
      exercises: this.data.exercises,
      date: this.data.date,
      type: this.data.type,
      duration: this.data.duration,
      notes: this.data.notes,
    }

    if (this.data.isEdit) {
      record.id = this.data.recordId
    }

    // 1. 本地存储（离线保障）
    const localOk = saveTrainingRecord(record)

    // 2. 云端同步
    let cloudOk = false
    const app = getApp()
    if (app.globalData.isNetworkAvailable !== false) {
      try {
        const cloudData = {
          date: this.data.date,
          trainingType: this.data.type,
          exercises: this.data.exercises.map(ex => ({
            name: ex.name,
            bodyPart: ex.bodyPart || '',
            sets: ex.sets.map(s => ({
              weight: s.weight,
              reps: s.reps,
              rest: s.restSeconds,
            })),
          })),
          duration: this.data.duration,
          notes: this.data.notes,
        }

        const action = this.data.isEdit ? 'update' : 'add'
        const cloudParams: any = { action, data: cloudData }
        if (this.data.isEdit) {
          cloudParams.id = this.data.recordId
        }

        const res = await wx.cloud.callFunction({ name: 'trainingRecord', data: cloudParams })
        const result = res.result as any
        cloudOk = result.success
      } catch (err) {
        console.error('云端保存失败:', err)
      }
    }

    wx.hideLoading()

    if (localOk || cloudOk) {
      showSuccessToast(this.data.isEdit ? '修改成功' : '保存成功')
      setTimeout(() => wx.navigateBack(), 500)
    } else {
      showToast('保存失败，请重试', 'error')
    }
  },

  /* ============================================
     内部方法
     ============================================ */

  /** 添加一个空动作 */
  _addExercise(name: string, icon: string) {
    const ex = createEmptyExercise()
    ex.name = name
    ex.icon = icon
    const exercises = [...this.data.exercises, ex]
    this.setData({ exercises })
  },

  /** 表单校验 */
  _validate(): ValidationError[] {
    const errors: ValidationError[] = []
    const { type, exercises, duration } = this.data

    // 训练类型
    if (!type) {
      errors.push({ field: 'type', message: '请选择训练类型' })
    }

    // 至少一个动作
    if (exercises.length === 0) {
      errors.push({ field: 'exercises', message: '请添加至少一个训练动作' })
    } else {
      // 检查每个动作
      exercises.forEach((ex: Exercise, ei: number) => {
        if (!ex.name || ex.name.trim() === '') {
          errors.push({ field: `exercise_${ex.id}`, message: `第${ei + 1}个动作名称不能为空` })
        }
        if (ex.sets.length === 0) {
          errors.push({ field: `sets_${ex.id}`, message: `"${ex.name}"至少需要一组记录` })
        } else {
          // 检查每组
          ex.sets.forEach((set: SetRecord, si: number) => {
            if (!set.weight || set.weight <= 0) {
              errors.push({
                field: `weight_${ex.id}_${si}`,
                message: `"${ex.name}"第${si + 1}组重量需大于0`,
              })
            }
            if (!set.reps || set.reps < 1) {
              errors.push({
                field: `reps_${ex.id}_${si}`,
                message: `"${ex.name}"第${si + 1}组次数需≥1`,
              })
            }
            if (set.restSeconds < 0) {
              errors.push({
                field: `rest_${ex.id}_${si}`,
                message: `"${ex.name}"第${si + 1}组休息时间不能为负`,
              })
            }
          })
        }
      })
    }

    // 训练时长
    if (duration < 0) {
      errors.push({ field: 'duration', message: '训练时长不能为负数' })
    }

    return errors
  },

  /** 清除某个字段的错误 */
  _clearError(field: string) {
    if (this.data.errors[field]) {
      const errors = { ...this.data.errors }
      delete errors[field]
      this.setData({ errors })
    }
  },

  /** 格式化时长显示：分钟 → XX:XX 或 Xh Xmin */
  _formatDuration(minutes: number): string {
    if (!minutes || minutes <= 0) return '0min'
    if (minutes < 60) return `${minutes}min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}min` : `${h}h`
  },
})
