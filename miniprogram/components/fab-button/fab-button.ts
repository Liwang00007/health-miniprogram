/**
 * 悬浮操作按钮（Floating Action Button）
 *
 * 右下角固定"+"按钮，点击展开操作菜单，支持 200ms 缩放动效
 *
 * 使用方式：
 * <fab-button
 *   actions="{{fabActions}}"
 *   bind:trigger="onFabTrigger"
 *   bind:action="onFabAction"
 * />
 *
 * actions 数据格式：
 * [{ text: '添加训练记录', icon: '🏋️', key: 'training' }, ...]
 */
Component({
  properties: {
    /** 菜单项列表 */
    actions: {
      type: Array,
      value: [] as Array<{ text: string; icon?: string; key: string }>
    },
    /** 主按钮是否可见 */
    visible: {
      type: Boolean,
      value: true
    },
    /** 主按钮颜色 */
    color: {
      type: String,
      value: '#FF6B35'
    },
    /** 主按钮尺寸（rpx） */
    size: {
      type: Number,
      value: 112
    },
    /** 与底部距离（rpx） */
    bottom: {
      type: Number,
      value: 160
    },
    /** 与右侧距离（rpx） */
    right: {
      type: Number,
      value: 48
    }
  },

  data: {
    expanded: false,
    maskVisible: false,
    animating: false
  },

  methods: {
    /** 点击主按钮：展开/收起菜单 */
    handleToggle() {
      if (this.data.animating) return

      const expanded = !this.data.expanded
      this.setData({
        animating: true,
        expanded,
        maskVisible: expanded
      })

      // 200ms 动画结束后重置状态
      setTimeout(() => {
        this.setData({ animating: false })
      }, 220)

      this.triggerEvent('trigger', { expanded })
    },

    /** 点击菜单项 */
    handleAction(e: any) {
      const { index } = e.currentTarget.dataset
      const action = this.data.actions[index]
      if (!action) return

      // 先收起菜单
      this.setData({ expanded: false, maskVisible: false, animating: false })

      this.triggerEvent('action', { action, index })
    },

    /** 点击遮罩层收起菜单 */
    handleMaskTap() {
      if (this.data.expanded) {
        this.setData({ expanded: false, maskVisible: false, animating: false })
        this.triggerEvent('trigger', { expanded: false })
      }
    },

    /** 外部调用：展开菜单 */
    expand() {
      if (!this.data.expanded) {
        this.setData({ expanded: true, maskVisible: true })
      }
    },

    /** 外部调用：收起菜单 */
    collapse() {
      if (this.data.expanded) {
        this.setData({ expanded: false, maskVisible: false })
      }
    }
  }
})
