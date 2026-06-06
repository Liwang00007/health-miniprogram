// utils/api.ts

/** 云函数调用封装 — 统一错误处理 */
export async function callCloudFunction<T = any>(name: string, data: Record<string, any> = {}): Promise<T> {
  try {
    const res = await wx.cloud.callFunction({ name, data })
    const result = res.result as any
    if (!result.success) {
      throw new Error(result.errMsg || `${name} 调用失败`)
    }
    return result.data as T
  } catch (err: any) {
    console.error(`[api] ${name} 错误:`, err)
    throw err
  }
}

/** 网络状态检查 */
export function checkNetwork(): Promise<boolean> {
  return new Promise((resolve) => {
    wx.getNetworkType({
      success: (res) => resolve(res.networkType !== 'none'),
      fail: () => resolve(false),
    })
  })
}
