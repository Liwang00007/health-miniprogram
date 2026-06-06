// pages/settings/settings.ts
const app = getApp()
export {}

Component({
  data: {
    /** 提醒开关 */
    remindTraining: true,
    remindDiet: true,
  },

  methods: {
    /* ==========================================
       提醒设置
       ========================================== */

    toggleRemind(e: any) {
      const { type } = e.currentTarget.dataset
      const field = type === 'training' ? 'remindTraining' : 'remindDiet'
      const newVal = !(this.data as any)[field]
      this.setData({ [field]: newVal })

      // 持久化提醒设置
      try {
        const settings = wx.getStorageSync('remindSettings') || {}
        settings[field] = newVal
        wx.setStorageSync('remindSettings', settings)
      } catch (err) {
        console.warn('保存提醒设置失败:', err)
      }
    },

    /* ==========================================
       数据管理
       ========================================== */

    /** 导出训练数据 CSV */
    async exportTrainingCSV() {
      try {
        const res = await wx.cloud.callFunction({
          name: 'statistics',
          data: { action: 'exportCSV', type: 'training' },
        })
        const result = res.result as any
        if (result.success && result.data && result.data.csv) {
          wx.setClipboardData({
            data: result.data.csv,
            success: () => wx.showToast({ title: '训练数据已复制到剪贴板', icon: 'success' }),
          })
        } else {
          wx.showToast({ title: result.errMsg || '暂无训练数据', icon: 'none' })
        }
      } catch (err: any) {
        console.error('导出训练数据失败:', err)
        wx.showToast({ title: '导出失败，请稍后重试', icon: 'none' })
      }
    },

    /** 导出饮食数据 CSV */
    async exportDietCSV() {
      try {
        const res = await wx.cloud.callFunction({
          name: 'statistics',
          data: { action: 'exportCSV', type: 'diet' },
        })
        const result = res.result as any
        if (result.success && result.data && result.data.csv) {
          wx.setClipboardData({
            data: result.data.csv,
            success: () => wx.showToast({ title: '饮食数据已复制到剪贴板', icon: 'success' }),
          })
        } else {
          wx.showToast({ title: result.errMsg || '暂无饮食数据', icon: 'none' })
        }
      } catch (err: any) {
        console.error('导出饮食数据失败:', err)
        wx.showToast({ title: '导出失败，请稍后重试', icon: 'none' })
      }
    },

    /** 清除缓存 */
    clearCache() {
      wx.showModal({
        title: '清除缓存',
        content: '这将清除所有本地缓存数据（包括登录信息），确定继续？',
        confirmColor: '#FF4757',
        success: (res) => {
          if (res.confirm) {
            try {
              wx.clearStorageSync()
              wx.showToast({ title: '缓存已清除', icon: 'success' })
              // 跳转到登录页
              setTimeout(() => {
                wx.reLaunch({ url: '/pages/login/login' })
              }, 1000)
            } catch (e) {
              wx.showToast({ title: '清除失败', icon: 'none' })
            }
          }
        },
      })
    },

    /* ==========================================
       关于
       ========================================== */

    /** 查看隐私政策 */
    viewPrivacyPolicy() {
      wx.showModal({
        title: '隐私政策',
        content: 'FitPlan 尊重并保护您的个人隐私。我们会按照《个人信息保护法》要求收集和使用数据，仅用于训练和饮食管理服务，不会与第三方共享您的个人数据。',
        showCancel: false,
        confirmText: '我知道了',
      })
    },

    /** 查看用户协议 */
    viewUserAgreement() {
      wx.showModal({
        title: '用户协议',
        content: '使用 FitPlan 即表示您同意本协议。AI 生成的训练和饮食计划仅供参考，请在执行前根据自身情况判断，必要时咨询专业教练或医生。开发者不对因使用 AI 建议产生的运动损伤承担责任。',
        showCancel: false,
        confirmText: '我知道了',
      })
    },
  },
})
