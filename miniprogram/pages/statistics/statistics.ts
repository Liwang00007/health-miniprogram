// pages/statistics/statistics.ts
import { getToday, getDateBefore } from '../../utils/date'
import { callCloudFunction } from '../../utils/api'

Component({
  data: {
    startDate: getDateBefore(7),
    endDate: getToday(),
    stats: {
      totalTrainingCount: 0,
      totalTrainingMinutes: 0,
      totalCaloriesIntake: 0,
      totalProtein: 0,
      bodyPartDistribution: {} as Record<string, number>,
      recordDays: 0,
    },
    maxBodyPart: 1,
    loading: true,
  },

  lifetimes: {
    attached() {
      const pages = getCurrentPages()
      const options = (pages[pages.length - 1] as any).options
      if (options && options.date) {
        // 单日统计 -> 使用该日作为起止日期
        this.setData({ startDate: options.date, endDate: options.date })
      }
      this.loadStats()
    },
  },

  methods: {
    async loadStats() {
      this.setData({ loading: true })
      try {
        const stats = await callCloudFunction('getStatistics', {
          startDate: this.data.startDate,
          endDate: this.data.endDate,
        })
        const distribution = (stats && stats.bodyPartDistribution) || {}
        const maxVal = Math.max(1, ...Object.values(distribution) as number[])
        this.setData({
          stats: stats || this.data.stats,
          maxBodyPart: maxVal,
        })
      } catch (err) {
        console.error('加载统计数据失败:', err)
        wx.showToast({ title: '加载统计失败', icon: 'none' })
      } finally {
        this.setData({ loading: false })
      }
    },

    /** 获取肌群分布条目列表（按数量降序） */
    getDistributionList(): Array<{ key: string; value: number; percent: number }> {
      const dist = this.data.stats.bodyPartDistribution || {}
      const maxVal = this.data.maxBodyPart
      return Object.entries(dist)
        .map(([key, value]) => ({
          key,
          value: value as number,
          percent: maxVal > 0 ? Math.round(((value as number) / maxVal) * 100) : 0,
        }))
        .sort((a, b) => b.value - a.value)
    },
  },
})
