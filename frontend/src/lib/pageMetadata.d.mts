import type { Site, About, Post, Frame, Album } from '../types';
export interface MetadataData { site?: Site; about?: About; posts?: Post[]; frames?: Frame[]; albums?: Album[] }
export interface PageMetadata { title: string; description: string; canonical: string; image?: string; type: string; noindex: boolean; structured?: Record<string, unknown> }
export function siteOrigin(value?: string): string;
export function publicPath(section: string, id: string): string;
export function safeUrl(value: string | null | undefined, origin: string): string | undefined;
export function pageMetadata(pathname: string, data?: MetadataData, origin?: string): PageMetadata;
export function serializeStructured(value: unknown): string;
