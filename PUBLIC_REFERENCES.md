# Last Commit 公开参考资料

更新：2026-07-24

这里保留会影响公开产品判断的资料，不公开 Fable 导出标识、本地路径、失败素材和内部生产账。

## 睡眠与作息

### NHLBI：Healthy Sleep Habits

- 机构：National Heart, Lung, and Blood Institute, NIH
- 网址：https://www.nhlbi.nih.gov/health/sleep-deprivation/healthy-sleep-habits
- 在项目里的作用：支持固定起床节律、睡前留出安静时段、减少临睡前明亮屏幕刺激这几个方向。
- 边界：它支持设计方向，不把某个时间表变成适合所有人的医学处方。

### AASM／SRS 成人睡眠时长共识

- 文献：Watson, N. F., et al. (2015). “Recommended Amount of Sleep for a Healthy Adult: A Joint Consensus Statement of the American Academy of Sleep Medicine and Sleep Research Society.”
- DOI：https://doi.org/10.5664/jcsm.4758
- 在项目里的作用：八小时只是可调整的界面起点；每个人仍可以按 15 分钟改变目标。

### 4–2–6 呼吸的证据边界

页面中的三轮 4–2–6 是可选的节奏提示。项目没有把这组精确时长写成临床标准，也不把它用于治疗承诺。

## Web 实现

### MDN：Window.localStorage

- 网址：https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- 在项目里的作用：解释为什么任务与睡眠记录只留在当前浏览器，也解释为什么换浏览器或清理站点数据会失去本地记录。

### RFC 5545：iCalendar

- 发布：IETF，2009-09
- 网址：https://www.rfc-editor.org/rfc/rfc5545
- 在项目里的作用：交接区导出的 `.ics` 使用 `VCALENDAR`／`VEVENT` 结构。

## 版权与开源

### WIPO：Berne Convention summary

- 网址：https://www.wipo.int/en/web/treaties/ip/berne/summary_berne
- 在项目里的作用：版权保护原则上不以登记、放置水印等手续为成立前提。

### U.S. Copyright Office：Copyright Notice

- 网址：https://www.copyright.gov/circs/circ03.pdf
- 在项目里的作用：公开署名采用连续的“©、首次发布年份、权利人名称”结构，方便读者识别来源与授权入口。

### Open Source Initiative：MIT License

- 网址：https://opensource.org/license/mit
- SPDX 标识：`MIT`
- 在项目里的作用：页面代码采用 MIT License；角色与视觉资产另行说明。

### OpenAI：Terms of Use

- 网址：https://openai.com/policies/terms-of-use/
- 在项目里的作用：说明在使用者与 OpenAI 之间，使用者在法律允许范围内拥有输出；同时提示生成结果可能不唯一，也可能与其他使用者的输出相似。

### 中国法院关于 AI 生成图片的两类判断

- 北京互联网法院首例 AI 生成图片案判决介绍：https://www.shantou.gov.cn/stszcwyh/zcal/content/post_2290248.html
- 司法部智慧普法平台“AI 文生图不构成作品案”：https://legalinfo.moj.gov.cn/zxxfyasf/202504/t20250423_517956.html
- 在项目里的作用：前一案例重视提示词、参数、选择与调整体现的个性化表达；后一案例说明简单提示词、缺少足够独创性智力投入时，生成图可能不构成著作权法意义上的作品。因此本项目记录生成与人工处理过程，但不把“AI 生成”直接等同于“当然享有全球排他版权”。

所有外部资料的版权归原作者与机构。这里仅保存链接、书目信息与本项目自己的转述。
