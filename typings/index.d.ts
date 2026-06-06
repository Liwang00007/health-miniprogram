/// <reference path="./types/index.d.ts" />

interface IAppOption {
  setUserInfo(userInfo: any): void
  clearLoginStatus(): void
  checkLoginStatus(): void
  isUserLoggedIn(): boolean
  getPoints(): number
  addPoints(n: number): boolean
  deductPoints(n: number): boolean
  hasEnoughPoints(n: number): boolean
  getSystemInfo(): any
  updateNetworkStatus(type: string): void
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback
}
