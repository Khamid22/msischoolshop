import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminApp } from './AdminApp';
import './admin.scss';

createRoot(document.getElementById('admin-root')!).render(
  <StrictMode><AdminApp /></StrictMode>,
);
