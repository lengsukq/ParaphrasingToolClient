import { createApp } from 'vue'
import { Icon } from '@iconify/vue'
import './style.css'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
const app = createApp(App)
app.component('Icon', Icon)
app.use(ElementPlus)
app.mount('#app')