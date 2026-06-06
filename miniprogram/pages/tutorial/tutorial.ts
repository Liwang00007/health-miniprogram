// pages/tutorial/tutorial.ts
const app = getApp()
export {}

/** 部位分类 */
const CATEGORIES = [
  { key: 'all', name: '全部' },
  { key: 'chest', name: '胸' },
  { key: 'back', name: '背' },
  { key: 'legs', name: '腿' },
  { key: 'shoulder', name: '肩' },
  { key: 'arm', name: '臂' },
  { key: 'core', name: '核心' },
]

Component({
  data: {
    tabCurrent: 'tutorial',

    /** 分类列表 */
    categories: CATEGORIES,

    /** 当前选中的分类 */
    activeCategory: 'all',

    /** 搜索关键词 */
    searchKeyword: '',

    /** 教程列表 */
    tutorials: [] as any[],

    /** 收藏的教程 ID 集合 */
    favoriteIds: {} as Record<string, boolean>,

    isLoggedIn: false,
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
      this.setData({
        isLoggedIn: app.globalData.isLoggedIn,
      })
      // TODO: Phase 2 接入真实数据
    },

    /** 切换分类 */
    onCategoryTap(e: any) {
      const { key } = e.currentTarget.dataset
      this.setData({ activeCategory: key })
      // TODO: Phase 2 根据分类筛选
    },

    /** 搜索输入 */
    onSearchInput(e: any) {
      this.setData({ searchKeyword: e.detail.value })
    },

    /** 搜索提交 */
    onSearchConfirm() {
      // TODO: Phase 2 执行搜索
    },

    /** 查看教程详情 */
    onTutorialTap(e: any) {
      const { id } = e.currentTarget.dataset
      wx.navigateTo({ url: `/pages/logs/logs?id=${id}` })
    },

    /** 切换收藏 */
    onToggleFavorite(e: any) {
      const { id } = e.currentTarget.dataset
      const favIds = { ...this.data.favoriteIds }
      if (favIds[id]) {
        delete favIds[id]
        wx.showToast({ title: '已取消收藏', icon: 'none' })
      } else {
        favIds[id] = true
        wx.showToast({ title: '已收藏', icon: 'success' })
      }
      this.setData({ favoriteIds: favIds })
    },

    /** 跳转我的收藏 */
    onMyFavorites() {
      wx.navigateTo({ url: '/pages/logs/logs' })
    },
  },
})
