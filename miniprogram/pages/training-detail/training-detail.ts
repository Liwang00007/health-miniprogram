// pages/training-detail/training-detail.ts
const app = getApp()
export {}

/** 训练动作 */
interface ExerciseSet {
  weight: number
  reps: number
  restSeconds: number
}

interface Exercise {
  name: string
  bodyPart: string
  sets: ExerciseSet[]
}

/** 训练记录 */
interface TrainingRecord {
  _id: string
  trainingType: string
  exercises: Exercise[]
  duration: number
  notes: string
  recordDate: string
  createdAt: string
}

Component({
  data: {
    recordId: '',
    record: null as TrainingRecord | null,
    loading: true,
    deleting: false,
  },

  lifetimes: {
    attached() {
      // 从页面参数获取记录 ID
      const pages = getCurrentPages()
      const current = pages[pages.length - 1] as any
      const options = (current && current.options) || {}
      if (options.id) {
        this.setData({ recordId: options.id })
        this.loadRecord(options.id)
      } else {
        // 尝试从全局事件通道获取
        this.setData({ loading: false })
      }
    },
  },

  methods: {
    /* ==========================================
       加载训练记录
       ========================================== */

    async loadRecord(id: string) {
      this.setData({ loading: true })
      try {
        const res = await wx.cloud.callFunction({
          name: 'trainingRecord',
          data: { action: 'detail', id },
        })
        const result = res.result as any
        if (result.success && result.data) {
          this.setData({ record: result.data, loading: false })
        } else {
          wx.showToast({ title: '记录不存在', icon: 'none' })
          this.setData({ loading: false })
        }
      } catch (err) {
        console.error('加载训练记录失败:', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
        this.setData({ loading: false })
      }
    },

    /* ==========================================
       删除训练记录
       ========================================== */

    deleteRecord() {
      wx.showModal({
        title: '删除确认',
        content: '确定要删除这条训练记录吗？此操作不可撤销。',
        confirmColor: '#FF4757',
        success: async (modalRes) => {
          if (!modalRes.confirm) return

          this.setData({ deleting: true })
          try {
            const res = await wx.cloud.callFunction({
              name: 'trainingRecord',
              data: { action: 'delete', id: this.data.recordId },
            })
            const result = res.result as any
            if (result.success) {
              wx.showToast({ title: '已删除', icon: 'success' })
              setTimeout(() => wx.navigateBack(), 1000)
            } else {
              wx.showToast({ title: result.errMsg || '删除失败', icon: 'none' })
            }
          } catch (err: any) {
            console.error('删除训练记录失败:', err)
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          } finally {
            this.setData({ deleting: false })
          }
        },
      })
    },

    /* ==========================================
       格式化辅助
       ========================================== */

    /** 训练类型图标 */
    getTypeIcon(type: string): string {
      const map: Record<string, string> = {
        '力量训练': '🏋️',
        '有氧': '🏃',
        'HIIT': '⚡',
        '拉伸': '🧘',
        '瑜伽': '🧘',
        '核心': '💪',
      }
      return map[type] || '💪'
    },
  },
})
