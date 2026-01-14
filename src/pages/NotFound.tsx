import usePageMeta from '../hooks/usePageMeta';

// 404 page
export default function NotFound() {
	usePageMeta({
		titleId: 'meta.title.not_found',
		titleDefault: 'Page Not Found | Random Chess',
		descriptionId: 'meta.desc.not_found',
		descriptionDefault: 'This page does not exist. Return to the main menu to start a new game.',
	});
	return <div>404</div>;
}
