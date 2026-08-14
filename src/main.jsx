import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' 


import skoolagoIcon from './assets/skoolago_icon.png'

const favicon = document.querySelector("link[rel*='icon']")
if (favicon) {
  favicon.href = skoolagoIcon
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)