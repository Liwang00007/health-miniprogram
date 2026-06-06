// pages/ai-plan/ai-plan.ts
const app = getApp<IAppOption>()
import { POINTS_RULES } from '../../utils/points'
import { callCloudFunction } from '../../utils/api'

/** 云函数返回的计划原始数据 */
interface GeneratedPlan {
  planType: string
  params: Record<string, any>
  pointsCost: number
  plan: {
    name: string
    schedule: Array<{
      day: number
      exercises?: Array<{
        name: string
        bodyPart: string
        sets: Array<{ weight: number; reps: number; rest: number }>
      }>
      meals?: Array<{
        mealType: string
        foods: Array<{ name: string; weight: number; calories: number }>
      }>
    }>
    config?: any
    dayFactor?: number
  }
  message: string
}

Component({
  data: {
    planType: 'training' as 'training' | 'diet',
    userPoints: 0,
    pointsCost: POINTS_RULES.AI_TRAINING_PLAN,

    // 训练参数
    trainingTargetMuscles: [] as string[],
    trainingDays: 5,
    trainingLevel: '新手',
    trainingEquipment: [] as string[],
    trainingInjury: '',

    // 饮食参数
    dietGoal: '增肌',
    dietCalories: 2500,
    dietPreference: '高蛋白',
    dietAllergies: '',
    dietDays: 7,

    // UI 选项
    muscleOptions: ['胸部', '背部', '腿部', '肩部', '手臂', '核心'],
    levelOptions: ['新手', '进阶', '高阶'],
    equipmentOptions: ['杠铃', '哑铃', '龙门架', '史密斯机', '弹力带', '自重'],
    goalOptions: ['增肌', '减脂', '维持'],
    preferenceOptions: ['正常', '高蛋白', '低碳', '生酮'],

    generating: false,
  },

  lifetimes: {
    attached() {
      const points = app.getPoints()
      this.setData({
        userPoints: points,
        pointsCost: POINTS_RULES.AI_TRAINING_PLAN,
      })
    },
  },

  methods: {
    switchPlanType(e: any) {
      const type = e.currentTarget.dataset.type as 'training' | 'diet'
      this.setData({
        planType: type,
        pointsCost: type === 'training' ? POINTS_RULES.AI_TRAINING_PLAN : POINTS_RULES.AI_DIET_PLAN,
      })
    },

    toggleMuscle(e: any) {
      const muscle = e.currentTarget.dataset.name
      const muscles = this.data.trainingTargetMuscles
      const idx = muscles.indexOf(muscle)
      if (idx >= 0) { muscles.splice(idx, 1) }
      else { muscles.push(muscle) }
      this.setData({ trainingTargetMuscles: muscles })
    },

    selectLevel(e: any) {
      this.setData({ trainingLevel: e.currentTarget.dataset.name })
    },

    toggleEquipment(e: any) {
      const eq = e.currentTarget.dataset.name
      const eqs = this.data.trainingEquipment
      const idx = eqs.indexOf(eq)
      if (idx >= 0) { eqs.splice(idx, 1) }
      else { eqs.push(eq) }
      this.setData({ trainingEquipment: eqs })
    },

    onDaysChange(e: any) {
      this.setData({ trainingDays: e.detail.value })
    },

    onDietDaysChange(e: any) {
      this.setData({ dietDays: e.detail.value })
    },

    onInjuryInput(e: any) {
      this.setData({ trainingInjury: e.detail.value })
    },

    onCaloriesInput(e: any) {
      this.setData({ dietCalories: Number(e.detail.value) || 2500 })
    },

    onAllergiesInput(e: any) {
      this.setData({ dietAllergies: e.detail.value })
    },

    selectDietGoal(e: any) {
      this.setData({ dietGoal: e.currentTarget.dataset.name })
    },

    selectDietPreference(e: any) {
      this.setData({ dietPreference: e.currentTarget.dataset.name })
    },

    async generate() {
      const points = this.data.userPoints
      const cost = this.data.pointsCost

      if (!app.hasEnoughPoints(cost)) {
        wx.showModal({
          title: '积分不足',
          content: `当前积分 ${points}，需要 ${cost} 积分。请通过签到等方式获取更多积分。`,
          showCancel: false,
        })
        return
      }

      // 积分确认
      const confirmRes = await new Promise<boolean>((resolve) => {
        wx.showModal({
          title: '确认消耗积分',
          content: `将消耗 ${cost} 积分生成${this.data.planType === 'training' ? '训练' : '饮食'}计划\n当前余额：${points} 积分`,
          confirmText: '确认生成',
          success: (r) => resolve(r.confirm),
        })
      })
      if (!confirmRes) return

      this.setData({ generating: true })

      try {
        const planType = this.data.planType
        const params = planType === 'training'
          ? {
              targetMuscles: this.data.trainingTargetMuscles,
              days: this.data.trainingDays,
              level: this.data.trainingLevel,
              equipment: this.data.trainingEquipment,
              injury: this.data.trainingInjury,
            }
          : {
              goal: this.data.dietGoal,
              dailyCalories: this.data.dietCalories,
              preference: this.data.dietPreference,
              allergies: this.data.dietAllergies,
              days: this.data.dietDays,
            }

        // 1. 调用 planManager 云函数生成计划（服务端自动扣除积分）
        const result = await callCloudFunction<GeneratedPlan>('planManager', {
          action: 'generate',
          planType,
          params,
        })

        // 2. 立即保存到数据库
        const planData = {
          type: 'AI',
          name: result.plan.name,
          params,
          schedule: result.plan.schedule,
          pointsCost: cost,
        }

        const saveResult = await callCloudFunction<{ _id: string }>('planManager', {
          action: 'save',
          planType,
          data: planData,
        })

        // 3. 更新本地积分
        app.deductPoints(cost)
        this.setData({ userPoints: app.getPoints() })

        // 4. 跳转预览页
        wx.redirectTo({
          url: `/pages/plan-preview/plan-preview?planId=${saveResult._id}&type=${planType}`,
        })
      } catch (err: any) {
        wx.showToast({ title: err.message || '生成失败，请稍后重试', icon: 'none' })
      } finally {
        this.setData({ generating: false })
      }
    },
  },
})
