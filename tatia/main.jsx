import React from 'react';
import ReactDOM from 'react-dom/client';
import { fireConfetti } from './particles.js';
import { App } from './App.jsx';

window.fireConfetti = fireConfetti;

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
