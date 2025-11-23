import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [totalPendaftar] = await db.query(
      "SELECT COUNT(*) as total FROM pendaftaran"
    );
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        diterima: 0, // Sementara di-set 0 karena tidak ada data status
        ditolak: 0,  // Sementara di-set 0 karena tidak ada data status
        diproses: parseInt(totalPendaftar[0].total) || 0
      } 
    });
  } catch (error) {
    console.error("Error fetching status pendaftaran:", error);
    return NextResponse.json({
      success: false, 
      message: "Gagal mengambil data status pendaftaran"
    }, { status: 500 });
  }
}
