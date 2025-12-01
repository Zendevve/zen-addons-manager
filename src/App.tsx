import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Manage } from './pages/Manage'
import { Settings } from './pages/Settings'
import { Browse } from './pages/Browse'
import { Library } from './pages/Library'
import { Dashboard } from './pages'

import { Toaster } from 'sonner'

function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="bottom-right" theme="dark" />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/manage" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="manage" element={<Manage />} />
          <Route path="library" element={<Library />} />
          <Route path="browse" element={<Browse />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
