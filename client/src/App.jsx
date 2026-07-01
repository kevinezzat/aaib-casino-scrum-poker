import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import CreateSessionPage from './pages/CreateSessionPage'
import JoinSessionPage from './pages/JoinSessionPage'
import PokerTablePage from './pages/PokerTablePage'
import TokenTest from './components/TokenTest'
import GlobalJiraHandler from './components/GlobalJiraHandler'

export default function App() {
  return (
    <BrowserRouter>
      <GlobalJiraHandler />
      <Routes>
        <Route path="/" element={<Navigate to="/create" replace />} />
        <Route path="/create" element={<CreateSessionPage />} />
        <Route path="/create/:code" element={<CreateSessionPage />} />
        <Route path="/join/:code" element={<JoinSessionPage />} />
        <Route path="/session/:code" element={<PokerTablePage />} />
        <Route path="/test-tokens" element={<TokenTest />} />
      </Routes>
    </BrowserRouter>
  )
}
