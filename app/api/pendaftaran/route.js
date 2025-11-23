import { db } from "@/lib/db";
import { NextResponse } from 'next/server';

// GET handler for fetching paginated registrations
 async function GET(req) {
    try {
      const { searchParams } = new URL(req.url);
  
      const idParam = searchParams.get('id');
      const page = Number(searchParams.get('page') || '1');
      const limit = Number(searchParams.get('limit') || '10');
      const search = searchParams.get('search') || '';
  
      // 🔹 MODE DETAIL: kalau ada ?id= -> ambil 1 baris
      if (idParam) {
        const id = Number(idParam);
  
        if (!id || Number.isNaN(id)) {
          return NextResponse.json(
            {
              success: false,
              message: 'Format ID pendaftaran tidak valid',
              data: null,
            },
            { status: 400 }
          );
        }
  
        const [rows] = await db.query(
          'SELECT * FROM pendaftaran WHERE id = ?',
          [id]
        );
  
        if (!rows || rows.length === 0) {
          return NextResponse.json(
            {
              success: false,
              message: 'Data pendaftaran tidak ditemukan',
              data: null,
            },
            { status: 404 }
          );
        }
  
        return NextResponse.json({
          success: true,
          message: 'Data berhasil diambil',
          data: rows[0],
        });
      }
  
      // 🔹 MODE LIST: tanpa ?id= -> pagination
      const offset = (page - 1) * limit;
  
      let baseQuery = 'FROM pendaftaran WHERE 1=1';
      const params = [];
  
      if (search) {
        baseQuery +=
          ' AND (nama LIKE ? OR email LIKE ? OR nomor LIKE ? OR asal_sekolah LIKE ?)';
        const like = `%${search}%`;
        params.push(like, like, like, like);
      }
  
      // total
      const [countRows] = await db.query(
        `SELECT COUNT(*) AS total ${baseQuery}`,
        params
      );
      const total = countRows[0]?.total || 0;
  
      // data
      const [rows] = await db.query(
        `SELECT * ${baseQuery} ORDER BY tanggal_daftar DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
  
      return NextResponse.json({
        success: true,
        data: rows,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error('Error GET /api/pendaftaran:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Terjadi kesalahan server',
          error: error.message,
        },
        { status: 500 }
      );
    }
  }
// POST handler for new registrations
async function POST(req) {
  try {
    const {
      nama,
      email,
      nomor,
      tempat_lahir,
      tanggal_lahir,
      jenis_kelamin,
      agama,
      alamat,
      nama_ortu,
      pekerjaan_ortu,
      no_hp_ortu,
      asal_sekolah,
      alamat_sekolah_asal,
      tahun_lulus,
      nilai_raport,
      pilihan_jurusan1,
      pilihan_jurusan2,
      status_pendaftaran = 'pending',
      catatan = ''
    } = await req.json();

    // Validasi field yang wajib diisi
    const requiredFields = [
      'nama', 'email', 'nomor', 'tempat_lahir', 
      'tanggal_lahir', 'jenis_kelamin', 'agama', 'alamat',
      'nama_ortu', 'pekerjaan_ortu', 'no_hp_ortu', 'asal_sekolah',
      'alamat_sekolah_asal', 'tahun_lulus', 'nilai_raport', 'pilihan_jurusan1'
    ];

    const missingFields = requiredFields.filter(field => !eval(field));
    
    if (missingFields.length > 0) {
      return Response.json(
        { 
          success: false, 
          message: `Mohon lengkapi semua data yang diperlukan. Field yang kurang: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json(
        { success: false, message: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    // Validasi format nomor HP
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(nomor) || !phoneRegex.test(no_hp_ortu)) {
      return Response.json(
        { 
          success: false, 
          message: 'Format nomor HP tidak valid. Pastikan nomor HP terdiri dari 10-15 digit angka' 
        },
        { status: 400 }
      );
    }

    // Validasi format tanggal lahir (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tanggal_lahir) || isNaN(Date.parse(tanggal_lahir))) {
      return Response.json(
        { 
          success: false, 
          message: 'Format tanggal lahir tidak valid. Gunakan format YYYY-MM-DD' 
        },
        { status: 400 }
      );
    }

    // Validasi jenis kelamin
    if (!['L', 'P'].includes(jenis_kelamin)) {
      return Response.json(
        { 
          success: false, 
          message: 'Jenis kelamin harus L (Laki-laki) atau P (Perempuan)' 
        },
        { status: 400 }
      );
    }

    // Validasi tahun lulus
    const currentYear = new Date().getFullYear();
    if (isNaN(tahun_lulus) || tahun_lulus < 2000 || tahun_lulus > currentYear) {
      return Response.json(
        { 
          success: false, 
          message: `Tahun lulus tidak valid. Harus antara 2000-${currentYear}` 
        },
        { status: 400 }
      );
    }

    // Validasi nilai raport
    if (isNaN(nilai_raport) || nilai_raport < 0 || nilai_raport > 100) {
      return Response.json(
        { 
          success: false, 
          message: 'Nilai raport harus antara 0-100' 
        },
        { status: 400 }
      );
    }

    // Cek apakah email sudah terdaftar
    const [existing] = await db.query(
      'SELECT id FROM pendaftaran WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return Response.json(
        { success: false, message: 'Email sudah terdaftar' },
        { status: 400 }
      );
    }

    // Simpan ke database
    await db.query(
      `INSERT INTO pendaftaran (
        nama, email, nomor, tempat_lahir, tanggal_lahir, 
        jenis_kelamin, agama, alamat, nama_ortu, pekerjaan_ortu, 
        no_hp_ortu, asal_sekolah, alamat_sekolah_asal, tahun_lulus, 
        nilai_raport, pilihan_jurusan1, pilihan_jurusan2, 
        status_pendaftaran, catatan, tanggal_daftar
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        nama,
        email,
        nomor,
        tempat_lahir || null,
        tanggal_lahir || null,
        jenis_kelamin || null,
        agama || null,
        alamat || null,
        nama_ortu || null,
        pekerjaan_ortu || null,
        no_hp_ortu || null,
        asal_sekolah || null,
        alamat_sekolah_asal || null,
        tahun_lulus || null,
        nilai_raport || null,
        pilihan_jurusan1 || null,
        pilihan_jurusan2 || null,
        status_pendaftaran,
        catatan || 'Pendaftaran melalui WhatsApp Bot'
      ]
    );

    return Response.json({ 
      success: true,
      message: 'Pendaftaran berhasil disimpan' 
    });

  } catch (error) {
    console.error('Error in POST /api/pendaftaran:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Terjadi kesalahan server',
        error: error.message
      },
      { status: 500 }
    );
  }
}

// PUT handler for updating status
async function PUT(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const { status } = await req.json();

    // Validate status
    if (!['pending', 'diterima', 'ditolak'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Status tidak valid. Gunakan: pending, diterima, atau ditolak' },
        { status: 400 }
      );
    }

    // Update status in database
    const result = await db.query(
      'UPDATE pendaftaran SET status_pendaftaran = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: 'Data pendaftaran tidak ditemukan' },
        { status: 404 }
      );
    }

    // Get updated record
    const [updated] = await db.query(
      'SELECT * FROM pendaftaran WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Status berhasil diperbarui',
      data: updated[0]
    });

  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server', error: error.message },
      { status: 500 }
    );
  }
}

export { GET, POST, PUT };