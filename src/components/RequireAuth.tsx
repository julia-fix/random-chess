import { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import PageLoading from './PageLoading';

export default function RequireAuth() {
	let user = useContext(UserContext);
	let location = useLocation();

	return <>{user.loading ? <PageLoading /> : user.loggedIn ? <Outlet /> : <Navigate to={'/chess/auth?redirectUrl=' + encodeURIComponent(location.pathname)} />}</>;
}
