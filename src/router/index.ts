import { createRouter, createWebHistory } from 'vue-router';
import Index from '@/components/index.vue';
import AIDetectionPage from '@/components/AIDetectionPage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Index
    },
    {
      path: '/ai-detection',
      name: 'ai-detection',
      component: AIDetectionPage
    }
  ]
});

export default router;