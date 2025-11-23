import { db } from "@/lib/db";
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    
    const offset = (page - 1) * limit;
    
    // Build the base query
    let query = 'SELECT * FROM pendaftaran';
    let countQuery = 'SELECT COUNT(*) as total FROM pendaftaran';
    const params = [];
    const whereClauses = [];

    // Add search conditions if search term exists
    if (search) {
      whereClauses.push('(nama LIKE ? OR email LIKE ? OR nomor LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Add WHERE clause if there are conditions
    if (whereClauses.length > 0) {
      const whereClause = ' WHERE ' + whereClauses.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    // Add sorting and pagination
    query += ' ORDER BY tanggal_daftar DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Execute both queries in parallel
    const [rows, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(0, -2)) // Exclude limit and offset for count
    ]);

    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: rows,
      total: total,
      page: page,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error fetching pendaftaran:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server', error: error.message },
      { status: 500 }
    );
  }
}
