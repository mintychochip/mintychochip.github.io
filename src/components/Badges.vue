<template>
  <div class="grid grid-cols-3 items-center py-10 space-y-4">
      <img v-for="(url,index) in imageURLList" :key="index" :src="url" alt="Badge" class="w-32 h-32 inline-block object-contain bg-white rounded-xl shadow-md
                 hover:scale-105 hover:shadow-lg transition-transform duration-200" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
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
const error = ref(false);

interface Badge {
  image: { url: string };
}

async function getCredlyBadges() {
  try {
    const response = await fetch(PROXY_URL);
    const json = await response.json();
    const contents = JSON.parse(json.contents);
    const data: Badge[] = contents.data;
    for (const object of data) {
      console.log(object);
    }
    imageURLList.value = data
      .map((obj) => obj.image?.url)
      .filter((url): url is string => Boolean(url));
  } catch (err) {
    console.log("error loading badges:", err);
  } finally {
    loading.value = true;
  }
}

onMounted(() => {
  getCredlyBadges();
});
</script>
