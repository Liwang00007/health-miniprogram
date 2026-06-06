// app.ts
App<IAppOption>({
  globalData: {
    userInfo: undefined,
    isLoggedIn: false,
    cloudEnvId: 'cloud1-d8gj3xk2oa78ca88b',
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      env: this.globalData.cloudEnvId,
      traceUser: true,
    })
    this.checkLoginStatus()
  },

  checkLoginStatus() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo && userInfo._openid) {
        this.globalData.userInfo = userInfo
        this.globalData.isLoggedIn = true
      }
    } catch (e) {
      console.error('读取本地用户信息失败:', e)
    }
  },

  setUserInfo(userInfo: any) {
    this.globalData.userInfo = userInfo
    this.globalData.isLoggedIn = true
    try {
      wx.setStorageSync('userInfo', userInfo)
    } catch (e) {
      console.error('保存用户信息失败:', e)
    }
  },

  clearLoginStatus() {
    this.globalData.userInfo = undefined
    this.globalData.isLoggedIn = false
    try {
      wx.removeStorageSync('userInfo')
    } catch (e) {
      console.error('清除用户信息失败:', e)
    }
  },
})
