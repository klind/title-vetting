import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('main.tsx: Starting React app...')

const rootElement = document.getElementById('root')
console.log('main.tsx: Root element found:', rootElement)

if (!rootElement) {
  console.error('main.tsx: No root element found!')
} else {
  try {
    const root = createRoot(rootElement)
    console.log('main.tsx: React root created successfully')
    
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    console.log('main.tsx: App rendered successfully')
  } catch (error) {
    console.error('main.tsx: Error rendering app:', error)
  }
}
