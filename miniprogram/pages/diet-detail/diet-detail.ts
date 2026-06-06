// pages/diet-detail/diet-detail.ts
const app = getApp()
export {}

/** 饮食记录中的食物项 */
interface FoodItem {
  name: string
  weight: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

/** 饮食记录 */
interface DietRecord {
  _id: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  foods: FoodItem[]
  notes: string
  date: string
  createdAt: string
  /** 汇总营养素 */
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
}

Component({
  data: {
    recordId: '',
    record: null as DietRecord | null,
    mealLabels: MEAL_LABELS,
    loading: true,
    deleting: false,
  },

  lifetimes: {
    attached() {
      const pages = getCurrentPages()
      const current = pages[pages.length - 1] as any
      const options = (current && current.options) || {}
      if (options.id) {
        this.setData({ recordId: options.id })
        this.loadRecord(options.id)
      } else {
        this.setData({ loading: false })
      }
    },
  },

  methods: {
    /* ==========================================
       加载饮食记录
       ========================================== */

    async loadRecord(id: string) {
      this.setData({ loading: true })
      try {
        const res = await wx.cloud.callFunction({
          name: 'dietRecord',
          data: { action: 'detail', id },
        })
        const result = res.result as any
        if (result.success && result.data) {
          // 计算汇总营养素（如果后端未返回）
          const record = result.data
          if (!record.totalCalories && record.foods && record.foods.length > 0) {
            record.totalCalories = record.foods.reduce(
              (sum: number, f: FoodItem) => sum + Math.round(f.calories * (f.weight / 100)),
              0
            )
            record.totalProtein = record.foods.reduce(
              (sum: number, f: FoodItem) => sum + Math.round(f.protein * (f.weight / 100) * 10) / 10,
              0
            )
            record.totalCarbs = record.foods.reduce(
              (sum: number, f: FoodItem) => sum + Math.round(f.carbs * (f.weight / 100) * 10) / 10,
              0
            )
            record.totalFat = record.foods.reduce(
              (sum: number, f: FoodItem) => sum + Math.round(f.fat * (f.weight / 100) * 10) / 10,
              0
            )
          }
          this.setData({ record, loading: false })
        } else {
          wx.showToast({ title: '记录不存在', icon: 'none' })
          this.setData({ loading: false })
        }
      } catch (err) {
        console.error('加载饮食记录失败:', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
        this.setData({ loading: false })
      }
    },

    /* ==========================================
       删除饮食记录
       ========================================== */

    deleteRecord() {
      wx.showModal({
        title: '删除确认',
        content: '确定要删除这条饮食记录吗？此操作不可撤销。',
        confirmColor: '#FF4757',
        success: async (modalRes) => {
          if (!modalRes.confirm) return

          this.setData({ deleting: true })
          try {
            const res = await wx.cloud.callFunction({
              name: 'dietRecord',
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
            console.error('删除饮食记录失败:', err)
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          } finally {
            this.setData({ deleting: false })
          }
        },
      })
    },

    /* ==========================================
       编辑饮食记录
       ========================================== */

    editRecord() {
      if (this.data.recordId) {
        wx.navigateTo({ url: `/pages/diet-edit/diet-edit?id=${this.data.recordId}` })
      }
    },

    /* ==========================================
       格式化
       ========================================== */

    getMealIcon(type: string): string {
      const map: Record<string, string> = {
        breakfast: '🌅',
        lunch: '☀️',
        dinner: '🌙',
        snack: '🍪',
      }
      return map[type] || '🍽️'
    },
  },
})
