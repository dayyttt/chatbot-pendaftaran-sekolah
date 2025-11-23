// pages/pendaftaran/index.js
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { toast } from 'react-toastify';
import axios from 'axios';

const ITEMS_PER_PAGE = 10;

export default function Pendaftaran() {
  const router = useRouter();

  const [pendaftar, setPendaftar] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [openMenuId, setOpenMenuId] = useState(null);

  // ---- API: Ambil data pendaftar ----
  const fetchPendaftar = useCallback(async () => {
    try {
      setIsLoading(true);

      const { data } = await axios.get('/api/pendaftaran', {
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: searchTerm || undefined,
        },
      });

      if (!data?.success) {
        throw new Error(data?.message || 'Format respons tidak valid');
      }

      // Respons kamu: data: [ [ {row} ] ] -> kita flatten
      const raw = data.data;
      const rows = Array.isArray(raw?.[0])
        ? raw[0]
        : Array.isArray(raw)
        ? raw
        : [];

      setPendaftar(rows);
      setTotalItems(
        typeof data.total === 'number' && data.total > 0
          ? data.total
          : rows.length
      );
    } catch (error) {
      console.error('Error fetching pendaftar:', error);
      const message =
        error.response?.data?.message || error.message || 'Gagal memuat data';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchPendaftar();
  }, [fetchPendaftar]);

  // ---- Handler ----
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPendaftar();
  };

  const handlePageChange = (page) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleUpdateStatus = async (id, status) => {
    const ok = window.confirm(
      `Apakah Anda yakin ingin mengubah status menjadi ${status}?`
    );
    if (!ok) return;

    try {
      const { data } = await axios.put('/api/pendaftaran', { id, status });

      if (!data?.success) {
        throw new Error(data?.message || 'Gagal mengupdate status');
      }

      toast.success(`Status berhasil diubah menjadi ${status}`);
      setOpenMenuId(null);
      fetchPendaftar();
    } catch (error) {
      console.error('Error updating status:', error);
      const message =
        error.response?.data?.message ||
        error.message ||
        'Gagal mengupdate status';
      toast.error(message);
    }
  };

  // ---- Util tampilan ----
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const options = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
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
        className={`px-3 py-1 text-xs font-semibold rounded-full ${
          statusClasses[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {statusLabels[status] || status}
      </span>
    );
  };

  // ---- Pagination info ----
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <Header title="Data Pendaftaran" />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Search & actions */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="relative flex-1 max-w-md">
                  <form onSubmit={handleSearch}>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <input
                        type="text"
                        className="block w-full pl-10 pr-24 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Cari nama, email, atau nomor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="absolute inset-y-0 right-0 px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cari
                      </button>
                    </div>
                  </form>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Filter
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cetak
                  </button>
                </div>
              </div>
            </div>

            {/* Tabel data */}
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  <p className="mt-2 text-gray-600">Memuat data...</p>
                </div>
              ) : pendaftar.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        No
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nama Lengkap
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kontak
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asal Sekolah
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jurusan
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nilai Raport
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendaftar.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {index + 1 + (currentPage - 1) * ITEMS_PER_PAGE}
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {item.nama}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.tempat_lahir},{' '}
                            {formatDate(item.tanggal_lahir)}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm">
                          <div>{item.nomor}</div>
                          <div className="text-xs text-gray-500">
                            {item.email}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm">
                          <div>{item.asal_sekolah}</div>
                          <div className="text-xs text-gray-500">
                            {item.alamat_sekolah_asal}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium">
                            {item.pilihan_jurusan1}
                          </div>
                          {item.pilihan_jurusan2 && (
                            <div className="text-xs text-gray-500">
                              Alt: {item.pilihan_jurusan2}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.nilai_raport}
                          <div className="text-xs text-gray-500">
                            Lulus: {item.tahun_lulus}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {getStatusBadge(item.status_pendaftaran || 'pending')}
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDateTime(
                              item.tanggal_daftar || item.created_at
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {/* Detail */}
                            <button
                              onClick={() =>
                                router.push(`/pendaftaran/${item.id}`)
                              }
                              className="text-blue-600 hover:text-blue-900"
                              title="Detail"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>

                            {/* Dropdown status */}
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-2 py-1 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(
                                    openMenuId === item.id ? null : item.id
                                  );
                                }}
                              >
                                <svg
                                  className="h-5 w-5 text-gray-400"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                              </button>

                              {openMenuId === item.id && (
                                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                  <div className="py-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateStatus(
                                          item.id,
                                          'diterima'
                                        );
                                      }}
                                      className="block w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-100"
                                    >
                                      Terima
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateStatus(
                                          item.id,
                                          'ditolak'
                                        );
                                      }}
                                      className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                                    >
                                      Tolak
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateStatus(
                                          item.id,
                                          'pending'
                                        );
                                      }}
                                      className="block w-full text-left px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-100"
                                    >
                                      Tunda
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    Tidak ada data
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Tidak ada data pendaftaran yang ditemukan.
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {!isLoading && pendaftar.length > 0 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-700">
                    Menampilkan{' '}
                    <span className="font-medium">{startItem}</span> sampai{' '}
                    <span className="font-medium">{endItem}</span> dari{' '}
                    <span className="font-medium">{totalItems}</span> hasil
                  </p>

                  <nav
                    className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                    aria-label="Pagination"
                  >
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;

                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === totalPages
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
