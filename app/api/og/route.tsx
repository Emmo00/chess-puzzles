import { NextRequest, NextResponse } from 'next/server'
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title') ?? 'Chess Puzzles'
    const subtitle = searchParams.get('subtitle') ?? 'Master Your Tactics'
    const iconUrl = new URL('/chess-puzzles.svg', request.url).toString()

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#111111',
            backgroundImage: 'linear-gradient(135deg, #fff9ec 0%, #ffe7a8 35%, #ffc400 100%)',
            padding: '48px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '300px',
              height: '300px',
              background: 'rgba(255,255,255,0.45)',
              border: '8px solid #111111',
              borderRadius: '28px',
              boxShadow: '14px 14px 0 rgba(17,17,17,0.28)',
            }}
          >
            <img src={iconUrl} width="250" height="250" alt="Chess Puzzles Icon" />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginLeft: '48px',
            }}
          >
            <h1
              style={{
                fontSize: '84px',
                fontWeight: 'bold',
                color: '#111111',
                margin: '0 0 20px 0',
                lineHeight: '1',
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontSize: '38px',
                color: '#2f2f2f',
                margin: 0,
              }}
            >
              {subtitle}
            </p>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    console.log(`${e.message}`)
    return new Response(`Failed to generate the image`, {
      status: 500,
    })
  }
}