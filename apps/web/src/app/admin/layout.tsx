import { getSession } from '@/lib/auth';
import { AdminLayoutClient } from './admin-layout-client';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  const serializedSession = session
    ? {
        userId: session.userId || session.sub || '',
        role: session.role || 'usuario',
        email: session.email || '',
      }
    : null;

  return <AdminLayoutClient session={serializedSession}>{children}</AdminLayoutClient>;
}
