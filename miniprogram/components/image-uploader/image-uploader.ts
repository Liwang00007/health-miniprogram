// components/image-uploader/image-uploader.ts
/**
 * 图片上传组件
 * 功能：选择图片 → 预览 → 上传到云存储 → 调用云函数记录元数据 → 返回 fileID
 *
 * 使用方式：
 * <image-uploader
 *   category="food"
 *   maxCount="3"
 *   bind:upload-success="onImageUploaded"
 * />
 *
 * 事件：
 *   upload-success: 上传成功，detail = { fileID, imageId }
 *   upload-fail: 上传失败，detail = { errMsg }
 *   upload-start: 开始上传
 *   upload-progress: 上传进度，detail = { progress }
 */

Component({
  properties: {
    /** 图片分类：avatar / food / training / general */
    category: {
      type: String,
      value: 'general'
    },
    /** 最多可选择图片数量 */
    maxCount: {
      type: Number,
      value: 1
    },
    /** 是否显示预览列表 */
    showPreview: {
      type: Boolean,
      value: true
    },
    /** 云存储上传路径前缀 */
    cloudPathPrefix: {
      type: String,
      value: 'images'
    }
  },

  data: {
    /** 已选图片的本地路径列表 */
    tempFiles: [] as Array<{
      path: string
      size: number
      name: string
    }>,
    /** 上传完成的 fileID 列表 */
    uploadedFileIDs: [] as string[],
    /** 是否正在上传 */
    isUploading: false,
    /** 上传进度 */
    uploadProgress: 0,
  },

  methods: {
    /**
     * 选择图片
     */
    async handleChooseImage() {
      const { maxCount, tempFiles } = this.data
      const remaining = maxCount - tempFiles.length

      if (remaining <= 0) {
        wx.showToast({
          title: `最多选择${maxCount}张图片`,
          icon: 'none'
        })
        return
      }

      try {
        const res = await wx.chooseMedia({
          count: remaining,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          sizeType: ['compressed']
        })

        const newFiles = res.tempFiles.map(file => ({
          path: file.tempFilePath,
          size: file.size,
          name: `image_${Date.now()}.jpg`
        }))

        this.setData({
          tempFiles: [...tempFiles, ...newFiles]
        })

        // 自动开始上传
        this.uploadImages()
      } catch (err: any) {
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          console.error('选择图片失败:', err)
          wx.showToast({
            title: '选择图片失败',
            icon: 'none'
          })
        }
      }
    },

    /**
     * 删除预览中的图片
     */
    handleRemoveImage(e: any) {
      const { index } = e.currentTarget.dataset
      const { tempFiles, uploadedFileIDs } = this.data

      tempFiles.splice(index, 1)
      if (uploadedFileIDs[index]) {
        uploadedFileIDs.splice(index, 1)
      }

      this.setData({ tempFiles, uploadedFileIDs })
    },

    /**
     * 上传所有已选图片到云存储
     */
    async uploadImages() {
      const { tempFiles, uploadedFileIDs, isUploading } = this.data

      if (isUploading || tempFiles.length === 0) return

      // 找出还没上传的图片
      const pendingIndexes: number[] = []
      tempFiles.forEach((_, i) => {
        if (!uploadedFileIDs[i]) {
          pendingIndexes.push(i)
        }
      })

      if (pendingIndexes.length === 0) return

      this.setData({ isUploading: true, uploadProgress: 0 })
      this.triggerEvent('upload-start')

      for (let i = 0; i < pendingIndexes.length; i++) {
        const idx = pendingIndexes[i]
        const file = tempFiles[idx]
        const { cloudPathPrefix, category } = this.properties

        try {
          // 构建云存储路径
          const timestamp = Date.now()
          const cloudPath = `${cloudPathPrefix}/${category}/${timestamp}_${file.name}`

          // 上传到云存储
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: file.path
          })

          const fileID = uploadRes.fileID

          // 调用云函数记录元数据
          const cloudRes = await wx.cloud.callFunction({
            name: 'uploadImage',
            data: {
              fileID: fileID,
              fileName: file.name,
              fileType: 'image/jpeg',
              size: file.size,
              category: category
            }
          })

          const result = cloudRes.result as any

          if (result.success) {
            // 记录已上传的 fileID
            const newUploaded = [...uploadedFileIDs]
            newUploaded[idx] = fileID
            this.setData({
              uploadedFileIDs: newUploaded,
              uploadProgress: Math.round(((i + 1) / pendingIndexes.length) * 100)
            })

            // 触发上传成功事件
            this.triggerEvent('upload-success', {
              fileID: fileID,
              imageId: result.data.imageId,
              index: idx
            })
          } else {
            throw new Error(result.errMsg || '保存图片记录失败')
          }
        } catch (err: any) {
          console.error('上传图片失败:', err)
          this.triggerEvent('upload-fail', {
            errMsg: err.message || '上传失败',
            index: idx
          })
          wx.showToast({
            title: `第${idx + 1}张上传失败`,
            icon: 'none'
          })
        }
      }

      this.setData({ isUploading: false })
    },

    /**
     * 获取所有已上传的 fileID
     */
    getUploadedFileIDs(): string[] {
      return this.data.uploadedFileIDs.filter(Boolean)
    },

    /**
     * 清空已选图片
     */
    clearImages() {
      this.setData({
        tempFiles: [],
        uploadedFileIDs: [],
        uploadProgress: 0
      })
    }
  }
})
