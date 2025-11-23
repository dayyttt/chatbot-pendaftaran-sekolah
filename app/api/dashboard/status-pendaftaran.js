import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Karena tabel pendaftaran tidak memiliki kolom status, kita akan menganggap semua pendaftar baru
    // sebagai 'diproses' untuk keperluan dashboard
    const [totalPendaftar] = await db.query(
      "SELECT COUNT(*) as total FROM pendaftaran"
    );
    
    // Jika nanti ada tabel yang menyimpan status pendaftaran, query bisa diupdate
    // Contoh jika ada tabel 'status_pendaftaran' dengan kolom 'status'
    // const [diterima] = await db.query("SELECT COUNT(*) as total FROM status_pendaftaran WHERE status = 'diterima'");
    // const [ditolak] = await db.query("SELECT COUNT(*) as total FROM status_pendaftaran WHERE status = 'ditolak'");
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        diterima: 0, // Sementara di-set 0 karena tidak ada data status
        ditolak: 0   // Sementara di-set 0 karena tidak ada data status
      } 
    });
  } catch (error) {
    console.error("Error fetching status pendaftaran:", error);
    return NextResponse.json({
      success: false, 
      message: "Gagal mengambil data status pendaftaran"
    });
  }
}
