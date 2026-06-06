/**
 * pages/training/detail/detail.ts — 训练记录详情页
 *
 * 展示单条训练记录的完整信息，支持编辑 & 删除操作
 */

import {
  TrainingRecord, Exercise, SetRecord,
  getTrainingRecordById, deleteTrainingRecord,
} from '../../utils/training-store'
import { formatDuration, showToast, showSuccessToast } from '../../utils/util'

Component({
  data: {
    /* ---- 记录数据 ---- */
    record: null as TrainingRecord | null,
    recordId: '',

    /* ---- 统计数据 ---- */
    totalSets: 0,
    totalVolume: 0,
    totalVolumeDisplay: '0',
    durationDisplay: '0min',

    /* ---- 状态 ---- */
    loading: true,
  },

  /* ============================================
     Lifecycle
     ============================================ */

  lifetimes: {
    attached() {
      const pages = getCurrentPages()
      const page = pages[pages.length - 1]
      const options = (page as any).options || {}

      if (options.id) {
        this.loadRecord(options.id)
      } else {
        showToast('记录不存在', 'error')
        setTimeout(() => wx.navigateBack(), 500)
      }
    },
  },

  pageLifetimes: {
    show() {
      // 从编辑页返回时刷新数据
      if (this.data.recordId) {
        this.loadRecord(this.data.recordId)
      }
    },
  },

  /* ============================================
     数据加载
     ============================================ */

  async loadRecord(id: string) {
    this.setData({ loading: true, recordId: id })

    // 优先从云端加载
    const app = getApp()
    let record: TrainingRecord | null = null

    if (app.globalData.isNetworkAvailable !== false) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'trainingRecord',
          data: { action: 'detail', id },
        })
        const result = res.result as any
        if (result.success && result.data) {
          const cloud = result.data
          record = {
            id: cloud._id,
            date: cloud.date,
            type: cloud.trainingType,
            exercises: (cloud.exercises || []).map((ex: any) => ({
              id: ex._id || '',
              name: ex.name || '',
              icon: '🏋️',
              bodyPart: ex.bodyPart || '',
              sets: (ex.sets || []).map((s: any, si: number) => ({
                setNumber: si + 1,
                weight: s.weight || 0,
                reps: s.reps || 0,
                restSeconds: s.rest || 60,
              })),
            })),
            duration: cloud.duration || 0,
            notes: cloud.notes || '',
            createdAt: new Date(cloud.createdAt).getTime(),
            updatedAt: new Date(cloud.updatedAt || cloud.createdAt).getTime(),
          }
        }
      } catch (err) {
        console.error('云端加载训练详情失败:', err)
      }
    }

    // 回退本地
    if (!record) {
      record = getTrainingRecordById(id) || null
    }

    if (!record) {
      showToast('记录不存在', 'error')
      setTimeout(() => wx.navigateBack(), 500)
      return
    }

    // 计算统计数据
    let totalSets = 0
    let totalVolume = 0
    record.exercises.forEach((ex: Exercise) => {
      totalSets += ex.sets.length
      ex.sets.forEach((set: SetRecord) => {
        totalVolume += (set.weight || 0) * (set.reps || 0)
      })
    })

    this.setData({
      record,
      recordId: id,
      totalSets,
      totalVolume,
      totalVolumeDisplay: this._formatVolume(totalVolume),
      durationDisplay: formatDuration(record.duration || 0),
      loading: false,
    })
  },

  /* ============================================
     操作
     ============================================ */

  /** 编辑记录 */
  onEdit() {
    wx.navigateTo({
      url: `/pages/training/edit/edit?id=${this.data.recordId}`,
    })
  },

  /** 删除记录（云端 + 本地） */
  async onDelete() {
    const that = this
    wx.showModal({
      title: '确认删除',
      content: '删除后将无法恢复，确认删除此训练记录？',
      confirmColor: '#FF4757',
      success: async (res) => {
        if (!res.confirm) return

        wx.showLoading({ title: '删除中…', mask: true })
        let deleted = false

        // 云端删除
        try {
          const cloudRes = await wx.cloud.callFunction({
            name: 'trainingRecord',
            data: { action: 'delete', id: that.data.recordId },
          })
          const result = cloudRes.result as any
          if (result.success) deleted = true
        } catch (err) {
          console.error('云端删除失败:', err)
        }

        // 本地删除（无论云端成功与否都执行）
        const localOk = deleteTrainingRecord(that.data.recordId)
        if (localOk) deleted = true

        wx.hideLoading()

        if (deleted) {
          showSuccessToast('删除成功')
          setTimeout(() => wx.navigateBack(), 500)
        } else {
          showToast('删除失败', 'error')
        }
      },
    })
  },

  /* ============================================
     内部方法
     ============================================ */

  _formatVolume(volume: number): string {
    if (volume < 1000) return volume.toString()
    return (volume / 1000).toFixed(1) + 'k'
  },

  /** 获取动作的 set 数据（WXML 模板中使用的辅助） */
  getExerciseStats(ex: Exercise): { sets: number; maxWeight: number } {
    let maxWeight = 0
    ex.sets.forEach(s => {
      if (s.weight > maxWeight) maxWeight = s.weight
    })
    return { sets: ex.sets.length, maxWeight }
  },
})
