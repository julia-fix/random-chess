import { HelmetProvider, Helmet } from 'react-helmet-async';
import Board from '../components/Board';
import { FormattedMessage, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

function SingleGame() {
	const intl = useIntl();

	return (
		<div style={{ paddingTop: 20 }}>
			<HelmetProvider>
				<Helmet>
					<title>{intl.formatMessage({ id: 'chess' })}</title>
					<meta name='description' content={intl.formatMessage({ id: 'chess' })} />
				</Helmet>
			</HelmetProvider>
			<Board mode='single' />
			<p style={{ marginTop: 20 }}>
				<Link to='/chess' className='btn btn-primary'>
					<FormattedMessage id='to_main' />
				</Link>
			</p>
		</div>
	);
}

export default SingleGame;
