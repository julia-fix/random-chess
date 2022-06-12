import avStyle from '../scss/Avatar.module.scss';

export default function Avatar({ size, url }: { size: number; url: string | null }) {
	const defaultAvatar = '/chess/images/user.svg';
	return (
		<div className={avStyle.container} style={{ width: size, height: size }}>
			<img src={url || defaultAvatar} alt='avatar' className={avStyle.image} />
		</div>
	);
}
