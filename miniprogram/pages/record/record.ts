// pages/record/record.ts
import { getTrainingRecords, deleteTrainingRecord, getTodayStats } from '../../utils/training-store'
import { getTodayStr, showSuccessToast, showToast, showLoading, hideLoading, formatDuration } from '../../utils/util'

const app = getApp()

/** 训练记录摘要（供列表展示） */
interface TrainingSummary {
  _id: string
  name: string
  icon: string
  sets: number
  reps: number
  weight: number
  duration: number
  durationDisplay: string
  time: string
}

Component({
  data: {
    tabCurrent: 'record',

    /** 今日概览 */
    overview: {
      completionRate: 0,
      trainingMinutes: 0,
      caloriesBurned: 0,
      goalsCompleted: '0/0',
      caloriesIntake: 0,
    },

    /** 当日训练记录摘要列表 */
    trainingRecords: [] as TrainingSummary[],

    /** 当日饮食记录 */
    dietRecords: [] as any[],

    /** 是否登录 */
    isLoggedIn: false,

    /** 当前选中日期 */
    selectedDate: '',

    /** 是否显示悬浮按钮菜单 */
    showFabMenu: false,

    /** 加载状态 */
    loading: true,

    /** 网络状态 */
    isOffline: false,
  },

  lifetimes: {
    attached() {
      this.setData({ selectedDate: getTodayStr() })
      this.loadData()
      // 注册网络恢复监听
      this._onNetworkChange = (online: boolean) => {
        if (online) {
          this.setData({ isOffline: false })
          this.loadData()
        } else {
          this.setData({ isOffline: true })
        }
      }
      ;(app as any).onNetworkChange(this._onNetworkChange)
    },
    detached() {
      if (this._onNetworkChange) {
        ;(app as any).offNetworkChange(this._onNetworkChange)
      }
    },
  },

  pageLifetimes: {
    show() {
      this.loadData()
    },
  },

  methods: {
    /** 加载页面数据 — 云端优先，离线回退本地 */
    async loadData() {
      const g = app.globalData
      const today = this.data.selectedDate || getTodayStr()
      const online = g.isNetworkAvailable !== false

      this.setData({ isLoggedIn: g.isLoggedIn, isOffline: !online, loading: true })

      try {
        if (online && g.isLoggedIn) {
          // 云端加载：训练记录 + 饮食记录 + 今日概览
          await this.loadFromCloud(today)
        } else {
          // 离线或未登录：本地存储
          this.loadFromLocal(today)
        }
      } catch (err) {
        console.error('云端加载失败，回退本地:', err)
        this.loadFromLocal(today)
        if (online) {
          this.setData({ isOffline: true })
        }
      } finally {
        this.setData({ loading: false })
      }
    },

    /** 从云端加载 */
    async loadFromCloud(today: string) {
      const [trainRes, dietRes, overviewRes] = await Promise.all([
        wx.cloud.callFunction({ name: 'trainingRecord', data: { action: 'list', date: today } }).catch(() => null),
        wx.cloud.callFunction({ name: 'dietRecord', data: { action: 'list', date: today } }).catch(() => null),
        wx.cloud.callFunction({ name: 'statistics', data: { action: 'overview' } }).catch(() => null),
      ])

      // 解析训练记录
      const trainList = (trainRes && trainRes.result && (trainRes.result as any).data && (trainRes.result as any).data.list) || []
      const trainingRecords: TrainingSummary[] = trainList.map((r: any) => {
        const firstEx = r.exercises && r.exercises[0]
        const totalSets = (r.exercises || []).reduce((sum: number, ex: any) => sum + ((ex.sets && ex.sets.length) || 0), 0)
        const totalReps = (r.exercises || []).reduce((sum: number, ex: any) =>
          sum + (ex.sets || []).reduce((s: number, set: any) => s + (set.reps || 0), 0), 0)
        let maxWeight = 0
        ;(r.exercises || []).forEach((ex: any) => (ex.sets || []).forEach((s: any) => { if (s.weight > maxWeight) maxWeight = s.weight }))
        const avgReps = totalSets > 0 ? Math.round(totalReps / totalSets) : 0
        const exLen = (r.exercises && r.exercises.length) || 0
        const name = exLen === 1
          ? (firstEx && firstEx.name) || '训练'
          : exLen + '个动作'
        const time = r.createdAt ? r.createdAt.slice(11, 16) : ''

        return { _id: r._id, name, icon: (firstEx && firstEx.icon) || '🏋️', sets: totalSets, reps: avgReps, weight: maxWeight, duration: r.duration || 0, durationDisplay: formatDuration(r.duration || 0), time }
      })

      // 解析饮食记录
      const dietList = (dietRes && dietRes.result && (dietRes.result as any).data && (dietRes.result as any).data.list) || []
      const dietRecords = dietList.map((r: any) => ({
        _id: r._id,
        name: (r.foods || []).map((f: any) => f.name).join('、'),
        mealType: r.mealType === 'breakfast' ? '早餐' : r.mealType === 'lunch' ? '午餐' : r.mealType === 'dinner' ? '晚餐' : '加餐',
        mealTypeKey: r.mealType,
        weight: (r.foods || []).reduce((s: number, f: any) => s + (f.weight || 0), 0),
        calories: r.totalCalories || 0,
        foods: r.foods || [],
      }))

      // 解析概览
      const overviewData = (overviewRes && overviewRes.result && (overviewRes.result as any).data) || {}
      const todayTrain = overviewData.todayTraining || {}

      this.setData({
        trainingRecords,
        dietRecords,
        overview: {
          completionRate: todayTrain.count > 0 ? Math.min(100, Math.round(todayTrain.count / 5 * 100)) : 0,
          trainingMinutes: todayTrain.duration || 0,
          caloriesBurned: Math.round((todayTrain.duration || 0) * 6),
          goalsCompleted: overviewData.goalProgress ? `${overviewData.goalProgress.current || 0}/${overviewData.goalProgress.target || 0}` : '0/0',
          caloriesIntake: (overviewData.todayDiet || {}).totalCalories || 0,
        },
        isOffline: false,
      })

      // 同步到本地缓存（离线备用）
      this.syncToLocalCache(trainingRecords, dietRecords)
    },

    /** 从本地加载 */
    loadFromLocal(today: string) {
      const records = getTrainingRecords(today)
      const stats = getTodayStats()

      const trainingRecords: TrainingSummary[] = records.map(r => {
        const firstEx = r.exercises[0]
        const totalSets = r.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
        const totalReps = r.exercises.reduce((sum, ex) => sum + ex.sets.reduce((s, set) => s + set.reps, 0), 0)
        let maxWeight = 0
        r.exercises.forEach(ex => ex.sets.forEach(s => { if (s.weight > maxWeight) maxWeight = s.weight }))
        const avgReps = totalSets > 0 ? Math.round(totalReps / totalSets) : 0
        const name = r.exercises.length === 1 ? (firstEx && firstEx.name) || '训练' : r.exercises.length + '个动作'
        const d = new Date(r.createdAt)
        const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

        return { _id: r.id, name, icon: (firstEx && firstEx.icon) || '🏋️', sets: totalSets, reps: avgReps, weight: maxWeight, duration: r.duration || 0, durationDisplay: formatDuration(r.duration || 0), time }
      })

      this.setData({
        trainingRecords,
        overview: {
          ...this.data.overview,
          trainingMinutes: stats.totalDuration,
          caloriesBurned: Math.round(stats.totalVolume * 0.08),
        },
        isOffline: true,
      })
    },

    /** 云端数据同步到本地缓存 */
    syncToLocalCache(trainingRecords: TrainingSummary[], dietRecords: any[]) {
      try {
        wx.setStorageSync('cached_training_records', trainingRecords)
        wx.setStorageSync('cached_diet_records', dietRecords)
        wx.setStorageSync('cached_overview', this.data.overview)
      } catch (e) { /* ignore */ }
    },

    /** 下拉刷新 */
    async onPullDownRefresh() {
      await this.loadData()
      wx.stopPullDownRefresh()
    },

    /* ---- 导航 ---- */

    onOverviewTap() {
      wx.navigateTo({ url: '/pages/statistics/statistics' })
    },

    onDateChange() {
      // 预留：日历组件切换日期
    },

    /* ---- 悬浮按钮 ---- */

    onFabTap() {
      this.setData({ showFabMenu: !this.data.showFabMenu })
    },

    onAddTraining() {
      this.setData({ showFabMenu: false })
      wx.navigateTo({ url: '/pages/training/edit/edit' })
    },

    onAddDiet() {
      this.setData({ showFabMenu: false })
      wx.navigateTo({ url: '/pages/diet-edit/diet-edit' })
    },

    /* ---- 快捷入口 ---- */

    onAIPlan() {
      wx.navigateTo({ url: '/pages/ai-plan/ai-plan' })
    },

    onTutorial() {
      wx.switchTab({ url: '/pages/tutorial/tutorial' })
    },

    /* ---- 训练记录交互 ---- */

    onTrainingTap(e: any) {
      const { id } = e.currentTarget.dataset
      if (id) wx.navigateTo({ url: `/pages/training/detail/detail?id=${id}` })
    },

    /** 删除训练记录（云端优先 + 本地回退） */
    async onDeleteTraining(e: any) {
      const id = e.detail.itemId || e.detail.id
      if (!id) return

      const online = app.globalData.isNetworkAvailable !== false

      if (online) {
        showLoading('删除中…')
        try {
          const res = await wx.cloud.callFunction({ name: 'trainingRecord', data: { action: 'delete', id } })
          const result = res.result as any
          if (result.success) {
            showSuccessToast('删除成功')
          } else {
            showToast(result.errMsg || '删除失败')
          }
        } catch (err: any) {
          showToast(err.message || '删除失败，请检查网络')
        } finally {
          hideLoading()
        }
      } else {
        const ok = deleteTrainingRecord(id)
        if (ok) {
          showSuccessToast('已删除（本地）')
        } else {
          showToast('删除失败')
        }
      }

      this.loadData()
    },

    /* ---- 饮食记录交互 ---- */

    onDietTap(e: any) {
      const { id } = e.currentTarget.dataset
      if (id) wx.navigateTo({ url: `/pages/diet-detail/diet-detail?id=${id}` })
    },

    /** 删除饮食记录 */
    async onDeleteDiet(e: any) {
      const id = e.detail.itemId || e.detail.id
      if (!id) return

      showLoading('删除中…')
      try {
        const res = await wx.cloud.callFunction({ name: 'dietRecord', data: { action: 'delete', id } })
        const result = res.result as any
        if (result.success) {
          showSuccessToast('删除成功')
        } else {
          showToast(result.errMsg || '删除失败')
        }
      } catch (err: any) {
        showToast(err.message || '删除失败')
      } finally {
        hideLoading()
      }

      this.loadData()
    },

    /* ---- 网络重试 ---- */

    onRetryLoad() {
      this.loadData()
    },
  },
})
