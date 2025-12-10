// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Hapus data yang sudah ada
  await prisma.user.deleteMany({});

  // Data user yang akan dibuat
  const users = [
    {
      name: 'Admin Sekolah',
      email: 'admin@sekolah.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'ADMIN'
    },
    {
      name: 'Guru Matematika',
      email: 'guru@sekolah.com',
      password: await bcrypt.hash('guru123', 10),
      role: 'TEACHER'
    },
    {
      name: 'Siswa Baru',
      email: 'siswa@sekolah.com',
      password: await bcrypt.hash('siswa123', 10),
      role: 'STUDENT'
    }
  ];

  // Buat user baru
  for (const user of users) {
    await prisma.user.create({
      data: user
    });
    console.log(`User ${user.email} berhasil dibuat`);
  }
}

main()
  .catch((e) => {
    console.error('Gagal menjalankan seeder:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });