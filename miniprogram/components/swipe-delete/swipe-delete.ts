/**
 * 左滑删除组件
 *
 * 包裹列表项，支持左滑露出删除按钮，删除需二次确认
 *
 * 使用方式：
 * <swipe-delete confirmText="确认删除该记录？" bind:delete="onDelete">
 *   <view class="list-item">...</view>
 * </swipe-delete>
 *
 * 事件：
 *   delete: 用户确认删除后触发
 *   swipe-open: 滑开时触发
 *   swipe-close: 关闭时触发
 */
Component({
  options: {
    multipleSlots: true
  },

  properties: {
    /** 删除按钮宽度（rpx），需与右侧按钮实际宽度一致 */
    deleteWidth: {
      type: Number,
      value: 160
    },
    /** 删除按钮文字 */
    deleteText: {
      type: String,
      value: '删除'
    },
    /** 删除按钮背景色 */
    deleteColor: {
      type: String,
      value: '#FF4757'
    },
    /** 是否需二次确认 */
    confirmDelete: {
      type: Boolean,
      value: true
    },
    /** 二次确认弹窗标题 */
    confirmTitle: {
      type: String,
      value: '确认删除'
    },
    /** 二次确认弹窗内容 */
    confirmText: {
      type: String,
      value: '确认删除该记录？'
    },
    /** 滑动触发阈值（px），超过此距离自动弹开 */
    threshold: {
      type: Number,
      value: 60
    },
    /** 是否禁用滑动删除 */
    disabled: {
      type: Boolean,
      value: false
    },
    /** 关联的数据 ID，会在 delete 事件中回传 */
    itemId: {
      type: String,
      value: ''
    }
  },

  data: {
    translateX: 0,
    opened: false,
    touching: false,
    _startX: 0,
    _startY: 0,
    _startTranslate: 0,
    _isScroll: false
  },

  methods: {
    /** 触摸开始 */
    handleTouchStart(e: any) {
      if (this.data.disabled) return

      const touch = e.touches[0]
      this.data._startX = touch.clientX
      this.data._startY = touch.clientY
      this.data._startTranslate = this.data.translateX
      this.data._isScroll = false
    },

    /** 触摸移动 */
    handleTouchMove(e: any) {
      if (this.data.disabled || this.data._isScroll) return

      const touch = e.touches[0]
      const dx = touch.clientX - this.data._startX
      const dy = touch.clientY - this.data._startY

      // 判断是否为纵向滚动（允许 30° 容差）
      if (!this.data._isScroll && Math.abs(dy) > Math.abs(dx) * 1.2 && Math.abs(dy) > 10) {
        this.data._isScroll = true
        // 如果是滚动且已打开状态，关闭
        if (this.data.opened) {
          this._close()
        }
        return
      }

      if (Math.abs(dx) < 5) return

      let newX = this.data._startTranslate + dx

      // 限幅：只允许左滑（负值），最大不超过 deleteWidth
      const maxSwipe = this.properties.deleteWidth / 750 * wx.getSystemInfoSync().windowWidth
      newX = Math.max(-maxSwipe - 60, Math.min(10, newX))

      this.setData({ translateX: newX, touching: true })
    },

    /** 触摸结束 */
    handleTouchEnd() {
      if (this.data.disabled || this.data._isScroll) return

      const deleteWidthPx = this.properties.deleteWidth / 750 * wx.getSystemInfoSync().windowWidth
      const thresholdPx = this.properties.threshold
      const currentX = this.data.translateX

      this.setData({ touching: false })

      // 超过阈值 → 弹开到 deleteWidth
      if (Math.abs(currentX) > thresholdPx) {
        this.setData({
          translateX: -deleteWidthPx,
          opened: true
        })
        this.triggerEvent('swipe-open')
      } else if (Math.abs(currentX) > 10) {
        // 未达到阈值 → 回弹
        this._close()
      } else {
        this.setData({ translateX: 0, opened: false })
      }
    },

    /** 点击删除按钮 */
    handleDelete() {
      if (this.properties.confirmDelete) {
        wx.showModal({
          title: this.properties.confirmTitle,
          content: this.properties.confirmText,
          confirmColor: '#FF4757',
          success: (res) => {
            if (res.confirm) {
              this._close()
              this.triggerEvent('delete', { id: this.properties.itemId })
            } else {
              this._close()
            }
          }
        })
      } else {
        this._close()
        this.triggerEvent('delete', { id: this.properties.itemId })
      }
    },

    /** 点击内容区：如果已打开则关闭 */
    handleContentTap() {
      if (this.data.opened) {
        this._close()
      }
    },

    /** 关闭滑动 */
    _close() {
      this.setData({
        translateX: 0,
        opened: false
      })
      this.triggerEvent('swipe-close')
    },

    /** 外部调用：强制关闭 */
    close() {
      this._close()
    }
  }
})
