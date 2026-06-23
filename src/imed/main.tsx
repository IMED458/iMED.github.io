import React from 'react';
import ReactDOM from 'react-dom/client';
import ImedApp from './ImedApp';
import { seedLocalBackend } from './firebase/db';
import '../index.css';

// ლოკალური რეჟიმი — პირველი სუპერ-ადმინის ავტომატური შექმნა
seedLocalBackend();

ReactDOM.createRoot(document.getElementById('imed-root')!).render(
  <React.StrictMode>
    <ImedApp />
  </React.StrictMode>
);
