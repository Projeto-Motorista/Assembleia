import { NextResponse, NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rotas públicas e assets
  const isPublicPath =
    pathname === '/login' ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/images/') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff2?)$/)

  if (isPublicPath) {
    return NextResponse.next()
  }

  // Verifica cookie do token
  const token = req.cookies.get('token')?.value

  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
