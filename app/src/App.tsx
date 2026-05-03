import { BrowserRouter } from 'react-router-dom'

import AppRoutes from './AppRoutes'
import AmbientBackdrop from './components/AmbientBackdrop'

export default function App() {
  return (
    <BrowserRouter>
      <AmbientBackdrop />
      <AppRoutes />
    </BrowserRouter>
  )
}
