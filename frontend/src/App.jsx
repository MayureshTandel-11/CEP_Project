import { Navigate, Route, Routes } from 'react-router-dom'
import { Loading } from './components/States'
import { useAuth } from './context/AuthContext'
import AppLayout from './layouts/AppLayout'
import Activity from './pages/Activity'
import Assistant from './pages/Assistant'
import Dashboard from './pages/Dashboard'
import Feedback from './pages/Feedback'
import Login from './pages/Login'
import Logs from './pages/Logs'
import MLExplanation from './pages/MLExplanation'
import Nutrition from './pages/Nutrition'
import Profile from './pages/Profile'
import Progress from './pages/Progress'
import Register from './pages/Register'
import WeeklyPlan from './pages/WeeklyPlan'
import Wellness from './pages/Wellness'

function RequireAuth({ children }) {
  const { user, checking } = useAuth()
  if (checking) return <Loading label="Checking your session" />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, checking } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user && !checking
        ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user && !checking
        ? <Navigate to="/dashboard" replace /> : <Register />} />

      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/weekly-plan" element={<WeeklyPlan />} />
        <Route path="/wellness" element={<Wellness />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/ml" element={<MLExplanation />} />
        <Route path="/ml-explanation" element={<MLExplanation />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
