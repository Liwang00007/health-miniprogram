/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    userInfo?: any
    isLoggedIn: boolean
    cloudEnvId: string
  }
  setUserInfo(userInfo: any): void
  clearLoginStatus(): void
  checkLoginStatus(): void
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback
}
