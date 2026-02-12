<template>
  <div>
    <!-- Search + Layout Toggle -->
    <div class="flex gap-2 mb-6">
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          v-model="search"
          type="text"
          placeholder="Search projects by name or tag..."
          class="w-full pl-10 pr-4 py-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition"
        />
        <button
          v-if="search"
          @click="search = ''"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="flex bg-[var(--color-tag-bg)] rounded-lg p-0.5 shrink-0">
        <!-- Grid: two wide cards stacked -->
        <button
          @click="layout = 'grid-2'"
          :class="['p-2 rounded-md transition-all', layout === 'grid-2' ? 'bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]']"
          title="Grid"
        >
          <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <rect x="0" y="0" width="7" height="7" rx="1.5" /><rect x="9" y="0" width="7" height="7" rx="1.5" /><rect x="0" y="9" width="7" height="7" rx="1.5" /><rect x="9" y="9" width="7" height="7" rx="1.5" />
          </svg>
        </button>
        <!-- Compact: three narrow cards -->
        <button
          @click="layout = 'grid-3'"
          :class="['p-2 rounded-md transition-all', layout === 'grid-3' ? 'bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]']"
          title="Compact"
        >
          <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <rect x="0" y="0" width="4" height="7" rx="1" /><rect x="6" y="0" width="4" height="7" rx="1" /><rect x="12" y="0" width="4" height="7" rx="1" /><rect x="0" y="9" width="4" height="7" rx="1" /><rect x="6" y="9" width="4" height="7" rx="1" /><rect x="12" y="9" width="4" height="7" rx="1" />
          </svg>
        </button>
        <!-- List: rows with thumbnail -->
        <button
          @click="layout = 'list'"
          :class="['p-2 rounded-md transition-all', layout === 'list' ? 'bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]']"
          title="List"
        >
          <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <rect x="0" y="0.5" width="4" height="3.5" rx="0.75" /><rect x="5.5" y="1" width="10.5" height="1" rx="0.5" /><rect x="5.5" y="2.5" width="7" height="1" rx="0.5" opacity="0.5" /><rect x="0" y="6.25" width="4" height="3.5" rx="0.75" /><rect x="5.5" y="6.75" width="10.5" height="1" rx="0.5" /><rect x="5.5" y="8.25" width="7" height="1" rx="0.5" opacity="0.5" /><rect x="0" y="12" width="4" height="3.5" rx="0.75" /><rect x="5.5" y="12.5" width="10.5" height="1" rx="0.5" /><rect x="5.5" y="14" width="7" height="1" rx="0.5" opacity="0.5" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Results count -->
    <p class="text-xs text-[var(--color-text-muted)] mb-4">
      Showing {{ paginatedProjects.length }} of {{ filteredProjects.length }} projects
    </p>

    <!-- Grid -->
    <div :class="gridClass">
      <a
        v-for="project in paginatedProjects"
        :key="project.title"
        :href="project.repo || project.url"
        target="_blank"
        rel="noopener noreferrer"
        :class="[
          'block bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200 group cursor-pointer',
          layout === 'list' ? 'flex flex-row' : ''
        ]"
      >
        <div
          v-if="project.preview"
          :class="[
            'relative bg-[var(--color-border)] overflow-hidden',
            layout === 'list' ? 'w-48 shrink-0 self-stretch' : 'w-full aspect-video'
          ]"
        >
          <img
            :src="project.preview"
            :alt="`${project.title} demo`"
            class="w-full h-full object-cover"
            loading="lazy"
          />
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
        </div>
        <div :class="[layout === 'grid-3' ? 'p-3' : layout === 'list' ? 'px-4 py-3' : 'p-5', layout === 'list' ? 'flex flex-col justify-center min-w-0 flex-1' : '']">
          <h3 :class="layout === 'grid-3' ? 'text-xs font-bold mb-1' : layout === 'list' ? 'text-sm font-bold mb-1' : 'text-base font-bold mb-2'" style="font-family: var(--font-heading)">{{ project.title }}</h3>
          <p :class="[
            'text-[var(--color-text-muted)]',
            layout === 'grid-3' ? 'text-[10px] mb-2 line-clamp-2' : layout === 'list' ? 'text-xs mb-2' : 'text-xs mb-3'
          ]">{{ project.description }}</p>
          <div class="flex flex-wrap items-center gap-2">
            <template v-for="tag in project.tags" :key="tag">
              <img
                v-if="tagIcon(tag)"
                :src="tagIcon(tag)"
                :alt="tag"
                :title="tag"
                :class="[
                  'object-contain opacity-70 group-hover:opacity-100 transition-opacity',
                  layout === 'grid-3' ? 'w-4 h-4' : 'w-5 h-5'
                ]"
              />
              <span
                v-else
                class="inline-block px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)] bg-[var(--color-tag-bg)] rounded-full"
              >
                {{ tag }}
              </span>
            </template>
          </div>
        </div>
      </a>
    </div>

    <!-- Empty state -->
    <div v-if="filteredProjects.length === 0" class="text-center py-12 text-[var(--color-text-muted)]">
      <p class="text-sm">No projects match "{{ search }}"</p>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mt-8">
      <div class="flex justify-end">
        <button
          v-if="page > 1"
          @click="page = page - 1"
          class="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] hover:bg-[var(--color-tag-bg)] transition"
        >
          ← Prev
        </button>
      </div>
      <div class="flex items-center gap-1">
        <button
          v-for="p in totalPages"
          :key="p"
          @click="page = p"
          :class="[
            'min-w-[2rem] h-8 px-2 text-sm rounded-md transition font-medium',
            p === page
              ? 'bg-[var(--color-accent)] text-white'
              : 'border border-[var(--color-border)] hover:bg-[var(--color-tag-bg)]'
          ]"
        >
          {{ p }}
        </button>
      </div>
      <div class="flex justify-start">
        <button
          v-if="page < totalPages"
          @click="page = page + 1"
          class="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] hover:bg-[var(--color-tag-bg)] transition"
        >
          Next →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";

interface Project {
  title: string;
  description: string;
  tags: string[];
  repo?: string;
  url?: string;
  preview?: string;
}

const props = defineProps<{
  projects: Project[];
  perPage?: number;
}>();

const ICON_BASE = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons";
const TAG_ICONS: Record<string, string> = {
  "Astro": `${ICON_BASE}/astro/astro-original.svg`,
  "Tailwind CSS": `${ICON_BASE}/tailwindcss/tailwindcss-original.svg`,
  "TypeScript": `${ICON_BASE}/typescript/typescript-original.svg`,
  "JavaScript": `${ICON_BASE}/javascript/javascript-original.svg`,
  "Python": `${ICON_BASE}/python/python-original.svg`,
  "AWS": `${ICON_BASE}/amazonwebservices/amazonwebservices-original-wordmark.svg`,
  "React": `${ICON_BASE}/react/react-original.svg`,
  "Java": `${ICON_BASE}/java/java-original.svg`,
  "Docker": `${ICON_BASE}/docker/docker-original.svg`,
  "Kubernetes": `${ICON_BASE}/kubernetes/kubernetes-original.svg`,
  "Vue": `${ICON_BASE}/vuejs/vuejs-original.svg`,
  "Node.js": `${ICON_BASE}/nodejs/nodejs-original.svg`,
  "Deno": `${ICON_BASE}/denojs/denojs-original.svg`,
  "Bash": `${ICON_BASE}/bash/bash-original.svg`,
  "Git": `${ICON_BASE}/git/git-original.svg`,
  "D3.js": `${ICON_BASE}/d3js/d3js-original.svg`,
  "SQL": `${ICON_BASE}/azuresqldatabase/azuresqldatabase-original.svg`,
  "Spring Boot": `${ICON_BASE}/spring/spring-original.svg`,
};

function tagIcon(tag: string): string | undefined {
  return TAG_ICONS[tag];
}

const PER_PAGE = props.perPage ?? 4;
const search = ref("");
const page = ref(1);
const layout = ref<"grid-2" | "grid-3" | "list">("grid-2");

const gridClass = computed(() => {
  switch (layout.value) {
    case "grid-3": return "grid gap-3 sm:grid-cols-2 md:grid-cols-3";
    case "list": return "flex flex-col gap-4";
    default: return "grid gap-4 sm:grid-cols-2";
  }
});

// Reset to page 1 when search changes
watch(search, () => {
  page.value = 1;
});

const filteredProjects = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return props.projects;
  return props.projects.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
  );
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredProjects.value.length / PER_PAGE))
);

const paginatedProjects = computed(() => {
  const start = (page.value - 1) * PER_PAGE;
  return filteredProjects.value.slice(start, start + PER_PAGE);
});
</script>
