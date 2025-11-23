import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

export default function Settings() {
  const [settings, setSettings] = useState({
    schoolName: 'Sekolah Unggulan Terpadu',
    schoolAddress: 'Jl. Pendidikan No. 123, Jakarta',
    adminEmail: 'admin@sekolah.sch.id',
    notificationEmail: 'notifikasi@sekolah.sch.id',
    maxRegistration: 200,
    registrationOpen: true,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simpan pengaturan ke API
    alert('Pengaturan berhasil disimpan!');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <Header title="Pengaturan" />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium leading-6 text-gray-900">Pengaturan Umum</h2>
              <p className="mt-1 text-sm text-gray-500">Atur informasi dasar sekolah dan preferensi sistem.</p>
              
              <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-4">
                    <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700">
                      Nama Sekolah
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="schoolName"
                        id="schoolName"
                        value={settings.schoolName}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-6">
                    <label htmlFor="schoolAddress" className="block text-sm font-medium text-gray-700">
                      Alamat Sekolah
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="schoolAddress"
                        id="schoolAddress"
                        value={settings.schoolAddress}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">
                      Email Admin
                    </label>
                    <div className="mt-1">
                      <input
                        type="email"
                        name="adminEmail"
                        id="adminEmail"
                        value={settings.adminEmail}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="notificationEmail" className="block text-sm font-medium text-gray-700">
                      Email Notifikasi
                    </label>
                    <div className="mt-1">
                      <input
                        type="email"
                        name="notificationEmail"
                        id="notificationEmail"
                        value={settings.notificationEmail}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="maxRegistration" className="block text-sm font-medium text-gray-700">
                      Kuota Maksimal Pendaftaran
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        name="maxRegistration"
                        id="maxRegistration"
                        value={settings.maxRegistration}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-6">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="registrationOpen"
                          name="registrationOpen"
                          type="checkbox"
                          checked={settings.registrationOpen}
                          onChange={handleInputChange}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="registrationOpen" className="font-medium text-gray-700">
                          Buka Pendaftaran
                        </label>
                        <p className="text-gray-500">Aktifkan untuk membuka pendaftaran siswa baru</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-5 border-t border-gray-200">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
