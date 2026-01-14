import { Navbar, Nav, Container, NavDropdown, Offcanvas } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useState, useContext } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import CreateGame from './CreateGame';
import Avatar from './Avatar';
import { UserContext } from '../contexts/UserContext';
import { auth } from '../utils/firebase';
import LangLink from './LangLink';
import UserName from './UserName';
import { setStoredLang } from '../utils/settings';
import { stripBase, withBase } from '../utils/paths';

export default function Header() {
	const [isOpen, setIsOpen] = useState(false);
	const user = useContext(UserContext);
	const intl = useIntl();
	const location = useLocation();
	const targetLang = intl.locale === 'ru' ? 'en' : 'ru';
	const localeCurrentLabel = intl.locale === 'ru' ? 'Ru' : 'En';
	const langPath = (() => {
		const { search, hash } = location;
		const pathname = stripBase(location.pathname);
		const match = pathname.match(/^\/(en|ru)(?=\/|$)/);
		if (match) {
			return `${pathname.replace(/^\/(en|ru)(?=\/|$)/, `/${targetLang}`)}${search}${hash}`;
		}
		if (pathname === '/') {
			return `/${targetLang}${search}${hash}`;
		}
		if (pathname.startsWith('/')) {
			return `/${targetLang}${pathname === '/' ? '' : pathname}${search}${hash}`;
		}
		return `/${targetLang}/${search}${hash}`;
	})();
	return (
		<Navbar collapseOnSelect={true} expand='md' bg='dark' variant='dark' expanded={isOpen}>
			<Container fluid>
				<Navbar.Brand as={LangLink} to='/'>
					<img src={withBase('images/randomchess-logo-white.svg')} alt='Random Chess' style={{ width: 40 }} />
				</Navbar.Brand>
				<Navbar.Toggle aria-controls={`offcanvasNavbar-expand-md`} onClick={() => setIsOpen(!isOpen)} />
				<Navbar.Offcanvas id={`offcanvasNavbar-expand-md`} aria-labelledby={`offcanvasNavbarLabel-expand-md`} placement='end' onHide={() => setIsOpen(false)}>
					<Offcanvas.Header className='mob-nav-dark'>
						<Offcanvas.Title id={`offcanvasNavbarLabel-expand-md`}>
							<img src={withBase('images/randomchess-logo-white.svg')} alt='Random Chess' style={{ width: 40 }} />
						</Offcanvas.Title>
						<button type='button' className='btn-close' aria-label='Close' onClick={() => setIsOpen(false)}></button>
					</Offcanvas.Header>
					<Offcanvas.Body className='mob-nav-dark'>
						<Nav className='justify-content-end flex-grow-1 pe-3'>
							<Nav.Link as={LangLink} to='/' onClick={() => setIsOpen(false)}>
								<FormattedMessage id='to_main' />
							</Nav.Link>
							<Nav.Link
								as={CreateGame}
								buttonVariant='link'
								buttonSize='sm'
								classes='nav-link create-game-link'
								onAfterSelect={() => setIsOpen(false)}
							>
								<FormattedMessage id='play_with_friend' />
							</Nav.Link>
							<Nav.Link as={LangLink} to='/single' onClick={() => setIsOpen(false)}>
								<FormattedMessage id='single_player' />
							</Nav.Link>
							<Nav.Link as={LangLink} to='/computer' onClick={() => setIsOpen(false)}>
								<FormattedMessage id='play_computer' defaultMessage='Play computer' />
							</Nav.Link>
							{user.loggedIn && (
								<Nav.Link as={LangLink} to='/history' onClick={() => setIsOpen(false)}>
									<FormattedMessage id='history' defaultMessage='History' />
								</Nav.Link>
							)}
							{user.loading ? null : user.loggedIn ? (
								<NavDropdown
									align='end'
									title={
										<div className='user-dropdown-title'>
											<Avatar url={user.photoURL} size={30} />
											<div className='user-dropdown-name d-md-none'>
												<UserName user={user} />
											</div>
										</div>
									}
									id={`offcanvasNavbarDropdown-expand-md`}
									className='user-dropdown-menu'
								>
									{/* <div className="d-md-none">hide on screens wider than md</div> */}
									<div className='d-none d-md-block'>
										<NavDropdown.Item>
											<strong>
												<UserName user={user} />
											</strong>
										</NavDropdown.Item>
										<NavDropdown.Divider />
									</div>
									<NavDropdown.Item onClick={() => auth.signOut()}>
										<FormattedMessage id='logout' />
									</NavDropdown.Item>
								</NavDropdown>
							) : (
								<Nav.Link as={LangLink} to='/auth' onClick={() => setIsOpen(false)}>
									<FormattedMessage id='login' />
								</Nav.Link>
							)}
							<Nav.Link
								as={Link}
								to={langPath}
								onClick={() => {
									setStoredLang(targetLang);
									setIsOpen(false);
								}}
							>
								{localeCurrentLabel}
							</Nav.Link>
						</Nav>
					</Offcanvas.Body>
				</Navbar.Offcanvas>
			</Container>
		</Navbar>
	);
}
