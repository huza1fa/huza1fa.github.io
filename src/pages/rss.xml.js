import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context) {
	const writing = (await getCollection('writing', ({ data }) => !data.draft)).sort(
		(a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf(),
	);
	return rss({
		title: `${SITE_TITLE} - Writing`,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: writing.map((entry) => ({
			title: entry.data.title,
			description: entry.data.description,
			pubDate: entry.data.publishDate,
			link: `/writing/${entry.id}/`,
		})),
	});
}
