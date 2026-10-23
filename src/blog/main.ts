import { mount } from 'svelte';
import '../lib/styles/global.css';
import '../lib/styles/cursor.css';
import BlogIndex from '../lib/blog/BlogIndex.svelte';

const root = document.getElementById('blog-root');
if (!root) throw new Error('Root element #blog-root not found');
mount(BlogIndex, { target: root });
