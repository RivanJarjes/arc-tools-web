import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Get the public directory path
    const publicDir = path.join(process.cwd(), 'public');
    
    // Read all files in the public directory
    const files = fs.readdirSync(publicDir);
    
    // Filter for .asm files
    const asmFiles = files.filter(file => file.endsWith('.asm'));
    
    // Sort files alphabetically
    asmFiles.sort();
    
    return NextResponse.json(asmFiles);
  } catch (error) {
    console.error('Error reading .asm files:', error);
    return NextResponse.json({ error: 'Failed to read .asm files' }, { status: 500 });
  }
} 
