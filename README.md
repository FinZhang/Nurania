This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 部署到 finzhang.space（或会屏蔽 _next 的服务器）

站点放在子路径 `/Nurania`，且部分服务器会忽略以 `_` 开头的目录，导致 `_next` 下资源 404。需先改写再部署。

### 一键部署（推荐）

若 `out` 已初始化为 Git 仓库并配置好远程，在项目根目录执行：

```bash
npm run deploy:push
```

该命令会依次执行：**build** → **deploy:rewrite** → 进入 `out` 执行 **git add .**、**git commit**（带日期）、**git push origin HEAD:web-release**。若无变更会跳过 commit/push。

### 手动部署

```bash
npm run build
npm run deploy:rewrite
```

**然后**把 **`out` 目录下的全部内容**（含 `next` 文件夹、`index.html`、`.nojekyll`、图片等）部署到站点的 `/Nurania` 路径：

- **Git 推送**（out 推 web-release）：在 `out` 目录内执行  
  `git add .`、`git commit -m "deploy"`、`git push origin HEAD:web-release`。
- **FTP/面板上传**：上传整个 `out` 里的内容到服务器对应 `/Nurania` 的目录。

部署完成后访问：https://finzhang.space/Nurania/

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
