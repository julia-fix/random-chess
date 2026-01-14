import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, it, expect, afterEach } from 'vitest';
import usePageMeta from './usePageMeta';

function TestPageMeta() {
	usePageMeta({
		titleId: 'meta.title.test',
		titleDefault: 'Default Title',
		descriptionId: 'meta.desc.test',
		descriptionDefault: 'Default Description',
	});
	return null;
}

describe('usePageMeta', () => {
	afterEach(() => {
		document.title = '';
		const meta = document.querySelector('meta[name="description"]');
		if (meta) meta.remove();
	});

	it('sets document title and meta description', () => {
		render(
			<IntlProvider
				locale='en'
				messages={{
					'meta.title.test': 'Test Title',
					'meta.desc.test': 'Test Description',
				}}
			>
				<TestPageMeta />
			</IntlProvider>
		);

		expect(document.title).toBe('Test Title');
		const meta = document.querySelector('meta[name="description"]');
		expect(meta?.getAttribute('content')).toBe('Test Description');
	});
});
