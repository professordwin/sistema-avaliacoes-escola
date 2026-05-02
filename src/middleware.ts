import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 🔒 Não logado
  if (!user && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 🔁 Se logado
  if (user) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('papel')
      .eq('id', user.id)
      .maybeSingle()

    const papel = usuario?.papel

    const dashboards: Record<string, string> = {
      superadmin: '/superadmin/dashboard',
      diretor: '/diretor/dashboard',
      coordenador: '/coordenador/dashboard',
      professor: '/professor/provas',
    }

    // 🔁 Redirecionamento automático
    if (pathname === '/' || pathname === '/login') {
      const destino = dashboards[papel ?? '']
      if (destino) {
        return NextResponse.redirect(new URL(destino, request.url))
      }
    }

    // 🔐 Proteção de rota
    if (pathname.startsWith('/superadmin') && papel !== 'superadmin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}