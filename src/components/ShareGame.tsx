import { useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { WhatsappShareButton, TelegramShareButton, WhatsappIcon, TelegramIcon } from 'react-share';
import { GiShare } from 'react-icons/gi';

type ShareGameProps = {
	url?: string;
	title?: string;
	compact?: boolean;
};

const stripLangFromUrl = (rawUrl: string) => {
	if (!rawUrl) return rawUrl;
	return rawUrl.replace('/ru/', '/').replace('/en/', '/');
};

/**
 * Share button that tries the native share sheet and falls back to popular options.
 */
export default function ShareGame({ url, title = 'Random Chess game', compact = false }: ShareGameProps) {
	const shareUrl = useMemo(() => url || (typeof window !== 'undefined' ? window.location.href : ''), [url]);
	const copyUrl = useMemo(() => stripLangFromUrl(shareUrl), [shareUrl]);
	const [status, setStatus] = useState<string | null>(null);
	const supportsShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

	const handleShare = async () => {
		setStatus(null);
		if (!supportsShare) return;
		try {
			await navigator.share({ url: shareUrl, title });
		} catch (e: any) {
			// Don't open fallback on cancel; surface a gentle message instead.
			if (e?.name !== 'AbortError') {
				setStatus('Share was not completed.');
			}
		}
	};

	const copyLink = async () => {
		try {
			await navigator.clipboard.writeText(copyUrl);
			setStatus('Link copied!');
		} catch {
			setStatus('Copy failed, please copy manually.');
		}
	};

	const containerClass = compact ? 'd-flex gap-2 align-items-center flex-wrap' : 'd-flex gap-2 align-items-center flex-wrap share-game-wide';

	return (
		<div className={containerClass}>
			{supportsShare ? (
				<>
					<button className={`btn ${compact ? 'btn-outline-light btn-sm' : 'btn-secondary'}`} onClick={handleShare} aria-label='Share game'>
						{compact ? <GiShare /> : 'Share game'}
					</button>
					{status && <span>{status}</span>}
				</>
			) : (
				<>
					<WhatsappShareButton url={shareUrl} title={title}>
						<WhatsappIcon size={40} round />
					</WhatsappShareButton>
					<TelegramShareButton url={shareUrl} title={title}>
						<TelegramIcon size={40} round />
					</TelegramShareButton>
					{status && <span>{status}</span>}
				</>
			)}
			<button className={`btn ${compact ? 'btn-outline-light btn-sm' : 'btn-outline-light'}`} onClick={copyLink}>
				<FormattedMessage id='copy_link' />
			</button>
		</div>
	);
}
