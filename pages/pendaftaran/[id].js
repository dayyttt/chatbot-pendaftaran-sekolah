// pages/pendaftaran/[id].js
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import Head from 'next/head';
import Link from 'next/link';

const DetailPendaftaran = () => {
  const router = useRouter();
  const { id } = router.query;

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Format tanggal
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const options = { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      diterima: 'bg-green-100 text-green-800',
      ditolak: 'bg-red-100 text-red-800',
    }
  
    const statusLabels = {
      pending: 'Menunggu',
      diterima: 'Diterima',
      ditolak: 'Ditolak',
    }
  
    return (
      <span
        className={`
          px-3 py-1 text-xs font-semibold rounded-full
          ${statusClasses[status] || 'bg-gray-100 text-gray-800'}
        `}
      >
        {statusLabels[status] || status}
      </span>
    )
  }
  

  // Fetch detail pendaftaran
  const fetchDetail = async () => {
    console.log('Fetching detail for ID:', id);
  
    if (!id || id === '[id]' || isNaN(Number(id))) {
      console.error('ID tidak valid:', id);
      toast.error('ID pendaftaran tidak valid');
      router.push('/pendaftaran');
      return;
    }
  
    const numericId = Number(id);
  
    try {
      setIsLoading(true);
  
      // 🔥 PENTING: pakai ?id=, bukan path /:id
      const res = await axios.get('/api/pendaftaran', {
        params: { id: numericId },
      });
  
      console.log('Response detail:', res.data);
  
      const result = res.data;
  
      if (!result.success || !result.data) {
        throw new Error(result.message || 'Data tidak ditemukan');
      }
  
      setData(result.data);
    } catch (error) {
      console.error('Error fetch detail:', error);
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Gagal memuat data pendaftaran';
      toast.error(msg);
      router.push('/pendaftaran');
    } finally {
      setIsLoading(false);
    }
  };
  

  useEffect(() => {
    if (id) {
      fetchDetail();
    }
  }, [id]);

  // --- UPDATE STATUS ---
  const updateStatus = async (status) => {
    if (!data?.id) return;

    const ok = window.confirm(
      `Apakah Anda yakin ingin mengubah status menjadi ${status}?`
    );
    if (!ok) return;

    try {
      setIsUpdating(true);

      const { data: result } = await axios.put('/api/pendaftaran', {
        id: data.id,
        status,
      });

      if (!result.success) {
        throw new Error(result.message || 'Gagal mengupdate status');
      }

      toast.success(`Status berhasil diubah menjadi ${status}`);
      fetchDetail(); // refresh detail
    } catch (error) {
      console.error('Error updating status:', error);
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Gagal mengupdate status';
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // --- LOADING / TIDAK ADA DATA ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
          <p className="mt-2 text-gray-600 text-sm">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-700">
            Data tidak ditemukan
          </h2>
          <Link
            href="/pendaftaran"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Kembali ke Daftar Pendaftaran
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Detail Pendaftaran - {data.nama || 'Tidak Diketahui'}</title>
      </Head>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {/* Header */}
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Detail Pendaftaran
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Informasi lengkap pendaftar
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  ID Pendaftaran: #{data.id}
                </p>
              </div>
              <div className="flex space-x-2">
                <Link
                  href="/pendaftaran"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Kembali
                </Link>
                <div className="relative inline-block text-left">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() =>
                      document
                        .getElementById('status-menu')
                        .classList.toggle('hidden')
                    }
                  >
                    Ubah Status
                  </button>
                  <div
                    id="status-menu"
                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none hidden z-10"
                  >
                    <div className="py-1">
                      <button
                        onClick={() => updateStatus('diterima')}
                        className="block w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-100"
                        disabled={isUpdating}
                      >
                        {isUpdating ? 'Memproses...' : 'Terima'}
                      </button>
                      <button
                        onClick={() => updateStatus('ditolak')}
                        className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                        disabled={isUpdating}
                      >
                        {isUpdating ? 'Memproses...' : 'Tolak'}
                      </button>
                      <button
                        onClick={() => updateStatus('pending')}
                        className="block w-full text-left px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-100"
                        disabled={isUpdating}
                      >
                        {isUpdating ? 'Memproses...' : 'Tunda'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Informasi Pribadi */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    Informasi Pribadi
                  </h4>
                  <dl className="space-y-3">
                    <InfoRow label="Nama Lengkap" value={data.nama} />
                    <InfoRow
                      label="Tempat, Tanggal Lahir"
                      value={
                        data.tempat_lahir
                          ? `${data.tempat_lahir}, ${formatDate(
                              data.tanggal_lahir
                            )}`
                          : '-'
                      }
                    />
                    <InfoRow
                      label="Jenis Kelamin"
                      value={
                        data.jenis_kelamin === 'L'
                          ? 'Laki-laki'
                          : data.jenis_kelamin === 'P'
                          ? 'Perempuan'
                          : '-'
                      }
                    />
                    <InfoRow label="Agama" value={data.agama} />
                    <InfoRow label="Alamat" value={data.alamat} />
                  </dl>
                </div>

                {/* Kontak & Sekolah Asal */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    Kontak & Sekolah Asal
                  </h4>
                  <dl className="space-y-3">
                    <InfoRow label="Nomor Telepon" value={data.nomor} />
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Email
                      </dt>
                      <dd className="mt-1 text-sm text-blue-600 break-all">
                        {data.email ? (
                          <a
                            href={`mailto:${data.email}`}
                            className="hover:underline"
                          >
                            {data.email}
                          </a>
                        ) : (
                          '-'
                        )}
                      </dd>
                    </div>
                    <InfoRow
                      label="Asal Sekolah"
                      value={data.asal_sekolah}
                    />
                    <InfoRow
                      label="Alamat Sekolah"
                      value={data.alamat_sekolah_asal}
                    />
                    <InfoRow
                      label="Tahun Lulus"
                      value={data.tahun_lulus}
                    />
                    <InfoRow
                      label="Nilai Raport"
                      value={data.nilai_raport}
                    />
                  </dl>
                </div>

                {/* Informasi Pendaftaran */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    Informasi Pendaftaran
                  </h4>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Status
                      </dt>
                      <dd className="mt-1">
                        {getStatusBadge(
                          data.status_pendaftaran || 'pending'
                        )}
                      </dd>
                    </div>
                    <InfoRow
                      label="Tanggal Daftar"
                      value={formatDate(data.tanggal_daftar || data.created_at)}
                    />
                    <InfoRow
                      label="Pilihan Jurusan 1"
                      value={data.pilihan_jurusan1}
                    />
                    <InfoRow
                      label="Pilihan Jurusan 2"
                      value={data.pilihan_jurusan2 || '-'}
                    />
                    <InfoRow
                      label="Catatan"
                      value={data.catatan || 'Tidak ada catatan'}
                    />
                  </dl>
                </div>
              </div>

              {/* Dokumen Pendukung */}
              <div className="mt-8 bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Dokumen Pendukung
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.dokumen_url ? (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <svg
                          className="h-8 w-8 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            Dokumen Pendaftaran
                          </p>
                          <a
                            href={data.dokumen_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Lihat Dokumen
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Tidak ada dokumen yang diunggah
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div>
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900">{value || '-'}</dd>
  </div>
);

export default DetailPendaftaran;
