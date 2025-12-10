# tutorials-api

使用 aomex 服务端框架，开发前请认真阅读文档 [https://aomex.js.org](aomex.js.org)

## 初始化

- 安装 docker 或者 orbstack
- 执行 pnpm install

## 启动服务

```bash
pnpm start
```

## Swagger 文档

启动服务后访问链接 http://localhost:3000/swagger

如果需要 openapi 配置，则访问链接 http://localhost:3000/swagger/openapi.json

## 在集成环境服务器下部署

```bash
pnpm deploy:integration
```

## 在生产环境服务器下部署

```bash
pnpm deploy:production
```

## 目录结构

```
.
├─ .husky/                          git提交前执行的代码检测脚本
├─ .vscode/                         vscode编辑器基础设置
├─ prisma/                          数据表结构和migrate文件
├─ scripts/                         运维脚本
├─ src/
   ├─ commanders/                   指令控制层
   ├─ configs/                      不同环境下的配置
   ├─ i18n/                         国际化语言包
   ├─ middleware/                   中间件
   ├─ routers/                      路由控制层
   ├─ services/                     业务逻辑层
   ├─ cli.ts                        控制台服务入口
   └─ web.ts                        http服务入口
├─ .env                             开发环境下的mysql配置
├─ .env.integration                 集成环境下的mysql配置
├─ .env.production                  生产环境下的mysql配置
├─ .commitlintrc.yml                commitlint配置
├─ .dockerignore                    打包docker镜像时忽略的文件
├─ .gitignore                       git忽略指定文件和目录
├─ .prettierignore                  prettier忽略指定文件和目录
├─ .prettierrc.yml                  prettier配置
├─ docker-compose-integration.yml   集成环境docker部署配置
├─ docker-compose-production.yml    生产环境docker部署配置
├─ docker-compose.yml               本地开发docker服务配置
├─ Dockerfile.integration           集成环境docker镜像脚本
├─ Dockerfile.production            生产环境docker镜像脚本
├─ package.json                     第三方依赖列表
├─ README.md                        项目介绍
└─ tsconfig.json                    Typescript配置
```
