// pages/points-detail/points-detail.ts
// 积分明细页 —— 积分余额、每日签到、积分规则、积分变动日志
const app = getApp()

/** 积分日志条目 */
interface PointsLogItem {
  _id: string
  type: string
  amount: number
  description: string
  balance: number
  createdAt: string
  source: string
}

Component({
  data: {
    /** 当前积分 */
    userPoints: 0,

    /** 今日是否已签到 */
    checkedToday: false,

    /** 连续签到天数 */
    streakDays: 0,

    /** 积分变动日志列表 */
    logs: [] as PointsLogItem[],

    /** 加载状态 */
    loading: true,

    /** 签到按钮 loading */
    checkingIn: false,

    /** 分页游标 */
    page: 1,
    pageSize: 50,
    hasMore: false,
    total: 0,
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
    /** 加载全部数据：积分余额 + 签到状态 + 积分日志 */
    async loadData() {
      const g = app.globalData
      this.setData({
        userPoints: g.userInfo?.points || 0,
        loading: true,
      })

      // 并行查询签到状态和积分日志
      try {
        const [, logResult] = await Promise.all([
          this.fetchCheckInStatus(),
          this.fetchPointsLog(),
        ])
        this.setData({
          logs: logResult.list || [],
          total: logResult.total || 0,
          hasMore: (logResult.list || []).length < (logResult.total || 0),
        })
      } catch (err) {
        console.error('加载积分数据失败:', err)
      } finally {
        this.setData({ loading: false })
      }
    },

    /** 获取今日签到状态 */
    async fetchCheckInStatus() {
      try {
        const res = await wx.cloud.callFunction({
          name: 'checkIn',
          data: { action: 'getStatus' },
        })
        const result = res.result as any
        if (result.success && result.data) {
          this.setData({
            checkedToday: result.data.checkedToday || false,
            streakDays: result.data.streakDays || 0,
          })
        }
        return result
      } catch (err) {
        console.error('查询签到状态失败:', err)
        return null
      }
    },

    /** 获取积分变动日志 */
    async fetchPointsLog(page = 1) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'getPointsLog',
          data: { page, pageSize: this.data.pageSize },
        })
        const result = res.result as any
        if (result.success && result.data) {
          return result.data
        }
        return { list: [], total: 0 }
      } catch (err) {
        console.error('查询积分日志失败:', err)
        return { list: [], total: 0 }
      }
    },

    /** 每日签到 */
    async handleCheckIn() {
      if (this.data.checkedToday) {
        wx.showToast({ title: '今日已签到', icon: 'none' })
        return
      }

      this.setData({ checkingIn: true })

      try {
        const res = await wx.cloud.callFunction({
          name: 'checkIn',
          data: { action: 'checkIn' },
        })
        const result = res.result as any

        if (!result.success) {
          wx.showToast({ title: result.errMsg || '签到失败', icon: 'none' })
          return
        }

        const data = result.data

        if (data.alreadyChecked) {
          this.setData({ checkedToday: true })
          wx.showToast({ title: '今日已签到', icon: 'none' })
          return
        }

        // 更新本地积分
        const pointsEarned = data.checkIn?.pointsEarned || 1
        app.addPoints(pointsEarned)

        // 刷新界面
        this.setData({
          checkedToday: true,
          streakDays: data.checkIn?.consecutiveDays || 1,
          userPoints: app.globalData.userInfo?.points || 0,
        })

        wx.showToast({
          title: data.message || `签到成功！+${pointsEarned} 积分`,
          icon: 'success',
        })

        // 重新加载积分日志
        const logResult = await this.fetchPointsLog()
        this.setData({
          logs: logResult.list || [],
          total: logResult.total || 0,
        })
      } catch (err: any) {
        console.error('签到失败:', err)
        wx.showToast({ title: err.message || '签到失败', icon: 'none' })
      } finally {
        this.setData({ checkingIn: false })
      }
    },

    /** 加载更多日志 */
    async loadMore() {
      if (!this.data.hasMore || this.data.loading) return
      const nextPage = this.data.page + 1
      this.setData({ loading: true })
      try {
        const result = await this.fetchPointsLog(nextPage)
        this.setData({
          logs: [...this.data.logs, ...(result.list || [])],
          total: result.total || 0,
          page: nextPage,
          hasMore: (this.data.logs.length + (result.list || []).length) < (result.total || 0),
        })
      } catch (err) {
        console.error('加载更多失败:', err)
      } finally {
        this.setData({ loading: false })
      }
    },
  },
})
