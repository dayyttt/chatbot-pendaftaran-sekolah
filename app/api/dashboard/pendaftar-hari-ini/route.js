import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [result] = await db.query(
      "SELECT COUNT(*) as totalHariIni FROM pendaftaran WHERE DATE(created_at) = CURDATE()"
    );
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        totalHariIni: parseInt(result[0].totalHariIni) 
      } 
    });
  } catch (error) {
    console.error("Error fetching pendaftar hari ini:", error);
    return NextResponse.json({
      success: false, 
      message: "Gagal mengambil data pendaftar hari ini"
    }, { status: 500 });
  }
}
