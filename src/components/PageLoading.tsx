import { Spinner } from 'react-bootstrap';

export default function PageLoading() {
	return (
		<div className='page-loading'>
			<Spinner animation='border' variant='info' />
		</div>
	);
}
