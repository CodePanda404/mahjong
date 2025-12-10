import { swaggerUI } from '@aomex/swagger-ui';
import { generateOpenapi } from '@aomex/openapi';

// 启动服务后，访问 http://localhost:3000/swagger 可以查看文档
export const swagger = swaggerUI({
  openapi: () => {
    return generateOpenapi({
      routers: './src/routers',
      docs: {
        servers: [{ url: 'http://localhost:3000', description: 'Local' }],
      },
    });
  },
});
