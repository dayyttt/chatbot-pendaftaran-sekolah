import { useState, useEffect } from 'react';
import axios from 'axios';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

const API_URL = '/api/pendaftaran/terbaru'; // Endpoint untuk mengambil pendaftaran terbaru

export default function Header({ title }) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/login');
  };

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [pendaftaranTerbaru, setPendaftaranTerbaru] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Ambil data pendaftaran terbaru
  useEffect(() => {
    const fetchPendaftaranTerbaru = async () => {
      try {
        const response = await axios.get(API_URL);
        setPendaftaranTerbaru(response.data);
      } catch (error) {
        console.error('Gagal mengambil data pendaftaran terbaru:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPendaftaranTerbaru();
    const interval = setInterval(fetchPendaftaranTerbaru, 30000); // Update setiap 30 detik

    return () => clearInterval(interval);
  }, []);

  // Format waktu menjadi "X menit/jam/hari yang lalu"
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Baru saja';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit yang lalu`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam yang lalu`;
    return `${Math.floor(diffInSeconds / 86400)} hari yang lalu`;
  };

  // Hitung jumlah pendaftaran yang belum dilihat
  const unreadCount = pendaftaranTerbaru.length;

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <h1 className="text-xl font-bold text-white">{title}</h1>
          
          {/* Notification Bell */}
          <div className="relative ml-4">
            <button 
              type="button"
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="p-1 rounded-full text-blue-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-800 focus:ring-white"
            >
              <span className="sr-only">Notifikasi</span>
              <div className="relative">
                <svg 
                  className="h-7 w-7" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </button>

            {/* Notification Panel */}
            {isNotificationOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1 bg-white rounded-md shadow-xs">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-gray-900">Pendaftaran Baru</p>
                      {unreadCount > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {unreadCount} baru
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {isLoading ? (
                      <div className="px-4 py-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500">Memuat...</p>
                      </div>
                    ) : pendaftaranTerbaru.length > 0 ? (
                      pendaftaranTerbaru.map((pendaftaran) => (
                        <a
                          key={pendaftaran.id}
                          href={`/pendaftaran/${pendaftaran.id}`}
                          className="block px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-100 transition-colors duration-150"
                        >
                          <div className="flex items-start">
                            <div className="flex-shrink-0 pt-0.5">
                              <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            </div>
                            <div className="ml-3 flex-1">
                              <div className="flex justify-between">
                                <p className="font-medium text-gray-900">{pendaftaran.nama_lengkap}</p>
                                <span className="text-xs text-gray-400">
                                  {formatTimeAgo(pendaftaran.tanggal_daftar)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-0.5">{pendaftaran.sekolah_asal}</p>
                              <p className="text-xs text-blue-600 font-medium mt-1">
                                {pendaftaran.jurusan_dipilih}
                              </p>
                            </div>
                          </div>
                        </a>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .528-.21 1.055-.591 1.435L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-500">Tidak ada notifikasi baru</p>
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-2 bg-gray-50 text-center border-t border-gray-200">
                    <a
                      href="/pendaftaran"
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      Lihat Semua Pendaftaran
                      <svg className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}