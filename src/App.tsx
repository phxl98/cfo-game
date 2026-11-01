import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Host } from './pages/Host'
import { Join } from './pages/Join'
import { Play } from './pages/Play'
import { Print } from './pages/Print'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Join />} />
        <Route path="/play" element={<Play />} />
        <Route path="/host" element={<Host />} />
        <Route path="/print" element={<Print />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
