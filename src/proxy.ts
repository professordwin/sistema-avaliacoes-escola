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
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 🔒 Se não estiver logado, redireciona para login
  if (!user && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 🔁 Se já estiver logado e tentar acessar login ou raiz
  if (user && (pathname === '/' || pathname === '/login')) {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('papel')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar papel do usuário:', error)
      return response
    }

    const dashboards: Record<string, string> = {
      superadmin: '/superadmin/dashboard',
      diretor: '/diretor/dashboard',
      coordenador: '/coordenador/dashboard',
      professor: '/professor/provas',
    }

    const destino = dashboards[usuario?.papel ?? '']

    if (destino) {
      return NextResponse.redirect(new URL(destino, request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}