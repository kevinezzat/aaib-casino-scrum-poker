import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import CreateSessionPage from './pages/CreateSessionPage'
import JoinSessionPage from './pages/JoinSessionPage'
import PokerTablePage from './pages/PokerTablePage'
import TokenTest from './components/TokenTest'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/create" replace />} />
        <Route path="/create" element={<CreateSessionPage />} />
        <Route path="/join/:code" element={<JoinSessionPage />} />
        <Route path="/session/:code" element={<PokerTablePage />} />
        <Route path="/test-tokens" element={<TokenTest />} />
      </Routes>
    </BrowserRouter>
  )
}
