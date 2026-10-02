import { handlers } from '@/lib/auth';
import { withApiRoute } from '@/lib/with-api-route';

export const GET = withApiRoute('/api/auth/[...nextauth]', handlers.GET);
export const POST = withApiRoute('/api/auth/[...nextauth]', handlers.POST);
