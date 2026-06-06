/**
 * 自定义底部导航栏组件
 *
 * 四个 Tab：记录 / 目标 / 教程 / 我的
 * 选中态：主色填充图标 + 加粗文字
 * 非选中态：灰色线性图标
 */

/** Tab 配置 */
interface TabItem {
  key: string
  text: string
  icon: string       // 未选中图标（emoji / 文字符号）
  iconActive: string  // 选中图标
  pagePath: string
}

const TABS: TabItem[] = [
  { key: 'record',   text: '记录', icon: '📋', iconActive: '📋', pagePath: '/pages/record/record' },
  { key: 'goal',     text: '目标', icon: '🎯', iconActive: '🎯', pagePath: '/pages/goal/goal' },
  { key: 'tutorial', text: '教程', icon: '📖', iconActive: '📖', pagePath: '/pages/tutorial/tutorial' },
  { key: 'mine',     text: '我的', icon: '👤', iconActive: '👤', pagePath: '/pages/mine/mine' },
]

Component({
  properties: {
    /** 当前选中的 Tab key */
    current: {
      type: String,
      value: 'record',
    },
  },

  data: {
    tabs: TABS,
  },

  methods: {
    /** 点击切换 Tab */
    onTabTap(e: WechatMiniprogram.BaseEvent) {
      const { key, path } = e.currentTarget.dataset
      if (key === this.data.current) return

      // 用 switchTab 跳转（需页面在 app.json 中注册）
      wx.switchTab({
        url: path,
        fail() {
          // 降级为 redirectTo
          wx.redirectTo({ url: path })
        },
      })
    },
  },
})
