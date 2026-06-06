# FitPlan 云数据库 Schema

## 集合列表（9 个）

### 1. users — 用户信息
| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 微信 OpenID（自动） |
| `nickName` | string | 微信昵称 |
| `avatarUrl` | string | 微信头像 URL |
| `points` | number | 当前积分余额 |
| `totalPoints` | number | 累计获得积分 |
| `trainingCount` | number | 累计训练次数 |
| `totalDuration` | number | 累计训练时长（秒） |
| `streakDays` | number | 连续打卡天数 |
| `maxStreakDays` | number | 最长连续打卡天数 |
| `createdAt` | Date | 注册时间 |
| `lastLoginAt` | Date | 最后登录时间 |

### 2. training_records — 训练记录
| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 用户 OpenID |
| `date` | string | 训练日期 YYYY-MM-DD |
| `trainingType` | string | 力量训练/有氧/HIIT/拉伸/自定义 |
| `exercises` | array | 动作列表 |
| `exercises[].name` | string | 动作名称 |
| `exercises[].bodyPart` | string | 目标肌群 |
| `exercises[].sets` | array | 组数列表 |
| `exercises[].sets[].weight` | number | 重量(kg) |
| `exercises[].sets[].reps` | number | 次数 |
| `exercises[].sets[].rest` | number | 组间休息(秒) |
| `duration` | number | 训练总时长(秒) |
| `notes` | string | 备注 |
| `createdAt` | Date | 创建时间 |
| `updatedAt` | Date | 更新时间 |

### 3. diet_records — 饮食记录
| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 用户 OpenID |
| `date` | string | 记录日期 YYYY-MM-DD |
| `mealType` | string | 早/中/晚/加餐 |
| `foods` | array | 食物列表 |
| `foods[].name` | string | 食物名称 |
| `foods[].weight` | number | 分量(g) |
| `foods[].calories` | number | 热量(kcal) |
| `foods[].protein` | number | 蛋白质(g) |
| `foods[].carbs` | number | 碳水(g) |
| `foods[].fat` | number | 脂肪(g) |
| `totalCalories` | number | 总热量(kcal) |
| `notes` | string | 备注 |
| `createdAt` | Date | 创建时间 |
| `updatedAt` | Date | 更新时间 |

### 4. exercises — 动作库
| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 动作名称 |
| `bodyPart` | string | 目标肌群：胸/背/腿/肩/臂/核心 |
| `description` | string | 动作描述 |
| `videoUrl` | string | 教学视频 URL |
| `imageUrl` | string | 示意图片 URL |
| `isCustom` | boolean | 是否为用户自定义 |
| `_openid` | string | 自定义动作归属用户 |
| `createdAt` | Date | 创建时间 |

### 5. foods — 食物库
| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 食物名称 |
| `calories` | number | 每100g热量(kcal) |
| `protein` | number | 每100g蛋白质(g) |
| `carbs` | number | 每100g碳水(g) |
| `fat` | number | 每100g脂肪(g) |
| `unit` | string | 单位（g/ml/个） |
| `category` | string | 分类：主食/肉类/蔬菜/水果/乳制品/零食/饮品 |
| `isCustom` | boolean | 是否为用户自定义 |
| `_openid` | string | 自定义食物归属用户 |
| `createdAt` | Date | 创建时间 |

### 6. training_plans — 训练计划
| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 用户 OpenID |
| `type` | string | AI/自定义 |
| `name` | string | 计划名称 |
| `params` | object | 生成参数 |
| `params.targetMuscles` | array | 目标肌群 |
| `params.days` | number | 训练天数 |
| `params.level` | string | 新手/进阶/高阶 |
| `params.equipment` | array | 可用器械 |
| `params.injury` | string | 伤病史 |
| `schedule` | array | 每日安排 |
| `schedule[].day` | number | 第N天 |
| `schedule[].exercises` | array | 动作列表 |
| `status` | string | active/completed/archived |
| `pointsCost` | number | 消耗积分 |
| `createdAt` | Date | 创建时间 |
| `updatedAt` | Date | 更新时间 |

### 7. diet_plans — 饮食计划
| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 用户 OpenID |
| `type` | string | AI/自定义 |
| `name` | string | 计划名称 |
| `params` | object | 生成参数 |
| `params.goal` | string | 增肌/减脂/维持 |
| `params.dailyCalories` | number | 每日目标热量 |
| `params.preference` | string | 正常/高蛋白/低碳/生酮 |
| `params.allergies` | array | 过敏食材 |
| `params.days` | number | 计划天数 |
| `schedule` | array | 每日菜单 |
| `schedule[].day` | number | 第N天 |
| `schedule[].meals` | array | 餐次列表 |
| `status` | string | active/completed/archived |
| `pointsCost` | number | 消耗积分 |
| `createdAt` | Date | 创建时间 |
| `updatedAt` | Date | 更新时间 |

### 8. goals — 训练目标
| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 用户 OpenID |
| `title` | string | 目标标题 |
| `goalType` | string | 增肌/减脂/塑形/其他 |
| `targetWeight` | number | 目标体重(kg) |
| `targetBodyFat` | number | 目标体脂率(%) |
| `description` | string | 目标描述 |
| `startDate` | string | 开始日期 |
| `endDate` | string | 结束日期 |
| `progress` | number | 完成进度 0-100 |
| `status` | string | active/completed/failed |
| `createdAt` | Date | 创建时间 |
| `updatedAt` | Date | 更新时间 |

### 9. check_ins — 签到记录
| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 用户 OpenID |
| `date` | string | 签到日期 YYYY-MM-DD |
| `consecutiveDays` | number | 连续签到天数 |
| `pointsEarned` | number | 本次获得积分 |
| `createdAt` | Date | 签到时间 |

---

## 积分规则

| 行为 | 积分 |
|------|------|
| 新用户注册 | +10 |
| 每日签到 | +1 |
| 连续打卡 7 天 | +3（第7天额外） |
| 完成训练目标 | +2 |
| AI 生成训练计划 | -3 |
| AI 生成饮食计划 | -2 |
