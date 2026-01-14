import { useEffect } from 'react';
import { useIntl } from 'react-intl';

type PageMetaOptions = {
	titleId: string;
	titleDefault: string;
	descriptionId: string;
	descriptionDefault: string;
	values?: Record<string, string | number>;
};

export default function usePageMeta({
	titleId,
	titleDefault,
	descriptionId,
	descriptionDefault,
	values,
}: PageMetaOptions) {
	const intl = useIntl();
	const title = intl.formatMessage({ id: titleId, defaultMessage: titleDefault }, values);
	const description = intl.formatMessage({ id: descriptionId, defaultMessage: descriptionDefault }, values);

	useEffect(() => {
		document.title = title;
		const metaDescription = document.querySelector('meta[name="description"]');
		if (metaDescription) {
			metaDescription.setAttribute('content', description);
		} else {
			const meta = document.createElement('meta');
			meta.name = 'description';
			meta.content = description;
			document.head.appendChild(meta);
		}
	}, [title, description]);
}
