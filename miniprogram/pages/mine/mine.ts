// pages/mine/mine.ts
const app = getApp()
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
export {}

Component({
  data: {
    tabCurrent: 'mine',

    /** 是否登录 */
    isLoggedIn: false,

    /** 用户信息 */
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
      points: 0,
    },

    /** 训练统计 */
    stats: {
      totalSessions: 0,    // 累计训练次数
      totalMinutes: 0,     // 累计训练时长 min
      streakDays: 0,       // 连续打卡天数
    },

    /** 功能菜单 */
    menuList: [
      { key: 'trainingPlans', icon: '🏋️', title: '我的训练计划', desc: 'AI 生成的训练方案', arrow: true },
      { key: 'dietPlans',     icon: '🥗', title: '我的饮食计划', desc: 'AI 生成的饮食方案', arrow: true },
      { key: 'favorites',     icon: '⭐', title: '我的收藏',     desc: '收藏的教程与计划',   arrow: true },
      { key: 'export',        icon: '📤', title: '数据导出',     desc: '导出训练/饮食 CSV',  arrow: true },
      { key: 'reminder',      icon: '🔔', title: '提醒设置',     desc: '训练与饮食记录提醒',  arrow: true },
      { key: 'settings',      icon: '⚙️', title: '设置',         desc: '隐私、协议、缓存管理', arrow: true },
    ],

    /** 退出确认弹窗 */
    showLogoutModal: false,
    logoutConfirming: false,
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
    loadData() {
      const g = app.globalData
      const loggedIn = g.isLoggedIn && !!g.userInfo

      if (loggedIn && g.userInfo) {
        this.setData({
          isLoggedIn: true,
          userInfo: {
            avatarUrl: g.userInfo.avatarUrl || defaultAvatarUrl,
            nickName: g.userInfo.nickName || '健身达人',
            points: g.userInfo.points || 0,
          },
          stats: {
            totalSessions: g.userInfo.totalSessions || 0,
            totalMinutes: g.userInfo.totalMinutes || 0,
            streakDays: g.userInfo.streakDays || 0,
          },
        })
      } else {
        this.setData({
          isLoggedIn: false,
          userInfo: {
            avatarUrl: defaultAvatarUrl,
            nickName: '',
            points: 0,
          },
          stats: { totalSessions: 0, totalMinutes: 0, streakDays: 0 },
        })
      }
    },

    /** 点击登录 */
    onLoginTap() {
      wx.navigateTo({ url: '/pages/login/login' })
    },

    /** 查看积分明细 */
    onPointsTap() {
      wx.navigateTo({ url: '/pages/points-detail/points-detail' })
    },

    /** 查看统计详情 */
    onStatsTap() {
      wx.navigateTo({ url: '/pages/statistics/statistics' })
    },

    /** 点击功能菜单 */
    onMenuTap(e: any) {
      const { key } = e.currentTarget.dataset
      switch (key) {
        case 'trainingPlans':
          wx.switchTab({ url: '/pages/goal/goal' })
          break
        case 'dietPlans':
          wx.switchTab({ url: '/pages/goal/goal' })
          break
        case 'favorites':
          wx.switchTab({ url: '/pages/tutorial/tutorial' })
          break
        case 'export':
          wx.navigateTo({ url: '/pages/settings/settings' })
          break
        case 'settings':
          wx.navigateTo({ url: '/pages/settings/settings' })
          break
        default:
          wx.showToast({ title: '功能开发中', icon: 'none' })
      }
    },

    /** 退出登录 — 弹窗确认 */
    onLogoutTap() {
      this.setData({ showLogoutModal: true })
    },

    /** 取消退出 */
    onLogoutCancel() {
      this.setData({ showLogoutModal: false })
    },

    /** 确认退出 */
    onLogoutConfirm() {
      this.setData({ logoutConfirming: true })
      app.clearLoginStatus()
      // 清除所有本地缓存
      try { wx.clearStorageSync() } catch (e) { /* ignore */ }
      setTimeout(() => {
        this.setData({ showLogoutModal: false, logoutConfirming: false })
        wx.reLaunch({ url: '/pages/login/login' })
      }, 300)
    },
  },
})
