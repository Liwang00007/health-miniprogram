// pages/login/login.ts
const app = getApp()

Component({
  data: {
    agreedToPrivacy: false,
    isLoading: false,
    errorMsg: '',
  },

  methods: {
    toggleAgreement() {
      this.setData({
        agreedToPrivacy: !this.data.agreedToPrivacy,
        errorMsg: ''
      })
    },

    handleWechatLogin() {
      if (!this.data.agreedToPrivacy) {
        this.setData({ errorMsg: '请先阅读并同意隐私政策和用户协议' })
        return
      }

      if (this.data.isLoading) return

      this.setData({ isLoading: true, errorMsg: '' })

      const that = this

      wx.login({
        success(loginRes) {
          if (!loginRes.code) {
            that.setData({ errorMsg: '获取登录凭证失败', isLoading: false })
            return
          }

          wx.cloud.callFunction({
            name: 'userLogin',
            data: { code: loginRes.code },
            success(cloudRes) {
              const result = cloudRes.result
              if (!result.success) {
                that.setData({ errorMsg: result.errMsg || '登录失败', isLoading: false })
                return
              }

              const userInfo = result.data
              app.setUserInfo(userInfo)

              const toastTitle = userInfo.isNewUser ? '注册成功！已赠送10积分' : '登录成功'
              wx.showToast({ title: toastTitle, icon: 'success', duration: 1500 })

              const delay = userInfo.isNewUser ? 2000 : 1000
              setTimeout(() => {
                wx.reLaunch({ url: '/pages/index/index' })
              }, delay)
            },
            fail(err) {
              console.error('云函数调用失败:', err)
              that.setData({ errorMsg: '登录失败，请稍后重试', isLoading: false })
            }
          })
        },
        fail(err) {
          console.error('wx.login 失败:', err)
          that.setData({ errorMsg: '获取登录凭证失败', isLoading: false })
        }
      })
    },

    viewPrivacyPolicy() {
      wx.showModal({
        title: '隐私政策',
        content: 'FitPlan 健身助手尊重并保护您的个人隐私。我们会按照《个人信息保护法》的要求收集和使用您的数据，仅用于提供训练和饮食管理服务。',
        showCancel: false,
        confirmText: '我知道了'
      })
    },

    viewUserAgreement() {
      wx.showModal({
        title: '用户协议',
        content: '使用 FitPlan 健身助手服务即表示您同意本协议。AI 生成的训练和饮食计划仅供参考，请在执行前根据自身情况判断适宜性。',
        showCancel: false,
        confirmText: '我知道了'
      })
    },

    skipLogin() {
      wx.showModal({
        title: '提示',
        content: '未登录状态下仅可浏览教程库公开内容。',
        confirmText: '先去逛逛',
        cancelText: '返回登录',
        success(res) {
          if (res.confirm) {
            wx.reLaunch({ url: '/pages/index/index' })
          }
        }
      })
    }
  }
})
