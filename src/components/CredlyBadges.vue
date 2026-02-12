<template>
  <div>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <img v-for="(url, index) in imageURLList"
           :key="index"
           :src="url"
           alt="Badge"
           class="w-full h-auto inline-block rounded-xl
                  hover:scale-105 hover:shadow-lg transition-transform duration-200" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
const props = defineProps<{
  credlyId: string;
}>();

function formBadgeLink(): string {
  return `https://www.credly.com/users/${props.credlyId}/badges.json`
}

const PROXY_URL = `https://api.allorigins.win/get?url=${encodeURIComponent(
  formBadgeLink()
)}`;

const imageURLList = ref<string[]>([]);
const loading = ref(true);

interface Badge {
  image: { url: string };
}

async function getCredlyBadges() {
  try {
    const response = await fetch(PROXY_URL);
    const json = await response.json();
    const contents = JSON.parse(json.contents);
    const data: Badge[] = contents.data;
    imageURLList.value = data
      .map((obj) => obj.image?.url)
      .filter((url): url is string => Boolean(url));
  } catch (err) {
    console.log("error loading badges:", err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  getCredlyBadges();
});
</script>
