import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Fetching total pendaftar...');
    const [result] = await db.query("SELECT COUNT(*) as total FROM pendaftaran");
    
    if (!result || !result[0]) {
      return NextResponse.json(
        { success: false, message: 'No data found' },
        { status: 404 }
      );
    }
    
    const totalPendaftar = result[0].total || 0;
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        total: parseInt(totalPendaftar),
        totalPendaftar: parseInt(totalPendaftar) // Tambahkan ini untuk kompatibilitas
      }
    });
  } catch (error) {
    console.error("Error in /api/dashboard/total-pendaftar:", error);
    return NextResponse.json({
      success: false, 
      message: error.message || "Gagal mengambil data pendaftar",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { 
      status: 500 
    });
  }
}
