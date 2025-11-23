import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

export default function Messages() {
  const [activeTab, setActiveTab] = useState('all');
  
  const messages = [
    { id: 1, from: 'John Doe', message: 'Halo, bagaimana cara mendaftar?', unread: true, date: '10:30' },
    { id: 2, from: 'Jane Smith', message: 'Terima kasih informasinya!', unread: false, date: '09:15' },
    { id: 3, from: 'Budi Santoso', message: 'Apakah masih ada kuota pendaftaran?', unread: true, date: 'Kemarin' },
    { id: 4, from: 'Siti Rahayu', message: 'Saya sudah mengisi formulir', unread: false, date: 'Kemarin' },
    { id: 5, from: 'Ahmad Fauzi', message: 'Berapa biaya pendaftarannya?', unread: false, date: 'Senin' },
  ];

  const filteredMessages = activeTab === 'all' 
    ? messages 
    : messages.filter(msg => msg.unread);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <Header title="Pesan Masuk" />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`py-4 px-6 text-sm font-medium ${
                    activeTab === 'all'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Semua Pesan
                </button>
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`py-4 px-6 text-sm font-medium ${
                    activeTab === 'unread'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Belum Dibaca
                </button>
              </nav>
            </div>
            
            {/* Messages List */}
            <div className="divide-y divide-gray-200">
              {filteredMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${msg.unread ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          {msg.from.charAt(0)}
                        </div>
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${msg.unread ? 'text-gray-900' : 'text-gray-600'}`}>
                          {msg.from}
                        </p>
                        <p className="text-sm text-gray-500 truncate max-w-md">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {msg.date}
                      {msg.unread && (
                        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
