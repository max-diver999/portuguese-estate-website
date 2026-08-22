import { SITE } from '../data/site';

/**
 * Breadcrumb + CollectionPage schema for hub (index) pages.
 *
 * ArticleLayout emits BreadcrumbList for the 126 collection pages, but the six
 * hubs render through BaseLayout and shipped with Organization schema only —
 * no breadcrumb trail and no page-level type.
 */
export function hubSchemas({
  path,
  name,
  description,
  itemCount,
}: {
  /** Hub path with leading and trailing slash, e.g. "/guides/" */
  path: string;
  /** Human-readable hub name, e.g. "Guides" */
  name: string;
  description: string;
  itemCount: number;
}): object[] {
  const url = `${SITE.url}${path}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
        { '@type': 'ListItem', position: 2, name, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name,
      description,
      url,
      isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: itemCount,
      },
    },
  ];
}

/** FAQPage schema from a [{question, answer}] list. */
export function faqSchema(items: { question: string; answer: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
