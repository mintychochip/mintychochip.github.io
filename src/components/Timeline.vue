<template>
  <div class="relative max-w-5xl mx-auto px-4">
    <!-- Center timeline line (desktop) - black -->
    <div class="hidden md:block absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-black" />

    <div class="space-y-12 md:space-y-14 py-4">
      <div
        v-for="(item, index) in timelineItems"
        :key="index"
        :ref="el => itemRefs[index] = el as HTMLElement"
        class="timeline-item relative"
        :data-index="index"
      >
        <!-- Desktop Layout: Alternating -->
        <div class="hidden md:grid md:grid-cols-[1fr_auto_1fr] gap-8 items-center">
          <!-- Left content (even indices) -->
          <div
            v-if="index % 2 === 0"
            class="timeline-content text-right"
          >
            <div class="timeline-card inline-block text-left ml-auto w-full max-w-md group/card">
              <div
                v-if="item.image"
                class="card-wrapper relative rounded-xl border border-[var(--color-border)] shadow overflow-hidden h-32 group-hover/card:h-80 transition-all duration-700 ease-out"
              >
                <!-- Image fills expanding card -->
                <img
                  :src="item.image"
                  :alt="item.title"
                  class="absolute inset-0 w-full h-full object-cover object-top"
                  loading="lazy"
                />

                <!-- Dark overlay for text contrast -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 opacity-60 group-hover/card:opacity-90 transition-opacity duration-500" />

                <!-- Text container -->
                <div class="absolute top-0 left-0 right-0 p-5">
                  <div class="pt-4 group-hover/card:pt-20 transition-all duration-600">
                    <!-- Title - drops down on hover to reveal image -->
                    <h3 class="text-lg font-bold text-white mb-0 group-hover/card:mb-3 transition-all duration-600" style="font-family: var(--font-heading)">
                      {{ item.title }}
                    </h3>

                    <!-- Description - slides up from below title on hover -->
                    <div class="overflow-hidden max-h-0 group-hover/card:max-h-40 transition-all duration-600 ease-out">
                      <p class="text-sm text-white/95 leading-relaxed pt-2 transform translate-y-8 group-hover/card:translate-y-0 opacity-0 group-hover/card:opacity-100 transition-all duration-500 delay-200">
                        {{ item.description }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty space for odd indices -->
          <div v-else />

          <!-- Year inline with timeline -->
          <div class="timeline-year flex items-center justify-center relative z-10">
            <span class="px-3 py-1 bg-[var(--color-bg)] text-xs font-bold text-black" style="font-family: var(--font-heading)">
              {{ item.year }}
            </span>
          </div>

          <!-- Right content (odd indices) -->
          <div
            v-if="index % 2 !== 0"
            class="timeline-content"
          >
            <div class="timeline-card inline-block w-full max-w-md group/card">
              <div
                v-if="item.image"
                class="card-wrapper relative rounded-xl border border-[var(--color-border)] shadow overflow-hidden h-32 group-hover/card:h-80 transition-all duration-700 ease-out"
              >
                <!-- Image fills expanding card -->
                <img
                  :src="item.image"
                  :alt="item.title"
                  class="absolute inset-0 w-full h-full object-cover object-top"
                  loading="lazy"
                />

                <!-- Dark overlay for text contrast -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 opacity-60 group-hover/card:opacity-90 transition-opacity duration-500" />

                <!-- Text container -->
                <div class="absolute top-0 left-0 right-0 p-5">
                  <div class="pt-4 group-hover/card:pt-20 transition-all duration-600">
                    <!-- Title - drops down on hover to reveal image -->
                    <h3 class="text-lg font-bold text-white mb-0 group-hover/card:mb-3 transition-all duration-600" style="font-family: var(--font-heading)">
                      {{ item.title }}
                    </h3>

                    <!-- Description - slides up from below title on hover -->
                    <div class="overflow-hidden max-h-0 group-hover/card:max-h-40 transition-all duration-600 ease-out">
                      <p class="text-sm text-white/95 leading-relaxed pt-2 transform translate-y-8 group-hover/card:translate-y-0 opacity-0 group-hover/card:opacity-100 transition-all duration-500 delay-200">
                        {{ item.description }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty space for even indices -->
          <div v-else />
        </div>

        <!-- Mobile Layout: Horizontal card -->
        <div class="md:hidden">
          <div class="timeline-card relative">
            <div
              v-if="item.image"
              class="timeline-image relative aspect-[3/2] bg-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] shadow"
            >
              <img
                :src="item.image"
                :alt="item.title"
                class="w-full h-full object-cover"
                loading="lazy"
              />
              <!-- Gradient overlay -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <!-- Text overlay -->
              <div class="absolute bottom-0 left-0 right-0 p-4">
                <h3 class="text-sm font-bold text-white mb-1" style="font-family: var(--font-heading)">
                  {{ item.title }}
                </h3>
                <p class="text-xs text-white/80 leading-relaxed line-clamp-2">
                  {{ item.description }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface TimelineItem {
  year: string;
  date: string;
  title: string;
  description: string;
  image?: string;
  tags?: string[];
}

const props = defineProps<{
  timelineItems: TimelineItem[];
}>();

const itemRefs = ref<(HTMLElement | null)[]>([]);
const activeIndex = ref<number>(-1);
const progressLine = ref<HTMLElement | null>(null);
const progressHeight = ref('0%');

let animationFrameId: number | null = null;

const handleScroll = () => {
  if (animationFrameId !== null) return;

  animationFrameId = requestAnimationFrame(() => {
    const windowHeight = window.innerHeight;
    const centerY = windowHeight / 2;

    itemRefs.value.forEach((item, index) => {
      if (!item) return;

      const rect = item.getBoundingClientRect();
      const itemCenter = rect.top + rect.height / 2;
      const isInView = rect.top < windowHeight && rect.bottom > 0;

      // Simple fade-in when item enters viewport
      if (isInView) {
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
      } else if (rect.top > windowHeight) {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
      }
    });

    // Calculate timeline progress based on scroll
    if (itemRefs.value.length > 0) {
      const firstItem = itemRefs.value[0];
      const lastItem = itemRefs.value[itemRefs.value.length - 1];

      if (firstItem && lastItem) {
        const firstRect = firstItem.getBoundingClientRect();
        const lastRect = lastItem.getBoundingClientRect();

        const timelineStart = firstRect.top + firstRect.height / 2;
        const timelineEnd = lastRect.top + lastRect.height / 2;
        const timelineHeight = timelineEnd - timelineStart;

        const scrolled = centerY - timelineStart;
        const progress = Math.max(0, Math.min(1, scrolled / timelineHeight));

        progressHeight.value = `${progress * 100}%`;
      }
    }

    animationFrameId = null;
  });
};

onMounted(() => {
  handleScroll(); // Initial check
  window.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

<style scoped>
.timeline-item {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.8s ease, transform 0.8s ease;
}

.timeline-card {
  transition: all 0.4s ease;
}

.card-wrapper {
  will-change: transform, aspect-ratio;
}

.group\/card:hover .card-wrapper {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.timeline-dot {
  z-index: 10;
  position: relative;
}

.timeline-dot > div {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.timeline-dot > div:hover {
  transform: scale(1.15);
  box-shadow: 0 6px 16px rgba(111, 189, 111, 0.4);
}

/* Line clamp utility */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
