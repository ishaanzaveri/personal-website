import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { pageMetadata, serializeStructured } from '../lib/pageMetadata.mjs';
import type { Site, About, Post, Frame, AlbumsResponse } from '../types';

function setMeta(attribute: 'name' | 'property', key: string, content?: string) {
  const selector = `meta[${attribute}="${key}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (!content) { existing?.remove(); return; }
  const element = existing ?? document.createElement('meta');
  element.setAttribute(attribute, key);
  element.content = content;
  if (!existing) document.head.append(element);
}

// Read the same API results as each page; no content snapshot is bundled in JS.
export function usePageTitle(title: string) {
  const { pathname } = useLocation();
  const client = useQueryClient();
  const postKey = ['post', pathname.split('/')[2]];
  const post = client.getQueryState(postKey)?.status === 'error' ? undefined : client.getQueryData<Post>(postKey);
  const frameKey = ['frame', pathname.split('/')[2]];
  const frame = client.getQueryState(frameKey)?.status === 'error' ? undefined : client.getQueryData<Frame>(frameKey);
  const albums = client.getQueryData<AlbumsResponse>(['albums'])?.data;
  const site = client.getQueryData<Site>(['site']);
  const about = client.getQueryData<About>(['about']);
  useEffect(() => {
    const existingCanonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const origin = existingCanonical ? new URL(existingCanonical.href).origin : window.location.origin;
    const metadata = pageMetadata(pathname, { site, about, posts: post ? [post] : [], frames: frame ? [frame] : [], albums }, origin);
    // Keep loading-state titles supplied by callers until their API data arrives.
    document.title = metadata.noindex && title !== 'page not found' ? `${title} · ~/site` : metadata.title;
    setMeta('name', 'description', metadata.description);
    setMeta('name', 'robots', metadata.noindex ? 'noindex' : undefined);
    setMeta('property', 'og:title', document.title);
    setMeta('property', 'og:description', metadata.description);
    setMeta('property', 'og:type', metadata.type);
    setMeta('property', 'og:url', metadata.canonical);
    setMeta('property', 'og:image', metadata.image);
    setMeta('name', 'twitter:card', metadata.image ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', document.title);
    setMeta('name', 'twitter:description', metadata.description);
    setMeta('name', 'twitter:image', metadata.image);
    const canonical = existingCanonical ?? document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = metadata.canonical;
    if (!existingCanonical) document.head.append(canonical);
    document.getElementById('page-structured-data')?.remove();
    if (metadata.structured) {
      const script = document.createElement('script');
      script.id = 'page-structured-data';
      script.type = 'application/ld+json';
      script.textContent = serializeStructured(metadata.structured);
      document.head.append(script);
    }
  }, [title, pathname, post, frame, albums, site, about]);
}
