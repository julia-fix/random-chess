import { Link } from 'react-router-dom';
import { useIntl } from 'react-intl';

interface LangLinkProps {
	to: string;
	children: React.ReactNode;
	[x: string]: any;
}

export default function LangLink({ to, children, ...props }: LangLinkProps) {
	const intl = useIntl();
	return (
		<Link to={'/' + intl.locale + to} {...props}>
			{children}
		</Link>
	);
}
