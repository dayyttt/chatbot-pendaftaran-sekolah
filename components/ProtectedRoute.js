import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

function Dashboard() {
  return (
    <ProtectedRoute>
      {/* Your dashboard content */}
      <div className="p-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {/* Your dashboard components */}
      </div>
    </ProtectedRoute>
  );
}

export default function ProtectedRoute({ children, requiredRole }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(router.asPath)}`);
    } else if (requiredRole && session.user.role !== requiredRole) {
      router.push('/unauthorized');
    }
  }, [session, status, router, requiredRole]);

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (requiredRole && session.user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Anda tidak memiliki akses ke halaman ini</p>
      </div>
    );
  }

  return children;
}