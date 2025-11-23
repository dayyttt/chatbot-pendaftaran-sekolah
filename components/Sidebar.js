import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Sidebar() {
  const router = useRouter();
  
  const menuItems = [
    { name: 'Dashboard', icon: '📊', path: '/dashboard' },
    { name: 'Pendaftaran', icon: '📝', path: '/pendaftaran' },
    { name: 'Pesan', icon: '💬', path: '/messages' },
    { name: 'Data Siswa', icon: '👥', path: '/students' },
    { name: 'Pengaturan', icon: '⚙️', path: '/settings' },
    { name: 'Keluar', icon: '🚪', path: '/logout' },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-gray-800 text-white p-4">
      <div className="flex items-center space-x-2 p-4 mb-8">
        <div className="text-2xl">🤖</div>
        <h1 className="text-xl font-bold">Admin Panel</h1>
      </div>
      <nav>
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link 
                href={item.path}
                className={`flex items-center p-3 rounded-lg transition-colors ${
                  router.pathname === item.path 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
