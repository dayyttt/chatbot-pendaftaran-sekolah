import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    console.log('Params received:', params);

    let { id } = params;

    // Kalau somehow id datang sebagai array (jarang, tapi jaga-jaga)
    if (Array.isArray(id)) {
      id = id[0];
    }

    console.log('Request URL:', req.url);
    console.log('ID from params:', id);

    const numericId = parseInt(id, 10);

    // Validasi ID
    if (!numericId || Number.isNaN(numericId) || numericId <= 0) {
      console.error('Invalid ID format:', id);
      return NextResponse.json(
        {
          success: false,
          message: 'Format ID pendaftaran tidak valid',
          data: null,
        },
        { status: 400 },
      );
    }

    console.log('Executing query with ID:', numericId);

    const [rows] = await db.query(
      'SELECT * FROM pendaftaran WHERE id = ?',
      [numericId],
    );

    console.log('Query result:', rows);

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Data pendaftaran tidak ditemukan',
          data: null,
        },
        { status: 404 },
      );
    }

    const registrationData = rows[0];

    return NextResponse.json({
      success: true,
      message: 'Data berhasil diambil',
      data: registrationData,
    });
  } catch (error) {
    console.error('Error fetching registration detail:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Terjadi kesalahan saat mengambil data pendaftaran',
        error: error.message,
        data: null,
      },
      { status: 500 },
    );
  }
}
