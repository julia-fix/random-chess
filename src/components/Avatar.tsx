import avStyle from '../scss/Avatar.module.scss';
import { withBase } from '../utils/paths';

export default function Avatar({ size, url }: { size: number; url: string | null }) {
	const defaultAvatar = withBase('images/user.svg');
	return (
		<div className={avStyle.container} style={{ width: size, height: size }}>
			<img src={url || defaultAvatar} alt='avatar' className={avStyle.image} />
		</div>
	);
}
