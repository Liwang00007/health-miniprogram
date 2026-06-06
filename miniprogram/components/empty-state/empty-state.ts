/**
 * 空状态组件
 *
 * 无数据时展示插画 + 引导文案 + 操作按钮，避免空白页
 *
 * 使用方式：
 * <empty-state
 *   title="暂无训练记录"
 *   description="点击下方按钮开始记录你的第一次训练"
 *   buttonText="添加训练记录"
 *   bind:action="onEmptyAction"
 * />
 */
Component({
  properties: {
    /** 插画图标（emoji 或图片路径） */
    image: {
      type: String,
      value: '📋'
    },
    /** 是否使用图片模式（而非 emoji） */
    useImage: {
      type: Boolean,
      value: false
    },
    /** 图片/插画尺寸（rpx） */
    imageSize: {
      type: Number,
      value: 200
    },
    /** 主标题 */
    title: {
      type: String,
      value: '暂无数据'
    },
    /** 副标题/描述 */
    description: {
      type: String,
      value: ''
    },
    /** 操作按钮文案，为空时不显示按钮 */
    buttonText: {
      type: String,
      value: ''
    },
    /** 按钮类型 */
    buttonType: {
      type: String,
      value: 'primary' // primary | outline | text
    },
    /** 是否显示按钮 */
    showButton: {
      type: Boolean,
      value: true
    },
    /** 距离顶部的间距（rpx），用于垂直居中调整 */
    topOffset: {
      type: Number,
      value: 200
    }
  },

  data: {
    // 暂无需要动态计算的数据
  },

  methods: {
    /** 点击操作按钮 */
    handleAction() {
      this.triggerEvent('action')
    }
  }
})
