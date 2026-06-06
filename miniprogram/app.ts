// app.ts

/** 用户信息 */
interface UserInfo {
  _openid?: string
  avatarUrl?: string
  nickName?: string
  points?: number
  isNewUser?: boolean
  createTime?: number
}

/** 系统信息 */
interface SystemInfo {
  statusBarHeight: number
  windowWidth: number
  windowHeight: number
  platform: string
  pixelRatio: number
  safeArea?: { top: number; bottom: number; left: number; right: number }
}

/** 网络状态 */
type NetworkType = 'wifi' | '2g' | '3g' | '4g' | '5g' | 'unknown' | 'none'

/** 全局数据 */
interface IGlobalData {
  userInfo?: UserInfo
  isLoggedIn: boolean
  cloudEnvId: string
  systemInfo: SystemInfo
  networkType: NetworkType
  isNetworkAvailable: boolean
}

/** App 实例接口 */
interface IAppOption {
  globalData: IGlobalData

  /** 用户相关 */
  checkLoginStatus(): void
  setUserInfo(userInfo: UserInfo): void
  clearLoginStatus(): void
  isUserLoggedIn(): boolean

  /** 积分管理 */
  getPoints(): number
  addPoints(n: number): boolean
  deductPoints(n: number): boolean
  hasEnoughPoints(n: number): boolean

  /** 系统 */
  getSystemInfo(): SystemInfo
  updateNetworkStatus(type: NetworkType): void

  /** 网络监听 */
  _networkListeners: Array<(online: boolean) => void>
  onNetworkChange(cb: (online: boolean) => void): void
  offNetworkChange(cb: (online: boolean) => void): void
}

App<IAppOption>({
  globalData: {
    userInfo: undefined,
    isLoggedIn: false,
    cloudEnvId: 'cloud1-d8gj3xk2oa78ca88b',
    systemInfo: {
      statusBarHeight: 44,
      windowWidth: 375,
      windowHeight: 667,
      platform: 'android',
      pixelRatio: 2,
    },
    networkType: 'unknown',
    isNetworkAvailable: true,
  },

  /* ============================================
     Lifecycle
     ============================================ */

  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: this.globalData.cloudEnvId,
        traceUser: true,
      })
    }

    // 获取系统信息
    this.getSystemInfo()

    // 检查登录状态
    this.checkLoginStatus()

    // 监听网络状态
    const that = this
    wx.onNetworkStatusChange(function (res) {
      that.updateNetworkStatus(res.networkType)
    })

    // 首次获取网络状态
    wx.getNetworkType({
      success(res) {
        that.updateNetworkStatus(res.networkType)
      },
    })

    // 登录门控：未登录跳转登录页
    if (!this.globalData.isLoggedIn) {
      // 短暂延迟，等页面栈初始化
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/login/login' })
      }, 300)
    }
  },

  /* ============================================
     用户相关
     ============================================ */

  checkLoginStatus() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        const parsed = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo
        if (parsed && parsed._openid) {
          this.globalData.userInfo = parsed
          this.globalData.isLoggedIn = true
        }
      }
    } catch (e) {
      console.error('读取本地用户信息失败:', e)
    }
  },

  setUserInfo(userInfo: UserInfo) {
    // 新用户赠送 10 积分
    if (!userInfo.points && userInfo.points !== 0) {
      userInfo.points = userInfo.isNewUser ? 10 : 0
    }
    if (!userInfo.createTime) {
      userInfo.createTime = Date.now()
    }

    this.globalData.userInfo = userInfo
    this.globalData.isLoggedIn = true

    try {
      wx.setStorageSync('userInfo', JSON.stringify(userInfo))
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

  isUserLoggedIn(): boolean {
    return this.globalData.isLoggedIn && !!this.globalData.userInfo
  },

  /* ============================================
     积分管理（需求文档 §2.4.3 积分规则）
     ============================================ */

  getPoints(): number {
    return (this.globalData.userInfo && this.globalData.userInfo.points) || 0
  },

  addPoints(n: number): boolean {
    if (n <= 0) return false
    const user = this.globalData.userInfo
    if (!user) return false

    user.points = (user.points || 0) + n
    try {
      wx.setStorageSync('userInfo', JSON.stringify(user))
      return true
    } catch (e) {
      console.error('积分更新失败:', e)
      user.points -= n // 回滚
      return false
    }
  },

  deductPoints(n: number): boolean {
    if (n <= 0) return false
    const user = this.globalData.userInfo
    if (!user) return false
    if ((user.points || 0) < n) return false

    user.points = (user.points || 0) - n
    try {
      wx.setStorageSync('userInfo', JSON.stringify(user))
      return true
    } catch (e) {
      console.error('积分更新失败:', e)
      user.points += n // 回滚
      return false
    }
  },

  hasEnoughPoints(n: number): boolean {
    return this.getPoints() >= n
  },

  /* ============================================
     系统信息
     ============================================ */

  getSystemInfo(): SystemInfo {
    try {
      const res = wx.getSystemInfoSync()
      const info: SystemInfo = {
        statusBarHeight: res.statusBarHeight || 44,
        windowWidth: res.windowWidth,
        windowHeight: res.windowHeight,
        platform: res.platform,
        pixelRatio: res.pixelRatio,
        safeArea: res.safeArea,
      }
      this.globalData.systemInfo = info
      return info
    } catch (e) {
      console.error('获取系统信息失败:', e)
      return this.globalData.systemInfo
    }
  },

  /** 网络状态变化监听器列表 */
  _networkListeners: [] as Array<(online: boolean) => void>,

  /** 注册网络状态变化监听器 */
  onNetworkChange(cb: (online: boolean) => void) {
    if (!this._networkListeners) this._networkListeners = []
    this._networkListeners.push(cb)
  },

  /** 取消网络状态变化监听器 */
  offNetworkChange(cb: (online: boolean) => void) {
    if (!this._networkListeners) return
    const idx = this._networkListeners.indexOf(cb)
    if (idx >= 0) this._networkListeners.splice(idx, 1)
  },

  updateNetworkStatus(type: NetworkType) {
    const wasOffline = !this.globalData.isNetworkAvailable
    this.globalData.networkType = type
    this.globalData.isNetworkAvailable = type !== 'none' && type !== 'unknown'

    // 网络恢复时通知监听器
    if (wasOffline && this.globalData.isNetworkAvailable) {
      wx.showToast({ title: '网络已恢复', icon: 'none', duration: 2000 })
      if (this._networkListeners) {
        this._networkListeners.forEach(cb => {
          try { cb(true) } catch (e) { /* ignore */ }
        })
      }
    }

    // 网络断开时也通知
    if (!wasOffline && !this.globalData.isNetworkAvailable) {
      if (this._networkListeners) {
        this._networkListeners.forEach(cb => {
          try { cb(false) } catch (e) { /* ignore */ }
        })
      }
    }
  },
})
