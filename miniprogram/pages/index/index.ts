// pages/index/index.ts
const app = getApp()
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Component({
  data: {
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
      points: 0
    },
    isLoggedIn: false,
    showLoginTip: false,
    todayOverview: {
      trainingMinutes: 45,
      caloriesBurned: 1850,
      goalsCompleted: '3/5'
    }
  },

  lifetimes: {
    attached() {
      this.checkLoginAndLoad()
    }
  },

  pageLifetimes: {
    show() {
      this.checkLoginAndLoad()
    }
  },

  methods: {
    checkLoginAndLoad() {
      const g = app.globalData
      if (g.isLoggedIn && g.userInfo) {
        this.setData({
          isLoggedIn: true,
          showLoginTip: false,
          userInfo: {
            avatarUrl: g.userInfo.avatarUrl || defaultAvatarUrl,
            nickName: g.userInfo.nickName || '健身达人',
            points: g.userInfo.points || 0
          }
        })
      } else {
        this.setData({
          isLoggedIn: false,
          showLoginTip: true
        })
      }
    },

    goToLogin() {
      wx.navigateTo({ url: '/pages/login/login' })
    },

    goToLogs() {
      wx.navigateTo({ url: '/pages/logs/logs' })
    }
  }
})
