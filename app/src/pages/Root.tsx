import Home from '@/pages/Home'
import Auth from '@/pages/Auth'
import useAuthSession from '@/hooks/useAuthSession'

export default function Root() {
  const { session } = useAuthSession()
  return session?.nickname ? <Home /> : <Auth />
}
