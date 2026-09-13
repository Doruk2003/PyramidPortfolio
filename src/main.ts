import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuth } from './composables/useAuth'

void useAuth().initialize()

createApp(App).use(router).mount('#app')
