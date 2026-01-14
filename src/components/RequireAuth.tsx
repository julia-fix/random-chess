import { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import PageLoading from './PageLoading';
import { useIntl } from 'react-intl';

export default function RequireAuth() {
	let user = useContext(UserContext);
	let location = useLocation();
	const intl = useIntl();

	return (
		<>
			{user.loading ? (
				<PageLoading />
			) : user.loggedIn ? (
				<Outlet />
			) : (
				<Navigate
					to={`/${intl.locale}/auth?redirectUrl=` + encodeURIComponent(location.pathname + location.search)}
				/>
			)}
		</>
	);
}
