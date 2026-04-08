# 修复 images 字段丢失

## Progress

- Changed `images: allImages.length > 0 ? allImages : undefined` → `images: allImages` in `src/ask.ts`
- Now always returns array (empty or populated), never undefined
