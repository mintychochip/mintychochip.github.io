import { mount } from 'svelte';
import '../lib/styles/global.css';
import '../lib/styles/cursor.css';
import BlogPostPage from '../lib/blog/BlogPostPage.svelte';
import { POSTS } from '../lib/blog/posts';

const post = POSTS.find((p) => p.pageUrl === '/blog/the-token-gap/');
if (!post) throw new Error('Post /blog/the-token-gap/ is missing from POSTS');

const root = document.getElementById('blog-root');
if (!root) throw new Error('Root element #blog-root not found');
mount(BlogPostPage, { target: root, props: { post } });
