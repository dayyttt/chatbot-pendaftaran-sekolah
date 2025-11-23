import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Fetching pendaftaran terbaru...');
    
    // Ambil 5 pendaftaran terbaru
    const [results] = await db.query(`
      SELECT 
        id,
        nama,
        email,
        nomor,
        created_at as tanggal_daftar
      FROM pendaftaran
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (!results || results.length === 0) {
      return NextResponse.json(
        { success: true, data: [] },
        { status: 200 }
      );
    }
    
    // Format hasil sesuai yang dibutuhkan oleh komponen notifikasi
    const formattedResults = results.map(item => ({
      id: item.id,
      nama_lengkap: item.nama || 'Nama tidak tersedia',
      sekolah_asal: 'Informasi sekolah', // Default value since sekolah_asal doesn't exist
      jurusan_dipilih: 'Informasi jurusan', // Default value since jurusan_dipilih doesn't exist
      tanggal_daftar: item.tanggal_daftar,
      kontak: item.email || item.nomor || 'Tidak ada kontak'
    }));
    
    return NextResponse.json({ 
      success: true, 
      data: formattedResults
    });
    
  } catch (error) {
    console.error("Error in /api/pendaftaran/terbaru:", error);
    return NextResponse.json({
      success: false, 
      message: 'Terjadi kesalahan saat mengambil data pendaftaran terbaru',
      error: error.message
    }, { status: 500 });
  }
}
