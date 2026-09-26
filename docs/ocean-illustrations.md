# 深海单词寻宝：识词插画制作说明

223 张独立词卡，列表由 `src/game/ocean/words.json` 管理。消费路径：`public/assets/words/sheet-<nn>.webp`。图片加载完成之前不允许作答，失败时提供重载或放弃，不扣除答题能量。

## 统一视觉规范

- 5 岁以上儿童识词，温暖、清晰、手绘绘本风，圆润轮廓，轻柔的水粉质感。
- 背景统一暖白色，单个主体居中，占画面约 70%，完整轮廓，留出边距。
- 颜色还原常见实物，轻微落影。动物使用完整身体并保留易识别的物种特征。
- 无文字、字母、标签、水印、边框、第二个物体或无关装饰。
- 不给水果和日用品添加脸，不添加海洋装饰，不将英文写进图像。
- 生成后逐图检查：单词与主体对应、物体数量、辨识度、裁切、统一风格。缩小到 100 像素再次检查。

## 共用生成提示词

Use case: illustration-story
Asset type: a single picture card for a children's English vocabulary game, ages 5 and up.
Subject: {specific subject description}.
Style: warm hand-painted children's picture-book illustration; rounded, clear silhouettes; gentle gouache texture; consistent soft lighting from the upper left, subtle grounded shadow.
Composition: one subject only, fully visible, centered, roughly 70 percent of the square canvas with generous margins. Plain warm ivory background (#faf7ef).
Colors: recognizable natural colors, warm restrained palette, soft but clear contrast. Keep distinguishing features of the real object or animal.
Constraints: no text, no letters, no labels, no watermark, no border, no extra objects, no decorative scenery. Inanimate objects have no faces. No ocean props. Make the subject unmistakable at thumbnail size.

## 生成方式

使用用户指定的 OpenAI 兼容接口，通过本机 `aixj-image-generation` skill 包装已安装的 imagegen CLI，并发送 `x-openai-actor-authorization: local-image-extension` 请求头。后续请求模型固定为 `gpt-image-2.5`，串行调用，调用开始之间至少间隔 90 秒；429/502 等暂时性错误采用有上限的退避。成功的图片不会重复生成。

最早的 10 张样图使用请求模型 `gpt-image-2`；其余继续使用用户选定的 `gpt-image-2.5`，每张实际请求模型以生成清单为准。密钥仅在仓库外的私有文件保存，不复制进本文档、前端、资源清单或 Git。

原图：`output/imagegen/`（本地保留，已忽略提交）；交付词卡：`public/assets/words/`。WebP 保留原图完整构图，缩小至最长边 384 像素，质量 86。

提示词：`docs/ocean-image-prompts.jsonl`。预览总表：`output/imagegen/word-cards-preview.jpg`。
