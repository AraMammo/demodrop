import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status'); // Optional filter
    const search = searchParams.get('search'); // Optional search

    let query = 'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC';
    const params: any[] = [userId];

    if (status && status !== 'all') {
      query = 'SELECT * FROM projects WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC';
      params.push(status);
    }

    if (search) {
      query = 'SELECT * FROM projects WHERE user_id = $1 AND website_url ILIKE $2 ORDER BY created_at DESC';
      params.push(`%${search}%`);
    }

    const { rows } = await sql.query(query, params);

    return NextResponse.json({ videos: rows });
  } catch (error) {
    console.error('Fetch videos error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
