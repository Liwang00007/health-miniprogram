// pages/diet-edit/diet-edit.ts
import { getTodayStr, showToast, showLoading, hideLoading } from '../../utils/util'

/** 食物项（来自 foodLib 搜索结果） */
interface FoodItem {
  _id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  unit: string
  category: string
}

/** 营养素数据 */
interface Nutrition {
  calories: number
  protein: number
  carbs: number
  fat: number
}

/** 已选食物（含份量） */
interface SelectedFood {
  name: string
  weight: number
  calories: number
  protein: number
  carbs: number
  fat: number
  unit: string
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const
const MEAL_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
}

Component({
  data: {
    recordDate: getTodayStr(),
    mealType: 'breakfast',
    mealTypes: MEAL_TYPES,
    mealLabels: MEAL_LABELS,

    // 食物搜索
    searchKeyword: '',
    searchResults: [] as FoodItem[],
    showResults: false,
    searching: false,

    // 已选食物列表
    selectedFoods: [] as SelectedFood[],

    // 营养汇总预览
    nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 } as Nutrition,

    // 备注
    notes: '',

    // 表单错误
    errors: {} as Record<string, string>,

    // 保存状态
    saving: false,

    // 编辑模式（传入 id 则为编辑）
    editId: '',
  },

  lifetimes: {
    attached() {
      // 检查是否编辑模式（通过页面参数传入 id）
      const pages = getCurrentPages()
      const current = pages[pages.length - 1] as any
      const options = current?.options || {}
      if (options.id) {
        this.setData({ editId: options.id })
        this.loadRecord(options.id)
      }
    },
  },

  methods: {
    /* ==========================================
       日期
       ========================================== */

    onDateChange(e: any) {
      this.setData({ recordDate: e.detail.value })
    },

    /* ==========================================
       餐别
       ========================================== */

    selectMealType(e: any) {
      this.setData({ mealType: e.currentTarget.dataset.type })
    },

    /* ==========================================
       食物搜索（调用 foodLib 云函数）
       ========================================== */

    onSearchInput(e: any) {
      const keyword = e.detail.value.trim()
      this.setData({ searchKeyword: keyword })

      if (keyword.length < 1) {
        this.setData({ searchResults: [], showResults: false })
        return
      }

      // 防抖搜索
      if ((this as any)._searchTimer) clearTimeout((this as any)._searchTimer)
      ;(this as any)._searchTimer = setTimeout(() => {
        this.searchFoods(keyword)
      }, 300)
    },

    async searchFoods(keyword: string) {
      this.setData({ searching: true })
      try {
        const res = await wx.cloud.callFunction({
          name: 'foodLib',
          data: { action: 'search', keyword, pageSize: 20 },
        })
        const result = res.result as any
        if (result.success && result.data?.list) {
          this.setData({
            searchResults: result.data.list,
            showResults: result.data.list.length > 0,
          })
        } else {
          this.setData({ searchResults: [], showResults: false })
        }
      } catch (err) {
        console.error('食物搜索失败:', err)
        this.setData({ searchResults: [], showResults: false })
      } finally {
        this.setData({ searching: false })
      }
    },

    /** 选中搜索结果中的食物 */
    selectFood(e: any) {
      const { index } = e.currentTarget.dataset
      const food = this.data.searchResults[index]
      if (!food) return

      // 添加到已选列表（默认 100g）
      const item: SelectedFood = {
        name: food.name,
        weight: 100,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        unit: food.unit || 'g',
      }

      const selectedFoods = [...this.data.selectedFoods, item]
      this.setData({
        selectedFoods,
        searchKeyword: '',
        searchResults: [],
        showResults: false,
      })
      this.recalcNutrition()
    },

    /** 关闭搜索结果面板 */
    onSearchBlur() {
      // 延迟关闭，让 selectFood 能触发
      setTimeout(() => {
        this.setData({ showResults: false })
      }, 200)
    },

    /* ==========================================
       已选食物管理
       ========================================== */

    /** 修改某食物的份量 */
    onWeightChange(e: any) {
      const { index } = e.currentTarget.dataset
      const weight = Number(e.detail.value) || 0
      const foods = this.data.selectedFoods
      if (index >= 0 && index < foods.length) {
        foods[index].weight = weight
        this.setData({ selectedFoods: foods })
        this.recalcNutrition()
      }
    },

    /** 减少份量 10g */
    onWeightMinus(e: any) {
      const { index } = e.currentTarget.dataset
      const foods = this.data.selectedFoods
      if (index >= 0 && index < foods.length) {
        foods[index].weight = Math.max(0, foods[index].weight - 10)
        this.setData({ selectedFoods: foods })
        this.recalcNutrition()
      }
    },

    /** 增加份量 10g */
    onWeightPlus(e: any) {
      const { index } = e.currentTarget.dataset
      const foods = this.data.selectedFoods
      if (index >= 0 && index < foods.length) {
        foods[index].weight += 10
        this.setData({ selectedFoods: foods })
        this.recalcNutrition()
      }
    },

    /** 删除某食物 */
    removeFood(e: any) {
      const { index } = e.currentTarget.dataset
      const foods = this.data.selectedFoods.filter((_, i) => i !== index)
      this.setData({ selectedFoods: foods })
      this.recalcNutrition()
    },

    /* ==========================================
       营养计算
       ========================================== */

    /** 根据已选食物 + 份量重新计算营养汇总 */
    recalcNutrition() {
      const foods = this.data.selectedFoods
      if (foods.length === 0) {
        this.setData({ nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 } })
        return
      }

      const total = foods.reduce(
        (sum, f) => {
          const ratio = f.weight / 100
          return {
            calories: sum.calories + Math.round(f.calories * ratio),
            protein: sum.protein + Math.round(f.protein * ratio * 10) / 10,
            carbs: sum.carbs + Math.round(f.carbs * ratio * 10) / 10,
            fat: sum.fat + Math.round(f.fat * ratio * 10) / 10,
          }
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      )

      this.setData({ nutrition: total })
    },

    /* ==========================================
       备注
       ========================================== */

    onNotesInput(e: any) {
      this.setData({ notes: e.detail.value })
    },

    /* ==========================================
       保存
       ========================================== */

    async save() {
      // 表单校验
      const errors: Record<string, string> = {}
      if (!this.data.mealType) {
        errors['mealType'] = '请选择餐别'
      }
      if (this.data.selectedFoods.length === 0) {
        errors['foods'] = '请至少添加一种食物'
      }
      if (Object.keys(errors).length > 0) {
        this.setData({ errors })
        showToast('请完善必填信息')
        return
      }

      this.setData({ saving: true, errors: {} })
      showLoading('保存中…')

      try {
        const recordData = {
          date: this.data.recordDate,
          mealType: this.data.mealType,
          foods: this.data.selectedFoods.map(f => ({
            name: f.name,
            weight: f.weight,
            calories: f.calories,
            protein: f.protein,
            carbs: f.carbs,
            fat: f.fat,
          })),
          notes: this.data.notes,
        }

        const res = await wx.cloud.callFunction({
          name: 'dietRecord',
          data: {
            action: this.data.editId ? 'update' : 'add',
            ...(this.data.editId ? { id: this.data.editId, data: recordData } : { data: recordData }),
          },
        })

        const result = res.result as any
        if (result.success) {
          showToast('保存成功', 'success')
          setTimeout(() => wx.navigateBack(), 1000)
        } else {
          showToast(result.errMsg || '保存失败')
        }
      } catch (err: any) {
        console.error('保存饮食记录失败:', err)
        showToast(err.message || '保存失败')
      } finally {
        this.setData({ saving: false })
        hideLoading()
      }
    },

    /* ==========================================
       加载已有记录（编辑模式）
       ========================================== */

    async loadRecord(id: string) {
      showLoading('加载中…')
      try {
        const res = await wx.cloud.callFunction({
          name: 'dietRecord',
          data: { action: 'detail', id },
        })
        const result = res.result as any
        if (result.success && result.data) {
          const record = result.data
          const selectedFoods: SelectedFood[] = (record.foods || []).map((f: any) => ({
            name: f.name,
            weight: f.weight,
            calories: f.calories,
            protein: f.protein,
            carbs: f.carbs,
            fat: f.fat,
            unit: 'g',
          }))
          this.setData({
            recordDate: record.date,
            mealType: record.mealType,
            selectedFoods,
            notes: record.notes || '',
          })
          this.recalcNutrition()
        }
      } catch (err) {
        console.error('加载饮食记录失败:', err)
        showToast('加载失败')
      } finally {
        hideLoading()
      }
    },
  },
})
