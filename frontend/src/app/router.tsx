import { lazy, Suspense } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { PageFallback } from './PageFallback';

const Home = lazy(() => import('../features/home/Home'));
const ProjectReadme = lazy(() => import('../features/home/ProjectReadme'));
const About = lazy(() => import('../features/about/About'));
const Blog = lazy(() => import('../features/blog/Blog'));
const BlogPost = lazy(() => import('../features/blog/BlogPost'));
const Contact = lazy(() => import('../features/contact/Contact'));
const Photo = lazy(() => import('../features/photo/Photo'));
const PhotoDetailPage = lazy(() => import('../features/photo/PhotoDetailPage'));
const NotFound = lazy(() => import('./NotFound'));

const lazyRoute = (element: React.ReactNode) => <Suspense fallback={<PageFallback />}>{element}</Suspense>;

const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: lazyRoute(<Home />) },
      { path: '/work/:slug', element: lazyRoute(<ProjectReadme />) },
      { path: '/about', element: lazyRoute(<About />) },
      { path: '/blog', element: lazyRoute(<Blog />) },
      { path: '/blog/:slug', element: lazyRoute(<BlogPost />) },
      { path: '/photo', element: lazyRoute(<Photo mode="gallery" />) },
      { path: '/photo/albums', element: lazyRoute(<Photo mode="albums" />) },
      { path: '/photo/albums/:albumId', element: lazyRoute(<Photo mode="album" />) },
      { path: '/photo/:id', element: lazyRoute(<PhotoDetailPage />) },
      { path: '/contact', element: lazyRoute(<Contact />) },
      { path: '*', element: lazyRoute(<NotFound />) },
    ],
  },
];

export const router = createBrowserRouter(routes);
