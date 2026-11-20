import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { savedTheme } from './ThemePicker.jsx'

// apply the saved theme before the first paint (no flash of the default theme)
document.documentElement.dataset.theme = savedTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
