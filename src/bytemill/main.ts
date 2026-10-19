import { mount } from 'svelte';
import '../lib/styles/global.css';
import '../lib/styles/cursor.css';
import BytemillArticle from './BytemillArticle.svelte';

const root = document.getElementById('bytemill-root');
if (!root) throw new Error('Root element #bytemill-root not found');
mount(BytemillArticle, { target: root });
