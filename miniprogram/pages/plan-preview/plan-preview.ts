// pages/plan-preview/plan-preview.ts
import { callCloudFunction } from '../../utils/api'

/** 每日计划内容（前端展示用） */
interface DayContent {
  day: number
  focus: string
  exercises?: Array<{
    name: string
    bodyPart: string
    sets: number
    reps: number
    restSeconds: number
    weight: number
  }>
  meals?: Array<{
    mealType: string
    foods: Array<{ name: string; weight: number; calories: number }>
  }>
}

/** 计划展示数据 */
interface PlanDisplay {
  name: string
  days: number
  content: DayContent[]
  params: Record<string, any>
  pointsCost: number
}

Component({
  data: {
    planId: '',
    planType: 'training' as 'training' | 'diet',
    plan: null as PlanDisplay | null,
    loading: true,
  },

  lifetimes: {
    attached() {
      const pages = getCurrentPages()
      const options = (pages[pages.length - 1] as any).options || {}
      this.setData({
        planId: options.planId || '',
        planType: options.type || 'training',
      })
      if (options.planId) {
        this.loadPlan()
      }
    },
  },

  methods: {
    /** 从云数据库加载计划详情 */
    async loadPlan() {
      this.setData({ loading: true })
      try {
        const dbPlan = await callCloudFunction<any>('planManager', {
          action: 'detail',
          planType: this.data.planType,
          id: this.data.planId,
        })

        if (dbPlan) {
          // 将 schedule 映射为 content
          const schedule = dbPlan.schedule || []
          const content: DayContent[] = schedule.map((day: any) => {
            if (this.data.planType === 'training') {
              const exercises = (day.exercises || []).map((ex: any) => {
                const totalSets = (ex.sets && ex.sets.length) || 0
                const avgReps = totalSets > 0
                  ? Math.round(ex.sets.reduce((s: number, set: any) => s + (set.reps || 0), 0) / totalSets)
                  : 0
                const avgWeight = totalSets > 0
                  ? Math.round(ex.sets.reduce((s: number, set: any) => s + (set.weight || 0), 0) / totalSets)
                  : 0
                const avgRest = totalSets > 0
                  ? Math.round(ex.sets.reduce((s: number, set: any) => s + (set.rest || 60), 0) / totalSets)
                  : 60
                return {
                  name: ex.name,
                  bodyPart: ex.bodyPart || '',
                  sets: totalSets,
                  reps: avgReps,
                  restSeconds: avgRest,
                  weight: avgWeight,
                }
              })
              return {
                day: day.day,
                focus: exercises.length > 0 ? (exercises[0].bodyPart || '全身') : '全身',
                exercises,
                meals: [],
              }
            } else {
              // 饮食计划
              const meals = (day.meals || []).map((meal: any) => ({
                mealType: meal.mealType || '餐',
                foods: (meal.foods || []).map((f: any) => ({
                  name: f.name || '',
                  weight: f.weight || 0,
                  calories: f.calories || 0,
                })),
              }))
              return { day: day.day, focus: '', meals, exercises: [] }
            }
          })

          this.setData({
            plan: {
              name: dbPlan.name || `${content.length}天计划`,
              days: content.length,
              content,
              params: dbPlan.params || {},
              pointsCost: dbPlan.pointsCost || 0,
            },
          })
        }
      } catch (err) {
        console.error('加载计划失败:', err)
      } finally {
        this.setData({ loading: false })
      }
    },

    /** 保存计划 — 去目标页开始执行 */
    saveToGoal() {
      wx.showToast({ title: '已保存到目标', icon: 'success' })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/goal/goal' })
      }, 1000)
    },

    /** 保存到教程存档 */
    async saveToTutorial() {
      try {
        await callCloudFunction('planManager', {
          action: 'updateStatus',
          planType: this.data.planType,
          id: this.data.planId,
          status: 'active',
        })
        wx.showToast({ title: '已保存到教程', icon: 'success' })
      } catch (err: any) {
        wx.showToast({ title: err.message || '保存失败', icon: 'none' })
      }
    },

    /** 编辑调整 — 返回 AI 定制页重新生成 */
    editPlan() {
      wx.navigateBack()
    },

    /** 重新生成 */
    regenerate() {
      wx.navigateBack()
    },
  },
})
