import { Route, Routes } from 'react-router-dom'

import Home from '@/pages/Home'
import Lobby from '@/pages/Lobby'
import Room from '@/pages/Room'
import Facilitator from '@/pages/Facilitator'
import FacilitatorIndex from '@/pages/FacilitatorIndex'
import CreateChamber from '@/pages/CreateChamber'
import Profile from '@/pages/Profile'
import Auth from '@/pages/Auth'
import Root from '@/pages/Root'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/create" element={<CreateChamber />} />
      <Route path="/lobby" element={<Lobby />} />
      <Route path="/room/:roomId" element={<Room />} />
      <Route path="/facilitator" element={<FacilitatorIndex />} />
      <Route path="/facilitator/:roomId" element={<Facilitator />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="*" element={<div className="mx-auto max-w-5xl p-8 text-zinc-200">Not Found</div>} />
    </Routes>
  )
}
