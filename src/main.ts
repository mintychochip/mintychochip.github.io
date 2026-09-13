import { mount } from 'svelte';
import './lib/styles/global.css';
import App from './App.svelte';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');
mount(App, { target: root });
