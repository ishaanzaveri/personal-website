import { useQuery } from '@tanstack/react-query';
import { apiGet } from './apiClient';
import type {
  About,
  AlbumDetail,
  AlbumsResponse,
  FrameFacets,
  FramesResponse,
  Frame,
  Post,
  PostSummary,
  Project,
  Site,
} from '../types';

// Centralized query keys so callers and invalidation stay consistent.
export const queryKeys = {
  site: ['site'] as const,
  about: ['about'] as const,
  projects: (status?: string, limit?: number) => ['projects', { status, limit }] as const,
  project: (slug: string) => ['project', slug] as const,
  posts: (tag?: string, limit?: number, sort?: string) => ['posts', { tag, limit, sort }] as const,
  post: (slug: string) => ['post', slug] as const,
  albums: ['albums'] as const,
  album: (id: string) => ['album', id] as const,
  frames: (params: FramesParams) => ['frames', params] as const,
  frame: (id: string) => ['frame', id] as const,
  frameFacets: ['frames', 'meta'] as const,
};

export interface FramesParams {
  album?: string;
  tag?: string[];
  q?: string;
  limit?: number;
  sort?: string;
}

export function useSite() {
  return useQuery({ queryKey: queryKeys.site, queryFn: () => apiGet<Site>('/site') });
}

export function useAbout() {
  return useQuery({ queryKey: queryKeys.about, queryFn: () => apiGet<About>('/about') });
}

export function useProjects(status?: string, limit?: number) {
  return useQuery({
    queryKey: queryKeys.projects(status, limit),
    queryFn: () => apiGet<Project[]>('/projects', { status, limit }),
  });
}

export function useProject(slug: string) {
  return useQuery({
    queryKey: queryKeys.project(slug),
    queryFn: () => apiGet<Project>(`/projects/${slug}`),
  });
}

export function usePosts(tag?: string, limit?: number, sort?: string) {
  return useQuery({
    queryKey: queryKeys.posts(tag, limit, sort),
    queryFn: () => apiGet<PostSummary[]>('/posts', { tag, limit, sort }),
  });
}

export function usePost(slug: string) {
  return useQuery({
    queryKey: queryKeys.post(slug),
    queryFn: () => apiGet<Post>(`/posts/${slug}`),
  });
}

export function useAlbums() {
  return useQuery({
    queryKey: queryKeys.albums,
    queryFn: () => apiGet<AlbumsResponse>('/albums'),
  });
}

export function useAlbum(id: string) {
  return useQuery({
    queryKey: queryKeys.album(id),
    queryFn: () => apiGet<AlbumDetail>(`/albums/${id}`),
    enabled: Boolean(id),
  });
}

export function useFrames(params: FramesParams = {}) {
  return useQuery({
    queryKey: queryKeys.frames(params),
    queryFn: () => apiGet<FramesResponse>('/frames', { ...params }),
  });
}

export function useFrame(id: string) {
  return useQuery({
    queryKey: queryKeys.frame(id),
    queryFn: () => apiGet<Frame>(`/frames/${id}`),
    enabled: Boolean(id),
  });
}

export function useFrameFacets() {
  return useQuery({
    queryKey: queryKeys.frameFacets,
    queryFn: () => apiGet<FrameFacets>('/frames/meta'),
  });
}
