/**
 * 环形图组件
 *
 * 使用 Canvas 2D 绘制环形进度图，用于展示热量消耗/摄入、训练进度等
 *
 * 使用方式：
 * <ring-chart
 *   percent="{{65}}"
 *   color="#FF6B35"
 *   label="650"
 *   subLabel="消耗千卡"
 *   size="{{220}}"
 * />
 */
Component({
  properties: {
    /** 进度百分比 0-100 */
    percent: {
      type: Number,
      value: 0,
      observer: '_redraw'
    },
    /** 环形颜色 */
    color: {
      type: String,
      value: '#FF6B35',
      observer: '_redraw'
    },
    /** 背景环形颜色 */
    bgColor: {
      type: String,
      value: '#F0F0F0',
      observer: '_redraw'
    },
    /** 渐变色终点（为空则纯色） */
    endColor: {
      type: String,
      value: '',
      observer: '_redraw'
    },
    /** 图表尺寸（rpx → px 转换在绘制时处理） */
    size: {
      type: Number,
      value: 220,
      observer: '_redraw'
    },
    /** 环形线宽（rpx） */
    lineWidth: {
      type: Number,
      value: 24,
      observer: '_redraw'
    },
    /** 圆角端点 */
    roundCap: {
      type: Boolean,
      value: true,
      observer: '_redraw'
    },
    /** 中心主标签文字 */
    label: {
      type: String,
      value: '',
      observer: '_redraw'
    },
    /** 中心副标签文字 */
    subLabel: {
      type: String,
      value: '',
      observer: '_redraw'
    },
    /** 主标签字号 */
    labelSize: {
      type: Number,
      value: 40
    },
    /** 副标签字号 */
    subLabelSize: {
      type: Number,
      value: 22
    },
    /** 动画时长（ms），0 表示无动画 */
    animationDuration: {
      type: Number,
      value: 600
    }
  },

  data: {
    _canvas: null as any,
    _ctx: null as any,
    _width: 0,
    _height: 0,
    _dpr: 1,
    _currentPercent: 0,
    _animTimer: 0
  },

  lifetimes: {
    ready() {
      this._initCanvas()
    },

    detached() {
      if (this.data._animTimer) {
        clearTimeout(this.data._animTimer)
      }
    }
  },

  methods: {
    _initCanvas() {
      const query = this.createSelectorQuery()
      query.select('#ringCanvas')
        .fields({ node: true, size: true })
        .exec((res: any) => {
          if (!res || !res[0] || !res[0].node) {
            // 降级：延迟重试
            setTimeout(() => this._initCanvas(), 100)
            return
          }

          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = wx.getSystemInfoSync().pixelRatio

          canvas.width = res[0].width * dpr
          canvas.height = res[0].height * dpr
          ctx.scale(dpr, dpr)

          this.setData({
            _canvas: canvas,
            _ctx: ctx,
            _width: res[0].width,
            _height: res[0].height,
            _dpr: dpr
          })

          this._draw()
        })
    },

    _redraw() {
      if (this.data._ctx) {
        this._draw()
      }
    },

    /**
     * 绘制环形图（支持动画）
     */
    _draw() {
      const { _ctx: ctx, _width: w, _height: h } = this.data
      if (!ctx) return

      const {
        percent, color, bgColor, endColor,
        lineWidth, roundCap, label, subLabel,
        labelSize, subLabelSize, animationDuration
      } = this.properties

      // rpx → px 粗略换算（以 750 设计稿为基准）
      const rpxRatio = w / 750
      const lw = lineWidth * rpxRatio

      const cx = w / 2
      const cy = h / 2
      const radius = Math.min(cx, cy) - lw / 2 - 4

      const targetPercent = Math.max(0, Math.min(100, percent))

      // 动画绘制
      if (animationDuration > 0 && this.data._currentPercent !== targetPercent) {
        this._animateDraw(ctx, cx, cy, radius, lw, targetPercent,
          bgColor, color, endColor, roundCap, label, subLabel,
          labelSize, subLabelSize, animationDuration, rpxRatio)
      } else {
        this._drawFrame(ctx, cx, cy, radius, lw, targetPercent,
          bgColor, color, endColor, roundCap, label, subLabel,
          labelSize, subLabelSize, rpxRatio)
      }
    },

    /**
     * 动画插值绘制
     */
    _animateDraw(
      ctx: any, cx: number, cy: number, radius: number,
      lw: number, target: number,
      bgColor: string, color: string, endColor: string,
      roundCap: boolean, label: string, subLabel: string,
      labelSize: number, subLabelSize: number,
      duration: number, rpxRatio: number
    ) {
      const start = this.data._currentPercent
      const startTime = Date.now()

      const step = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(1, elapsed / duration)

        // ease-out 缓动
        const eased = 1 - Math.pow(1 - progress, 3)
        const current = start + (target - start) * eased

        this._drawFrame(ctx, cx, cy, radius, lw, current,
          bgColor, color, endColor, roundCap, label, subLabel,
          labelSize, subLabelSize, rpxRatio)

        if (progress < 1) {
          this.data._animTimer = setTimeout(step, 16) as any
        } else {
          this.data._animTimer = 0
          this.data._currentPercent = target
        }
      }

      if (this.data._animTimer) {
        clearTimeout(this.data._animTimer)
      }
      this.data._currentPercent = target
      step()
    },

    /**
     * 绘制一帧
     */
    _drawFrame(
      ctx: any, cx: number, cy: number, radius: number,
      lw: number, percent: number,
      bgColor: string, color: string, endColor: string,
      roundCap: boolean, label: string, subLabel: string,
      labelSize: number, subLabelSize: number, rpxRatio: number
    ) {
      // 清空画布
      ctx.clearRect(0, 0, this.data._width, this.data._height)

      const lineCap = roundCap ? 'round' : 'butt'

      // 绘制背景圆环
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI)
      ctx.strokeStyle = bgColor
      ctx.lineWidth = lw
      ctx.lineCap = lineCap
      ctx.stroke()

      // 绘制进度弧
      if (percent > 0) {
        const startAngle = -Math.PI / 2 // 从顶部 12 点方向开始
        const sweepAngle = (percent / 100) * 2 * Math.PI
        const endAngle = startAngle + sweepAngle

        // 渐变色处理
        let strokeColor = color
        if (endColor && percent > 0) {
          try {
            const grad = ctx.createLinearGradient(
              cx - radius, cy - radius,
              cx + radius, cy + radius
            )
            grad.addColorStop(0, color)
            grad.addColorStop(1, endColor)
            strokeColor = grad
          } catch (_) {
            // 降级为纯色
          }
        }

        ctx.beginPath()
        ctx.arc(cx, cy, radius, startAngle, endAngle)
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = lw
        ctx.lineCap = lineCap
        ctx.stroke()

        // <= 3% 时使用 butt 端点避免显示异常
        if (percent <= 3) {
          ctx.beginPath()
          ctx.arc(cx, cy, radius, startAngle, endAngle)
          ctx.strokeStyle = color
          ctx.lineWidth = lw
          ctx.lineCap = 'butt'
          ctx.stroke()
        }
      }

      // 中心文字
      const labelFontSize = labelSize * rpxRatio
      const subFontSize = subLabelSize * rpxRatio

      if (label) {
        ctx.fillStyle = '#333'
        ctx.font = `600 ${labelFontSize}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, cx, subLabel ? cy - subFontSize * 0.6 : cy)
      }

      if (subLabel) {
        ctx.fillStyle = '#999'
        ctx.font = `${subFontSize}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(subLabel, cx, label ? cy + labelFontSize * 0.55 : cy)
      }
    }
  }
})
