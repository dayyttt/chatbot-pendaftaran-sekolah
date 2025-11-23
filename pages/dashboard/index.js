'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { toast } from 'react-toastify';
import axios from 'axios';
import dynamic from 'next/dynamic';

// QRCode hanya dirender di client
const QRCodeCanvas = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeCanvas),
  { ssr: false }
);

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalPendaftar: 0,
    pendaftarHariIni: 0,
    pendaftarDiterima: 0,
    pendaftarDitolak: 0,
  });

  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  // Panel status collapse
  const [isStatusPanelCollapsed, setIsStatusPanelCollapsed] = useState(false);

  // Load state collapse dari localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedState = localStorage.getItem('statusPanelCollapsed');
    if (savedState !== null) {
      setIsStatusPanelCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Simpan state collapse ke localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      'statusPanelCollapsed',
      JSON.stringify(isStatusPanelCollapsed)
    );
  }, [isStatusPanelCollapsed]);

  const [botStatus, setBotStatus] = useState({
    isConnected: false,
    isConnecting: false,
    lastConnection: null,
    qrCode: null,
    isLoading: true,
    deviceInfo: null,
    statusMessage: 'Menyiapkan koneksi...',
  });

  // --- Helpers umum ---
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      diterima: 'bg-green-100 text-green-800',
      ditolak: 'bg-red-100 text-red-800',
    };

    const statusLabels = {
      pending: 'Menunggu',
      diterima: 'Diterima',
      ditolak: 'Ditolak',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
          statusClasses[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {statusLabels[status] || status}
      </span>
    );
  };

  const getActivityDescription = (item) => {
    const jurusan = item.pilihan_jurusan1 || item.pilihan_jurusan2 || '';
    switch (item.status_pendaftaran) {
      case 'pending':
        return `Pendaftaran baru, menunggu verifikasi${
          jurusan ? ` (jurusan: ${jurusan})` : ''
        }`;
      case 'diterima':
        return `Status diterima${jurusan ? ` di jurusan ${jurusan}` : ''}`;
      case 'ditolak':
        return 'Pendaftaran ditolak oleh admin';
      default:
        return 'Aktivitas pendaftaran';
    }
  };

  // --- WebSocket Connection ---
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost =
      process.env.NODE_ENV === 'development'
        ? 'localhost:3001'
        : window.location.host;

    const wsUrl = `${wsProtocol}//${wsHost}/ws`;

    let socket;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let reconnectTimeout;
    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;

      console.log(`Connecting to WebSocket at ${wsUrl}`);

      // Update state: lagi mencoba koneksi
      setBotStatus((prev) => ({
        ...prev,
        isConnecting: true,
        isConnected: false,
        isLoading: prev.isLoading, // jangan reset ke true kalau sebelumnya sudah false
        statusMessage: 'Menghubungkan ke server bot...',
      }));

      try {
        socket = new WebSocket(wsUrl);
        socket.binaryType = 'arraybuffer';

        socket.onopen = () => {
          console.log('✅ WebSocket Connected');
          reconnectAttempts = 0;

          setBotStatus((prev) => ({
            ...prev,
            isConnected: true,
            isConnecting: false,
            isLoading: false,
            statusMessage: 'Terhubung ke server bot',
          }));

          if (socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({ type: 'ping', timestamp: Date.now() })
            );
          }
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'status') {
              setBotStatus((prev) => ({
                ...prev,
                ...message.data,
                isLoading: false,
              }));
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };

        socket.onclose = (event) => {
          console.log(
            `⚠️ WebSocket Disconnected. Code: ${event.code}, Reason: ${event.reason}`
          );

          if (isUnmounted) return;

          // Selalu tandai disconnected
          setBotStatus((prev) => ({
            ...prev,
            isConnected: false,
          }));

          // Coba reconnect selama belum menyentuh batas
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttempts),
              30000
            );

            setBotStatus((prev) => ({
              ...prev,
              isConnecting: true,
              statusMessage: `Mencoba menyambung ulang (${reconnectAttempts}/${maxReconnectAttempts})...`,
            }));

            reconnectTimeout = setTimeout(connectWebSocket, delay);
          } else {
            setBotStatus((prev) => ({
              ...prev,
              isConnecting: false,
              isLoading: false,
              statusMessage:
                'Gagal menyambung. Silakan cek server bot atau refresh halaman.',
            }));
          }
        };

        socket.onerror = (error) => {
          console.error('WebSocket Error:', error);
          // Jangan close di sini, biarkan onclose yang urus reconnect
        };
      } catch (error) {
        console.error('WebSocket connection error:', error);
        setBotStatus((prev) => ({
          ...prev,
          statusMessage: 'Gagal menyambung ke server',
          isConnected: false,
          isConnecting: false,
          isLoading: false,
        }));
      }
    };

    // Initial connect
    connectWebSocket();

    return () => {
      isUnmounted = true;
      if (socket) {
        try {
          socket.close();
        } catch {}
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // --- Fetch statistik ---
  const fetchStats = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const [resTotal, resHariIni, resStatus] = await Promise.all([
        axios.get(`/api/dashboard/total-pendaftar?_t=${timestamp}`),
        axios.get(`/api/dashboard/pendaftar-hari-ini?_t=${timestamp}`),
        axios.get(`/api/dashboard/status-pendaftaran?_t=${timestamp}`),
      ]);

      setStats({
        totalPendaftar:
          resTotal.data?.data?.total ||
          resTotal.data?.data?.totalPendaftar ||
          0,
        pendaftarHariIni: resHariIni.data?.data?.totalHariIni || 0,
        pendaftarDiterima: resStatus.data?.data?.diterima || 0,
        pendaftarDitolak: resStatus.data?.data?.ditolak || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Gagal memuat data statistik');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Fetch aktivitas terbaru ---
  const fetchRecentActivities = useCallback(async () => {
    try {
      setIsLoadingActivities(true);

      const timestamp = Date.now();
      const response = await axios.get('/api/pendaftaran', {
        params: {
          limit: 5,
          sort: 'terbaru',
          _t: timestamp,
        },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Gagal memuat aktivitas');
      }

      const raw = response.data.data;
      const rows = Array.isArray(raw?.[0])
        ? raw[0]
        : Array.isArray(raw)
        ? raw
        : [];

      setRecentActivities(rows);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      toast.error('Gagal memuat aktivitas terbaru');
    } finally {
      setIsLoadingActivities(false);
    }
  }, []);

  // --- Initial load (stats + activities + initial bot status via HTTP) ---
  useEffect(() => {
    fetchStats();
    fetchRecentActivities();

    const fetchInitialBotStatus = async () => {
      try {
        const response = await axios.get('/api/bot/status');
        if (response.data?.data) {
          setBotStatus((prev) => ({
            ...prev,
            ...response.data.data,
            isLoading: false,
          }));
        } else {
          setBotStatus((prev) => ({
            ...prev,
            isLoading: false,
            statusMessage: 'Status bot tidak tersedia',
          }));
        }
      } catch (error) {
        console.error('Error fetching initial bot status:', error);
        setBotStatus((prev) => ({
          ...prev,
          isLoading: false,
          statusMessage: 'Gagal memuat status bot',
        }));
      }
    };

    fetchInitialBotStatus();
  }, [fetchStats, fetchRecentActivities]);

  // --- Auto-refresh stats tiap 5 detik ---
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <Header title="Dashboard" />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            {/* Header kecil di atas card */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Ringkasan Pendaftaran
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Statistik realtime & aktivitas pendaftar terbaru.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
                ● Realtime update setiap 5 detik
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Kolom kiri: statistik */}
              <section className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <StatCard
                    title="Total Pendaftar"
                    value={
                      isLoading ? '...' : stats.totalPendaftar.toLocaleString()
                    }
                    icon="👥"
                    color="blue"
                    loading={isLoading}
                  />
                  <StatCard
                    title="Pendaftar Hari Ini"
                    value={
                      isLoading
                        ? '...'
                        : stats.pendaftarHariIni.toLocaleString()
                    }
                    icon="📅"
                    color="green"
                    loading={isLoading}
                  />
                  <StatCard
                    title="Diterima"
                    value={
                      isLoading
                        ? '...'
                        : stats.pendaftarDiterima.toLocaleString()
                    }
                    icon="✅"
                    color="emerald"
                    loading={isLoading}
                  />
                  <StatCard
                    title="Ditolak"
                    value={
                      isLoading ? '-' : stats.pendaftarDitolak.toLocaleString()
                    }
                    icon="❌"
                    color="red"
                    loading={isLoading}
                  />
                </div>

                {/* Ringkasan singkat */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-wrap gap-4 items-center">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                      {isLoading ? '-' : stats.pendaftarHariIni || 0}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Pendaftar baru hari ini
                      </p>
                      <p className="text-xs text-slate-500">
                        Pantau tren harian untuk melihat antusiasme pendaftar.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Kolom kanan: aktivitas terkini */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Aktivitas Terkini
                    </h2>
                    <p className="text-xs text-slate-500">
                      5 pendaftaran terakhir yang masuk ke sistem.
                    </p>
                  </div>
                </div>

                {isLoadingActivities ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-500" />
                  </div>
                ) : recentActivities.length > 0 ? (
                  <div className="overflow-hidden">
                    <ul className="divide-y divide-slate-100">
                      {recentActivities.map((activity) => {
                        const initial = activity.nama
                          ? activity.nama.charAt(0).toUpperCase()
                          : '?';

                        return (
                          <li key={activity.id} className="py-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-sm font-semibold text-blue-600">
                                    {initial}
                                  </span>
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                      {activity.nama || 'Pendaftar Baru'}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                      {activity.asal_sekolah ||
                                        'Asal sekolah tidak tercatat'}
                                    </p>
                                  </div>
                                  <div className="flex-shrink-0">
                                    {getStatusBadge(
                                      activity.status_pendaftaran || 'pending'
                                    )}
                                  </div>
                                </div>

                                <p className="text-xs text-slate-500 mt-1">
                                  {getActivityDescription(activity)}
                                </p>

                                <p className="text-[11px] text-slate-400 mt-1">
                                  {formatDate(
                                    activity.tanggal_daftar ||
                                      activity.created_at
                                  )}
                                </p>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-500">
                      Tidak ada aktivitas terbaru.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>

          {/* Bot Status Card */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <button
              onClick={() =>
                setIsStatusPanelCollapsed(!isStatusPanelCollapsed)
              }
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t-lg"
              aria-expanded={!isStatusPanelCollapsed}
            >
              <h2 className="text-xl font-semibold">Status Bot WhatsApp</h2>
              <svg
                className={`h-5 w-5 text-gray-500 transform transition-transform ${
                  isStatusPanelCollapsed ? '' : 'rotate-180'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <div
              className={`transition-all duration-300 ease-in-out ${
                isStatusPanelCollapsed
                  ? 'max-h-0 opacity-0 overflow-hidden'
                  : 'max-h-[1000px] opacity-100'
              }`}
            >
              <div className="px-6 pb-6 pt-2">
                {botStatus.isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div
                        className={`h-3 w-3 rounded-full mr-2 ${
                          botStatus.isConnected
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }`}
                      ></div>
                      <span className="font-medium">
                        Status:{' '}
                        {botStatus.isConnected
                          ? 'Terhubung'
                          : 'Tidak Terhubung'}
                      </span>
                    </div>

                    {botStatus.lastConnection && (
                      <div className="text-sm text-gray-600">
                        Terakhir terhubung:{' '}
                        {formatDate(botStatus.lastConnection)}
                      </div>
                    )}

                    {!botStatus.isConnected && (
                      <div className="mt-4 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-3 text-center">
                          {botStatus.qrCode
                            ? 'Hubungkan WhatsApp'
                            : 'Status Koneksi'}
                        </h3>

                        {botStatus.qrCode ? (
                          <>
                            <div className="p-4 bg-white rounded-lg border border-gray-200 inline-block mx-auto block">
                              <QRCodeCanvas
                                value={botStatus.qrCode || ''}
                                size={200}
                                level="H"
                                includeMargin={true}
                                className="mx-auto"
                              />
                            </div>
                            <div className="mt-4">
                              <p className="text-sm text-gray-600 mb-3">
                                1. Buka WhatsApp di ponsel Anda
                              </p>
                              <p className="text-sm text-gray-600 mb-4">
                                2. Ketuk{' '}
                                <span className="font-medium">Menu ⋮</span>
                                {' > '}
                                <span className="font-medium">
                                  {' '}
                                  Perangkat Tertaut
                                </span>
                                {' > '}
                                <span className="font-medium">
                                  {' '}
                                  Hubungkan Perangkat
                                </span>
                              </p>

                              <div className="flex items-center justify-center space-x-2 mt-6">
                                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                                <span className="text-sm text-blue-600">
                                  Menunggu pemindaian...
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-6">
                            {botStatus.isConnecting ? (
                              <>
                                <div className="relative w-20 h-20 mx-auto mb-4">
                                  <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                                  <div className="absolute inset-2 border-t-4 border-blue-500 rounded-full animate-spin"></div>
                                </div>
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <svg
                                    className="w-8 h-8 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    ></path>
                                  </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-800">
                                  {botStatus.statusMessage ||
                                    'Menyiapkan koneksi...'}
                                </h3>
                              </>
                            ) : (
                              <div className="text-center py-6">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <svg
                                    className="w-8 h-8 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    ></path>
                                  </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-800">
                                  {botStatus.statusMessage ||
                                    'Status tidak diketahui'}
                                </h3>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {botStatus.isConnected && botStatus.deviceInfo && (
                      <div className="mt-4 p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-800 mb-2">
                          Informasi Perangkat
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-gray-600">Platform:</div>
                          <div className="font-medium">
                            {botStatus.deviceInfo.platform ||
                              'Tidak diketahui'}
                          </div>

                          <div className="text-gray-600">Browser:</div>
                          <div className="font-medium">
                            {botStatus.deviceInfo.browser ||
                              'Tidak diketahui'}
                          </div>

                          <div className="text-gray-600">Sistem Operasi:</div>
                          <div className="font-medium">
                            {botStatus.deviceInfo.os || 'Tidak diketahui'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color = 'blue', loading = false }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 ring-blue-50',
    green: 'bg-green-100 text-green-800 ring-green-50',
    emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-50',
    yellow: 'bg-yellow-100 text-yellow-800 ring-yellow-50',
    red: 'bg-red-100 text-red-800 ring-red-50',
    purple: 'bg-purple-100 text-purple-800 ring-purple-50',
    pink: 'bg-pink-100 text-pink-800 ring-pink-50',
    indigo: 'bg-indigo-100 text-indigo-800 ring-indigo-50',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-slate-200 rounded w-2/3" />
          <div className="h-8 bg-slate-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow duration-150">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        <div
          className={`p-3 rounded-full ring-4 ${
            colorClasses[color] || colorClasses.blue
          }`}
        >
          <span className="text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}
