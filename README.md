# Token 计价

主流大模型 API Token 价格计算器（人民币 / 美元）。

线上地址（部署后）：https://neuravoxel.github.io/token-calculator/

## 开发

```bash
npm install
npm run dev
```

## 打包

```bash
npm run build
```

产物在 `dist/`。本地预览：

```bash
npm run preview
```

## 部署到 GitHub Pages

本仓库已配置 GitHub Actions（`.github/workflows/deploy-pages.yml`），推送到 `main` 会自动构建并发布。

### 一次性设置

1. 打开仓库 **Settings → Pages**
2. **Source** 选 **GitHub Actions**
3. 把含 workflow / `base` 配置的改动推到 `main`：

```bash
git add -A
git commit -m "Configure GitHub Pages deploy"
git push origin main
```

4. 在 **Actions** 里确认 `Deploy to GitHub Pages` 成功
5. 访问：https://neuravoxel.github.io/token-calculator/

也可在 Actions 页手动点 **Run workflow** 触发部署。

> Vite 的 `base` 已设为 `/token-calculator/`，与仓库名一致。若改仓库名，需同步改 `vite.config.ts` 里的 `base`。

## 测试

```bash
npm test
```
