import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';
import { del } from '@vercel/blob';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get video to verify ownership and find blob URL
    const { rows } = await sql`
      SELECT video_url, user_id FROM projects WHERE id = ${params.id}
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (rows[0].user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete from Blob storage if video exists
    if (rows[0].video_url) {
      try {
        await del(rows[0].video_url);
      } catch (error) {
        console.error('Failed to delete from blob storage:', error);
        // Continue with database deletion even if blob deletion fails
      }
    }

    // Delete from database
    await sql`DELETE FROM projects WHERE id = ${params.id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
}
