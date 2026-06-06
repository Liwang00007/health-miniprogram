// pages/record/record.ts
const app = getApp()
export {}

Component({
  data: {
    tabCurrent: 'record',

    /** 今日概览 */
    overview: {
      completionRate: 0,     // 目标完成度 %
      trainingMinutes: 0,    // 训练时长 min
      caloriesBurned: 0,     // 已消耗 kcal
      goalsCompleted: '0/0', // 目标进度
      caloriesIntake: 0,     // 摄入 kcal
    },

    /** 当日训练记录 */
    trainingRecords: [] as any[],

    /** 当日饮食记录 */
    dietRecords: [] as any[],

    /** 是否登录 */
    isLoggedIn: false,

    /** 当前选中日期 */
    selectedDate: '',

    /** 是否显示悬浮按钮菜单 */
    showFabMenu: false,
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
    /** 加载页面数据 */
    loadData() {
      const g = app.globalData
      this.setData({
        isLoggedIn: g.isLoggedIn,
        selectedDate: this.getTodayStr(),
      })
      // TODO: Phase 2 接入真实数据
    },

    getTodayStr(): string {
      const d = new Date()
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },

    /** 点击概览卡片 → 统计详情页 */
    onOverviewTap() {
      wx.navigateTo({ url: '/pages/logs/logs' })
    },

    /** 切换日期 */
    onDateChange() {
      // TODO: Phase 2 接入日历组件
    },

    /** 悬浮按钮 — 添加训练记录 */
    onAddTraining() {
      this.setData({ showFabMenu: false })
      wx.navigateTo({ url: '/pages/logs/logs' })
    },

    /** 悬浮按钮 — 添加饮食记录 */
    onAddDiet() {
      this.setData({ showFabMenu: false })
      wx.navigateTo({ url: '/pages/diet-edit/diet-edit' })
    },

    /** 悬浮按钮 — 切换菜单显隐 */
    onFabTap() {
      this.setData({ showFabMenu: !this.data.showFabMenu })
    },

    /** 跳转 AI 计划 */
    onAIPlan() {
      wx.navigateTo({ url: '/pages/goal/goal' })
    },

    /** 跳转教程库 */
    onTutorial() {
      wx.navigateTo({ url: '/pages/tutorial/tutorial' })
    },

    /** 点击训练记录 → 详情页 */
    onTrainingTap(e: any) {
      const { id } = e.currentTarget.dataset
      wx.navigateTo({ url: `/pages/logs/logs?id=${id}` })
    },

    /** 点击饮食记录 → 编辑页 */
    onDietTap(e: any) {
      const { id } = e.currentTarget.dataset
      wx.navigateTo({ url: `/pages/diet-edit/diet-edit?id=${id}` })
    },
  },
})
