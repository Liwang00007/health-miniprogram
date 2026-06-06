/**
 * 计时器组件
 *
 * 支持倒计时 & 正计时两种模式，用于训练记录时长计时
 *
 * 使用方式：
 * <!-- 倒计时模式 -->
 * <timer mode="countdown" initialSeconds="{{120}}" bind:complete="onTimerComplete" />
 *
 * <!-- 正计时模式 -->
 * <timer mode="stopwatch" bind:tick="onTimerTick" />
 *
 * 事件：
 *   start: 计时开始，detail = { seconds }
 *   pause: 计时暂停，detail = { seconds }
 *   reset: 计时重置
 *   tick: 每秒触发，detail = { seconds, display }
 *   complete: 倒计时结束触发
 */
Component({
  properties: {
    /** 计时模式：countdown | stopwatch */
    mode: {
      type: String,
      value: 'stopwatch'
    },
    /** 倒计时初始秒数 */
    initialSeconds: {
      type: Number,
      value: 60
    },
    /** 是否自动开始 */
    autoStart: {
      type: Boolean,
      value: false
    },
    /** 是否显示快捷预设按钮（倒计时模式） */
    showPresets: {
      type: Boolean,
      value: true
    },
    /** 倒计时预设选项（秒） */
    presets: {
      type: Array,
      value: [30, 60, 120, 180, 300]
    },
    /** 大尺寸展示 */
    large: {
      type: Boolean,
      value: true
    },
    /** 倒计时结束时是否振动 */
    vibrate: {
      type: Boolean,
      value: true
    }
  },

  data: {
    /** 当前剩余/已过秒数 */
    seconds: 0,
    /** 格式化显示 MM:SS */
    display: '00:00',
    /** 计时状态 */
    status: 'idle' as 'idle' | 'running' | 'paused',
    /** 定时器 ID */
    _timer: 0
  },

  lifetimes: {
    attached() {
      const seconds = this.properties.mode === 'countdown'
        ? this.properties.initialSeconds
        : 0
      this.setData({
        seconds,
        display: this._formatTime(seconds)
      })

      if (this.properties.autoStart) {
        this.start()
      }
    },

    detached() {
      this._clearTimer()
    }
  },

  methods: {
    /**
     * 开始计时
     */
    start() {
      if (this.data.status === 'running') return

      // 倒计时已归零时重置
      if (this.properties.mode === 'countdown' && this.data.seconds <= 0) {
        this.setData({
          seconds: this.properties.initialSeconds,
          display: this._formatTime(this.properties.initialSeconds)
        })
      }

      this.setData({ status: 'running' })

      this._clearTimer()
      this.data._timer = setInterval(() => {
        this._tick()
      }, 1000) as any

      this.triggerEvent('start', { seconds: this.data.seconds })
    },

    /**
     * 暂停计时
     */
    pause() {
      if (this.data.status !== 'running') return

      this._clearTimer()
      this.setData({ status: 'paused' })

      this.triggerEvent('pause', { seconds: this.data.seconds })
    },

    /**
     * 切换 开始/暂停
     */
    toggle() {
      if (this.data.status === 'running') {
        this.pause()
      } else {
        this.start()
      }
    },

    /**
     * 重置
     */
    reset() {
      this._clearTimer()

      const seconds = this.properties.mode === 'countdown'
        ? this.properties.initialSeconds
        : 0

      this.setData({
        seconds,
        display: this._formatTime(seconds),
        status: 'idle'
      })

      this.triggerEvent('reset', { seconds })
    },

    /**
     * 设置倒计时秒数（快捷预设）
     */
    setSeconds(e: any) {
      if (this.data.status === 'running') return

      const seconds = Number(e.currentTarget.dataset.seconds)
      this.setData({
        seconds,
        display: this._formatTime(seconds)
      })
    },

    /**
     * 获取当前秒数（外部调用）
     */
    getSeconds(): number {
      return this.data.seconds
    },

    /**
     * 获取格式化时间（外部调用）
     */
    getDisplay(): string {
      return this.data.display
    },

    /** 每秒 tick */
    _tick() {
      const mode = this.properties.mode
      let seconds: number

      if (mode === 'countdown') {
        seconds = this.data.seconds - 1

        if (seconds <= 0) {
          seconds = 0
          this._clearTimer()
          this.setData({
            seconds: 0,
            display: '00:00',
            status: 'idle'
          })

          // 振动反馈
          if (this.properties.vibrate) {
            wx.vibrateLong({ fail: () => {} })
          }

          this.triggerEvent('tick', { seconds: 0, display: '00:00' })
          this.triggerEvent('complete', { seconds: 0 })
          return
        }
      } else {
        seconds = this.data.seconds + 1
      }

      const display = this._formatTime(seconds)
      this.setData({ seconds, display })

      this.triggerEvent('tick', { seconds, display })
    },

    /** 清除定时器 */
    _clearTimer() {
      if (this.data._timer) {
        clearInterval(this.data._timer)
        this.data._timer = 0
      }
    },

    /** 格式化秒数为 MM:SS */
    _formatTime(totalSeconds: number): string {
      const mins = Math.floor(totalSeconds / 60)
      const secs = totalSeconds % 60
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
  }
})
