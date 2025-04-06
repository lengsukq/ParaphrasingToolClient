import { createApp } from 'vue'
import { Icon } from '@iconify/vue'
import './style.css'
import App from './App.vue'

const app = createApp(App)
app.component('Icon', Icon)
app.mount('#app')
