import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [result] = await db.query("SELECT COUNT(*) as total FROM pendaftaran");
    const totalPendaftar = result[0].total;
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        totalPendaftar: parseInt(totalPendaftar) 
      } 
    });
  } catch (error) {
    console.error("Error fetching total pendaftar:", error);
    return NextResponse.json({
      success: false, 
      message: "Gagal mengambil data pendaftar"
    });
  }
}
