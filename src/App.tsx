import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import StationList from './pages/StationList'
import StationDetail from './pages/StationDetail'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<StationList />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="station/:id" element={<StationDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
