const PLACEHOLDER_HOSTS = new Set(['example.com', 'www.example.com', 'localhost'])

export function isRealDownloadUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    const url = new URL(value)
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      !PLACEHOLDER_HOSTS.has(url.hostname.toLowerCase())
    )
  } catch {
    return false
  }
}

export function buildDatasetSchema(props) {
  if (!props?.name || !props?.description || !props?.url) {
    throw new TypeError('Dataset name, description, and url are required.')
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: props.name,
    description: props.description,
    url: props.url,
    inLanguage: props.language,
    creator: props.organization
      ? {
          '@type': 'Organization',
          '@id': props.organization.id,
          name: props.organization.name,
          url: props.organization.url,
          ...(props.organization.sameAs?.length
            ? { sameAs: props.organization.sameAs }
            : {}),
        }
      : undefined,
    license: props.license,
    temporalCoverage: props.temporalCoverage,
    spatialCoverage: props.spatialCoverage,
    keywords: props.keywords,
  }

  if (isRealDownloadUrl(props.downloadUrl)) {
    schema.distribution = [
      {
        '@type': 'DataDownload',
        contentUrl: props.downloadUrl,
        encodingFormat: props.encodingFormat ?? 'application/json',
      },
    ]
  }

  return Object.fromEntries(
    Object.entries(schema).filter(([, value]) => value !== undefined),
  )
}
