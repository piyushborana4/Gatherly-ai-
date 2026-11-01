import serverless from 'serverless-http';
import { createApp } from '../../src/server/app';

let cachedHandler: ReturnType<typeof serverless> | null = null;

async function getServerlessHandler(): Promise<ReturnType<typeof serverless>> {
  if (!cachedHandler) {
    const app = await createApp({ enableViteMiddleware: false });
    cachedHandler = serverless(app);
  }
  return cachedHandler;
}

export const handler = async (event: object, context: object): Promise<unknown> => {
  const fn = await getServerlessHandler();
  return await fn(event, context);
};
