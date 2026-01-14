import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.scss';
import { BrowserRouter } from 'react-router-dom';

// Surface unhandled promise rejections (useful for Firestore permission errors)
if (import.meta.env.DEV) {
	window.addEventListener('unhandledrejection', (event) => {
		console.error('Unhandled promise rejection:', event.reason);
	});
}

const baseName = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
	// <React.StrictMode>
	<BrowserRouter basename={baseName === '/' ? '' : baseName}>
		<App />
	</BrowserRouter>
	// </React.StrictMode>
);
