import { NextResponse } from 'next/server';
// import { getBotStatus } from '../../../../bot/index.js';
import { getBotStatus } from '@/bot/index.js';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Dapatkan status terkini dari bot
    const botStatus = getBotStatus();
    
    // Cek apakah ada file QR code yang tersimpan
    const qrCodePath = path.join(process.cwd(), 'public', 'whatsapp-qr.png');
    let qrCodeUrl = null;
    
    if (fs.existsSync(qrCodePath)) {
      qrCodeUrl = '/whatsapp-qr.png';
    }

    return NextResponse.json({
      success: true,
      data: {
        ...botStatus,
        qrCodeUrl
      }
    });
  } catch (error) {
    console.error('Error in bot status API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get bot status' },
      { status: 500 }
    );
  }
}
