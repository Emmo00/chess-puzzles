import { NextRequest, NextResponse } from 'next/server'
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title') ?? 'Chess Puzzles'
    const subtitle = searchParams.get('subtitle') ?? 'Master Your Tactics'

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a1a',
            backgroundImage: 'radial-gradient(circle at 50% 50%, #2D1810 0%, #1A0F08 100%)',
          }}
        >
          {/* Chess board background */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexWrap: 'wrap',
              opacity: 0.1,
            }}
          >
            {Array.from({ length: 64 }).map((_, i) => {
              const row = Math.floor(i / 8)
              const col = i % 8
              const isLight = (row + col) % 2 === 0
              return (
                <div
                  key={i}
                  style={{
                    width: '12.5%',
                    height: '12.5%',
                    backgroundColor: isLight ? '#F0D9B5' : '#B58863',
                  }}
                />
              )
            })}
          </div>

          {/* Main content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              textAlign: 'center',
              zIndex: 1,
            }}
          >
            {/* Crown icon */}
            <div
              style={{
                width: '120px',
                height: '120px',
                background: 'linear-gradient(135deg, #FFD700, #B8860B)',
                borderRadius: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '40px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              }}
            >
              <div
                style={{
                  fontSize: '60px',
                  color: '#1a1a1a',
                }}
              >
                👑
              </div>
            </div>

            <h1
              style={{
                fontSize: '60px',
                fontWeight: 'bold',
                color: '#FFFFFF',
                margin: '0 0 20px 0',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontSize: '30px',
                color: '#F0D9B5',
                margin: 0,
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
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