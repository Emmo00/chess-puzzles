import { NextRequest, NextResponse } from 'next/server'
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            height: '200px',
            width: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle, #2D1810 0%, #1A0F08 100%)',
            border: '8px solid #B8860B',
            borderRadius: '20px'
          }}
        >
          {/* Chess board pattern */}
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              flexWrap: 'wrap',
              width: '120px',
              height: '120px',
              top: '20px',
              left: '32px'
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
                    width: '15px',
                    height: '15px',
                    backgroundColor: isLight ? '#F0D9B5' : '#B58863',
                  }}
                />
              )
            })}
          </div>

          {/* Crown */}
          <div
            style={{
              position: 'absolute',
              bottom: '30px',
              fontSize: '40px',
              background: 'linear-gradient(135deg, #FFD700, #B8860B)',
              borderRadius: '50px',
              width: '60px',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            👑
          </div>
        </div>
      ),
      {
        width: 200,
        height: 200,
      }
    )
  } catch (e: any) {
    console.log(`${e.message}`)
    return new Response(`Failed to generate icon`, {
      status: 500,
    })
  }
}