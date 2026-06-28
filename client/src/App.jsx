import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TokenTest from './components/TokenTest'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Phase 1: token verification landing */}
        <Route path="/" element={<TokenTest />} />
        {/* Phase 2: poker table, join flow, host lobby will be added here */}
      </Routes>
    </BrowserRouter>
  )
}
