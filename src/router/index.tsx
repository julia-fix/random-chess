import { Route, Routes } from 'react-router-dom';
import { Outlet } from 'react-router';

import SingleGame from '../pages/SingleGame';
import NotFound from '../pages/NotFound';
import OnlineGame from '../pages/OnlineGame';
import GameChoice from '../pages/GameChoice';
import ComputerGame from '../pages/ComputerGame';
import HistoryList from '../pages/HistoryList';
import HistoryGame from '../pages/HistoryGame';
import { Toaster } from 'react-hot-toast';
import Auth from '../pages/Auth';
import Header from '../components/Header';
import RequireAuth from '../components/RequireAuth';

const LangRoutes = () => (
	<>
		<Routes>
			<Route index element={<GameChoice />} />
			<Route path='single' element={<SingleGame />} />
			<Route path='computer' element={<ComputerGame />} />
			<Route path='auth' element={<Auth />} />
			<Route element={<RequireAuth />}>
				<Route path='play/*'>
					<Route index element={<GameChoice />} />
					<Route path=':gameId' element={<OnlineGame />} />
					<Route path='*' element={<NotFound />} />
				</Route>
				<Route path='history' element={<HistoryList />} />
				<Route path='history/:gameId' element={<HistoryGame />} />
			</Route>
			<Route path='*' element={<NotFound />} />
		</Routes>
		<Outlet />
	</>
);

export default function ChessRoutes() {
	return (
		<>
			<Header />

			<div className='container'>
				<Routes>
					<Route path='en/*' element={<LangRoutes />} />
					<Route path='ru/*' element={<LangRoutes />} />
					<Route path='*' element={<LangRoutes />} />
				</Routes>
			</div>

			<Toaster />
		</>
	);
}
