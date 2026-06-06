// pages/goal/goal.ts
const app = getApp()

Component({
  data: {
    tabCurrent: 'goal',

    /** 目标列表 */
    goals: [] as any[],

    /** AI 训练计划列表 */
    trainingPlans: [] as any[],

    /** AI 饮食计划列表 */
    dietPlans: [] as any[],

    /** 当前激活的筛选标签 */
    activeTab: 'goals', // 'goals' | 'training' | 'diet'

    isLoggedIn: false,
    loading: false,
  },

  lifetimes: {
    attached() {
      this.loadData()
    },
  },

  pageLifetimes: {
    show() {
      this.loadData()
    },
  },

  methods: {
    async loadData() {
      const loggedIn = app.globalData.isLoggedIn
      this.setData({ isLoggedIn: loggedIn })

      if (!loggedIn) return

      this.setData({ loading: true })
      try {
        // 加载计划列表
        const planRes = await wx.cloud.callFunction({
          name: 'planManager',
          data: { action: 'list' },
        }).catch(() => null)

        const planData = (planRes && planRes.result && (planRes.result as any).data) || {}
        this.setData({
          trainingPlans: planData.trainingPlans || [],
          dietPlans: planData.dietPlans || [],
        })
      } catch (err) {
        console.error('加载计划失败:', err)
      } finally {
        this.setData({ loading: false })
      }
    },

    /** 切换子标签 */
    switchTab(e: any) {
      const { tab } = e.currentTarget.dataset
      this.setData({ activeTab: tab })
    },

    /** 创建新目标 */
    onCreateGoal() {
      wx.showToast({ title: '功能开发中', icon: 'none' })
    },

    /** AI 制定计划 */
    onAIPlan() {
      wx.navigateTo({ url: '/pages/ai-plan/ai-plan' })
    },

    /** 查看计划详情 */
    onPlanTap(e: any) {
      const { id, type } = e.currentTarget.dataset
      if (id) {
        wx.navigateTo({ url: `/pages/plan-preview/plan-preview?planId=${id}&type=${type || 'training'}` })
      }
    },
  },
})
